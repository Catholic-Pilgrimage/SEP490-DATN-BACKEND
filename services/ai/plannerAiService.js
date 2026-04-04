const { generateJSON } = require('../../config/googleai.config');
const { Site } = require('../../models');
const Logger = require('../../utils/logger.util');

/**
 * Planner AI Service — AI Route Suggestion for Pilgrims
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
  static _calculateDistances(sitesInfo) {
    const distances = [];
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
    return distances;
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

    const sites = await Site.findAll({
      where: { id: siteIds, is_active: true },
      attributes: ['id', 'name', 'description', 'address', 'province', 'region', 'type', 'latitude', 'longitude', 'patron_saint', 'opening_hours']
    });

    if (sites.length < 2) {
      throw new Error('Could not find enough valid sites. At least 2 active sites are required.');
    }

    const sitesInfo = sites.map(s => ({
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
      opening_hours: s.opening_hours || null
    }));

    // Calculate pairwise distances for AI context
    const distances = this._calculateDistances(sitesInfo);
    const distanceInfo = distances.length > 0
      ? `\nPairwise distances (straight-line → estimated road):\n${distances.map(d => `- ${d.from} ↔ ${d.to}: ~${d.straight_line_km}km straight / ~${d.estimated_road_km}km road`).join('\n')}`
      : '';

    const transportMap = { car: 'Ô tô', bus: 'Xe khách', motorbike: 'Xe máy' };
    const transportVi = transportMap[transport_mode] || 'Ô tô';

    // Avg speed by transport for AI reference
    const speedMap = { car: '50-60', bus: '40-50', motorbike: '30-40' };
    const avgSpeed = speedMap[transport_mode] || '50-60';

    const prompt = `You are an expert Catholic pilgrimage route planner in Vietnam.
Given these pilgrimage sites, suggest the optimal route.

Sites:
${JSON.stringify(sitesInfo, null, 2)}
${distanceInfo}

Parameters:
- Transport: ${transport_mode} (${transportVi}), average speed on Vietnam roads: ${avgSpeed} km/h
- Priority: ${priority} (shortest_distance = minimize travel, most_spiritual = significance first, balanced = mix)
${start_date ? `- Start date: ${start_date}` : ''}
${max_days ? `- Max days: ${max_days}` : '- Suggest optimal number of days'}
${patron_saint ? `- Pilgrim's Patron Saint (Bổn mạng): ${patron_saint}. IMPORTANT: Prioritize sites related to this saint. Add spiritual connections to this patron saint in the notes.` : ''}

Requirements:
- Organize into daily itinerary, grouping nearby sites (same region/province) on same day
- Use the provided distance data to estimate realistic travel times for Vietnam roads
- Visit duration: shrine ~90min, church ~60min, monastery ~120min, center ~45min. Format as "Xh" or "XhYm" (e.g. "1h30m", "2h")
- Each stop needs an estimated arrival/start time in HH:mm format
- Add a short spiritual note for each stop (Vietnamese)
- Each item MUST have an order_index (1-based, sequential within each day)

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
          "estimated_time": "08:00",
          "rest_duration": "1h30m",
          "travel_time_minutes": 45,
          "note": "Ghi chú tâm linh (tiếng Việt)"
        }
      ]
    }
  ],
  "summary": "Tóm tắt lộ trình (tiếng Việt, 2-3 câu)",
  "total_estimated_km": 450,
  "tips": ["Mẹo cho khách hành hương (tiếng Việt)"]
}

Rules for items:
- order_index starts at 1 for each day and increments sequentially
- For the FIRST item of each day: travel_time_minutes = 0 (or travel from previous day's last stop)
- rest_duration must use format like "1h", "1h30m", "45m"
- estimated_time must use HH:mm format like "08:00", "14:30"`;

    Logger.info(`Google AI: Route for ${sites.length} sites, mode=${transport_mode}, priority=${priority}`);
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
