const { generateJSON } = require('../../config/googleai.config');
const { Site, MassSchedule, Event } = require('../../models');
const { Op } = require('sequelize');
const Logger = require('../../utils/logger.util');
const { AiPromptService } = require('./aiPromptService');

/**
 * Planner AI Service — AI Route Suggestion for Pilgrims
 *
 *  NO DB CACHE (Phase 1) — suggestRoute requests have very high parameter variance
 *    (variable site_ids, transport_mode, priority combinations), making DB cache hit rates
 *    too low to be effective. Consider caching in Phase 2 with short TTL exact-request match.
 *    See aiCacheService.js for architecture rationale.
 *
 * Output aligned with PlannerService schema:
 *   createPlanner: { name, estimated_days, transportation, start_date, end_date }
 *   addPlannerItem: { site_id, day_number, order_index, estimated_time, rest_duration, travel_time_minutes, note }
 */
class PlannerAiService {

  /**
   * Haversine distance between two lat/lng points (in km)
   */
  static _haversineKm(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth radius in km
    const toRad = deg => deg * Math.PI / 180;
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) ** 2 +
      Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /**
   * Calculate pairwise distances between sites (for AI context)
   */
  static async _calculateDistances(sitesInfo, transportMode) {
    const OSRMUtil = require('../../utils/osrm.util');

    const vehicleMap = {
      motorbike: 'motorcycle',
      car: 'car',
      bus: 'car'
    };
    const vehicle = vehicleMap[transportMode] || 'car';

    const points = sitesInfo.filter(s => s.lat && s.lng).map(s => ({ lat: s.lat, lng: s.lng }));
    const distances = [];

    // Attempt to get real data from VietMap
    if (points.length >= 2) {
      const matrixResult = await OSRMUtil.getDistanceMatrix(points, vehicle);

      if (matrixResult && matrixResult.distances && matrixResult.durations) {
        for (let i = 0; i < points.length; i++) {
          for (let j = i + 1; j < points.length; j++) {
            const a = sitesInfo.find(s => s.lat === points[i].lat && s.lng === points[i].lng);
            const b = sitesInfo.find(s => s.lat === points[j].lat && s.lng === points[j].lng);

            const distMeters = matrixResult.distances[i][j];
            const durationSeconds = matrixResult.durations[i][j];

            if (distMeters != null && durationSeconds != null && a && b) {
              distances.push({
                from: a.name,
                to: b.name,
                real_distance_km: Math.round(distMeters / 1000),
                real_travel_minutes: Math.ceil(durationSeconds / 60)
              });
            }
          }
        }
        if (distances.length > 0) return { isReal: true, distances };
      }
    }

    // Fallback to Haversine if VietMap fails
    for (let i = 0; i < sitesInfo.length; i++) {
      for (let j = i + 1; j < sitesInfo.length; j++) {
        const a = sitesInfo[i];
        const b = sitesInfo[j];
        if (a.lat && a.lng && b.lat && b.lng) {
          const km = this._haversineKm(a.lat, a.lng, b.lat, b.lng);
          distances.push({
            from: a.name,
            to: b.name,
            straight_line_km: Math.round(km),
            estimated_road_km: Math.round(km * 1.35) // ~35% added for road vs straight line
          });
        }
      }
    }
    return { isReal: false, distances };
  }

  /**
   * Validate UUID format
   */
  static _isUUID(str) {
    return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
  }

  /**
   * Suggest optimized pilgrimage route from selected sites
   * @param {string[]} siteIds - Array of Site UUIDs (2-15)
   * @param {object} params - { start_date, max_days, transport_mode, priority }
   * @returns {Promise<object>} Route suggestion compatible with PlannerService
   */
  static async suggestRoute(siteIds, params = {}) {
    if (!siteIds || siteIds.length < 2) {
      throw new Error('At least 2 destinations are required');
    }
    if (siteIds.length > 15) {
      throw new Error('Maximum 15 destinations per route');
    }

    // Validate UUID format
    const invalidIds = siteIds.filter(id => !this._isUUID(id));
    if (invalidIds.length > 0) {
      throw new Error(`Invalid site ID format: ${invalidIds.join(', ')}`);
    }

    const { start_date, max_days, transport_mode = 'car', priority = 'balanced', number_of_people = 1, patron_saint } = params;

    // Filter events starting today or later (or within planner dates)
    const eventDateFilter = start_date ? new Date(start_date) : new Date();

    const sites = await Site.findAll({
      where: { id: siteIds, is_active: true },
      attributes: ['id', 'name', 'description', 'address', 'province', 'region', 'type', 'latitude', 'longitude', 'patron_saint', 'opening_hours'],
      include: [
        {
          model: MassSchedule,
          as: 'massSchedules',
          where: { is_active: true, status: 'approved' },
          required: false,
          attributes: ['days_of_week', 'time', 'note']
        },
        {
          model: Event,
          as: 'events',
          where: {
            is_active: true,
            status: 'approved',
            [Op.or]: [
              { end_date: { [Op.gte]: eventDateFilter } },
              { end_date: null, start_date: { [Op.gte]: eventDateFilter } }
            ]
          },
          required: false,
          attributes: ['name', 'start_date', 'end_date', 'start_time', 'end_time']
        }
      ]
    });

    if (sites.length < 2) {
      throw new Error('Could not find enough valid sites. At least 2 active sites are required.');
    }

    const sitesInfo = sites.map(s => {
      // Format Mass Schedules
      const masses = (s.massSchedules || []).map(m => {
        const daysMap = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
        const days = (m.days_of_week || []).map(d => daysMap[d]).join(', ');
        return `${days} at ${m.time}` + (m.note ? ` (${m.note})` : '');
      });

      // Format Events
      const events = (s.events || []).map(e => {
        return `'${e.name}' from ${e.start_date}` +
          (e.end_date ? ` to ${e.end_date}` : '') +
          (e.start_time ? ` (${e.start_time}` + (e.end_time ? `-${e.end_time}` : '') + `)` : '');
      });

      return {
        id: s.id,
        name: s.name,
        description: (s.description || '').substring(0, 200),
        address: s.address || s.province || 'N/A',
        province: s.province || 'N/A',
        region: s.region,
        type: s.type,
        lat: s.latitude ? parseFloat(s.latitude) : null,
        lng: s.longitude ? parseFloat(s.longitude) : null,
        patron_saint: s.patron_saint || null,
        opening_hours: s.opening_hours || null,
        mass_schedules: masses.length > 0 ? masses : null,
        upcoming_events: events.length > 0 ? events : null
      };
    });

    // Calculate pairwise distances for AI context
    const distancesData = await this._calculateDistances(sitesInfo, transport_mode);
    let distanceInfo = '';

    if (distancesData.isReal && distancesData.distances.length > 0) {
      distanceInfo = `\nREAL VietMap Pairwise Distances/Times (MUST use these EXACT 'real_travel_minutes' when predicting scheduling):\n${distancesData.distances.map(d => `- ${d.from} ↔ ${d.to}: ${d.real_distance_km}km, takes ${d.real_travel_minutes} minutes`).join('\n')}`;
    } else if (!distancesData.isReal && distancesData.distances.length > 0) {
      distanceInfo = `\nEstimated Pairwise distances (straight-line → estimated road):\n${distancesData.distances.map(d => `- ${d.from} ↔ ${d.to}: ~${d.straight_line_km}km straight / ~${d.estimated_road_km}km road`).join('\n')}`;
    }

    const transportMap = { car: 'Ô tô', bus: 'Xe khách', motorbike: 'Xe máy' };
    const transportVi = transportMap[transport_mode] || 'Ô tô';

    // Avg speed by transport for AI reference
    const speedMap = { car: '50-60', bus: '40-50', motorbike: '30-40' };
    const avgSpeed = speedMap[transport_mode] || '50-60';

    // ─── Get instruction text from DB or fallback ───
    const promptConfig = await AiPromptService.getPromptByKey('route');
    const instruction = promptConfig.instructionText;

    const prompt = `${instruction}

Sites:
${JSON.stringify(sitesInfo, null, 2)}
${distanceInfo}

Parameters:
- Transport: ${transport_mode} (${transportVi}), average speed on Vietnam roads: ${avgSpeed} km/h
- Priority: ${priority} (shortest_distance = minimize travel, most_spiritual = significance first, balanced = mix)
${start_date ? `- Start date: ${start_date}` : ''}
${max_days ? `- Max days: ${max_days}` : '- Suggest optimal number of days'}
${patron_saint ? `- Pilgrim's Patron Saint (Bổn mạng): ${patron_saint}. IMPORTANT: Prioritize sites related to this saint. Add spiritual connections to this patron saint in the notes.` : ''}

IMPORTANT: The output must use these EXACT field names to be compatible with our Planner API:

Return JSON:
{
  "planner": {
    "name": "Tên lộ trình (tiếng Việt)",
    "estimated_days": 3,
    "number_of_people": ${number_of_people},
    "transportation": "${transport_mode}",
    "start_date": "${start_date || 'null'}",
    "end_date": "calculated end date or null"
  },
  "daily_itinerary": [
    {
      "day_number": 1,
      "theme": "Chủ đề ngày (tiếng Việt)",
      "items": [
        {
          "site_id": "uuid from sites list above",
          "site_name": "For display only",
          "day_number": 1,
          "order_index": 1,
          "estimated_time": "08:00 (Must strictly calculate HH:mm for ALL items)",
          "rest_duration": "1h30m",
          "travel_time_minutes": 45,
          "note": "Ghi chú tâm linh (tiếng Việt) - vd: Tham dự Thánh Lễ lúc 09:00"
        }
      ]
    }
  ],
  "summary": "Tóm tắt lộ trình (tiếng Việt, 3-4 câu). BẮT BUỘC CÓ 1 CÂU GIẢI THÍCH LÝ DO vì sao chọn số ngày này (đặc biệt khi số ngày đưa ra ít hơn max_days). Ví dụ: 'Dựa trên 3 địa điểm bạn chọn, hành trình 2 ngày là thời gian tối ưu nhất để trải nghiệm trọn vẹn...'. Nhắc tên các sự kiện/thánh lễ nổi bật nếu có.",
  "total_estimated_km": 450,
  "tips": ["Mẹo cho khách hành hương (tiếng Việt)"]
}

Rules for items:
- order_index starts at 1 for each day and increments sequentially
- For the FIRST item of each day: travel_time_minutes = 0. MUST provide estimated_time (e.g. "08:00").
- For SUBSEQUENT items (order_index > 1): You MUST calculate and provide the exact estimated_time in HH:mm format. Arrival Time = Previous Stop Time + Previous rest_duration + travel_time_minutes. DO NOT return null.
- rest_duration MUST use format like "1 hour", "1 hour 30 minutes", "45 minutes" (DO NOT use "1h", "1h30m", "45m")
- CRITICAL SCHEDULING RULE: DO NOT schedule the same site more than once per day! If a site has an Event, you MUST COMBINE the visit and the event into ONE SINGLE item by extending the rest_duration to cover both activities.`;

    Logger.info(`Google AI: Route for ${sites.length} sites, mode=${transport_mode}, priority=${priority}, prompt_source=${promptConfig.source}`);
    const result = await generateJSON('route', prompt, { temperature: 0.7 });

    // Output guard: validate AI returned a valid route schema
    if (!result.planner || typeof result.planner.name !== 'string') {
      throw new Error('AI returned invalid route schema: missing planner.name');
    }
    if (!Array.isArray(result.daily_itinerary) || result.daily_itinerary.length === 0) {
      throw new Error('AI returned invalid route schema: missing daily_itinerary');
    }
    for (const day of result.daily_itinerary) {
      if (!Array.isArray(day.items) || day.items.length === 0) {
        throw new Error('AI returned invalid route schema: day missing items array');
      }
      for (const item of day.items) {
        if (!item.site_id || !item.day_number || !item.order_index) {
          throw new Error('AI returned invalid route schema: item missing site_id/day_number/order_index');
        }
      }
    }

    // Auto-correct AI's date miscalculations
    const actualDays = result.daily_itinerary.length;
    result.planner.estimated_days = actualDays;

    if (result.planner.start_date && result.planner.start_date !== 'null') {
      const startDateObj = new Date(result.planner.start_date);
      if (!Number.isNaN(startDateObj.getTime())) {
        startDateObj.setDate(startDateObj.getDate() + actualDays - 1);
        result.planner.end_date = startDateObj.toISOString().split('T')[0];
      }
    } else {
      result.planner.end_date = null;
    }

    return {
      ...result,
      metadata: {
        generated_by: 'google_ai',
        sites_count: sites.length,
        transport_mode,
        priority,
        compatible_with: 'PlannerService.createPlanner + addPlannerItem'
      }
    };
  }
}

module.exports = PlannerAiService;
