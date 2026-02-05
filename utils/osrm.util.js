/**
 * OSRM (Open Source Routing Machine) Utility
 * Provides route calculation for planner items
 */

const Logger = require('./logger.util');

class OSRMUtil {
    /**
     * Get distance and duration from VietMap Matrix API
     * @param {Object} from - Starting coordinates {lat, lng}
     * @param {Object} to - Destination coordinates {lat, lng}
     * @param {string} vehicle - Vehicle type: 'car', 'bike', 'motorcycle', or 'foot' (default: 'bike')
     * @returns {Object|null} - {distance: meters, duration: seconds} or null if failed
     */
    static async getRouteInfo(from, to, vehicle = 'bike') {
        try {
            const apiKey = process.env.VIETMAP_API_KEY;
            const baseUrl = 'https://maps.vietmap.vn/api/matrix';

            if (!apiKey) {
                Logger.error('VIETMAP_API_KEY is not configured');
                return null;
            }

            // VietMap Matrix API format: point=lat,lng&point=lat,lng&sources=0&destinations=1&vehicle=car/bike/motorcycle/foot
            const url = `${baseUrl}?apikey=${apiKey}&point=${from.lat},${from.lng}&point=${to.lat},${to.lng}&sources=0&destinations=1&vehicle=${vehicle}`;

            Logger.info(`VietMap Matrix API call: ${baseUrl}?apikey=***&point=${from.lat},${from.lng}&point=${to.lat},${to.lng}&sources=0&destinations=1&vehicle=${vehicle}`);

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

            const response = await fetch(url, {
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (!response.ok) {
                Logger.warn(`VietMap API returned status ${response.status}`);
                return null;
            }

            const data = await response.json();

            if (!data.distances || !data.distances[0] || data.distances[0][0] == null) {
                Logger.warn('VietMap: No distance returned');
                return null;
            }

            const distance = data.distances[0][0]; // meters
            const duration = data.durations?.[0]?.[0] || null; // seconds (may be null)

            Logger.info(`VietMap: Distance ${distance}m, Duration ${duration}s`);

            return {
                distance: distance,   // in meters
                duration: duration    // in seconds (or null)
            };
        } catch (error) {
            if (error.name === 'AbortError') {
                Logger.error('VietMap API timeout');
            } else {
                Logger.error('VietMap API error:', error.message);
            }
            return null;
        }
    }
}

module.exports = OSRMUtil;
