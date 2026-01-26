/**
 * OSRM (Open Source Routing Machine) Utility
 * Provides route calculation and distance validation for planner items
 */

const Logger = require('./logger.util');

class OSRMUtil {
    /**
     * Get route information from VietMap API
     * @param {Object} from - Starting coordinates {lat, lng}
     * @param {Object} to - Destination coordinates {lat, lng}
     * @param {string} vehicle - Vehicle type: 'car' or 'bike' (default: 'bike')
     * @returns {Object|null} - {distance: meters, duration: seconds} or null if failed
     */
    static async getRouteInfo(from, to, vehicle = 'bike') {
        try {
            const apiKey = process.env.VIETMAP_API_KEY;
            const baseUrl = process.env.VIETMAP_ROUTE_URL || 'https://api.vietmap.vn/route';

            if (!apiKey) {
                Logger.error('VIETMAP_API_KEY is not configured');
                return null;
            }

            const url = `${baseUrl}?apikey=${apiKey}&start=${from.lng},${from.lat}&end=${to.lng},${to.lat}&vehicle=${vehicle}`;

            Logger.info(`VietMap API call: ${baseUrl}?apikey=***&start=${from.lng},${from.lat}&end=${to.lng},${to.lat}&vehicle=${vehicle}`);

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

            if (!data.paths || data.paths.length === 0) {
                Logger.warn('VietMap: No routes found');
                return null;
            }

            Logger.info(`VietMap: Distance ${data.paths[0].distance}m, Duration ${data.paths[0].time}s`);

            return {
                distance: data.paths[0].distance, // in meters
                duration: data.paths[0].time      // in seconds (VietMap uses 'time' instead of 'duration')
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

    /**
     * Calculate distance using Haversine formula (fallback)
     * @param {number} lat1 - Latitude of point 1
     * @param {number} lng1 - Longitude of point 1
     * @param {number} lat2 - Latitude of point 2
     * @param {number} lng2 - Longitude of point 2
     * @returns {number} - Distance in meters
     */
    static calculateHaversineDistance(lat1, lng1, lat2, lng2) {
        const R = 6371000; // Earth's radius in meters
        const φ1 = lat1 * Math.PI / 180;
        const φ2 = lat2 * Math.PI / 180;
        const Δφ = (lat2 - lat1) * Math.PI / 180;
        const Δλ = (lng2 - lng1) * Math.PI / 180;

        const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

        return R * c; // Distance in meters
    }

    /**
     * Validate distance based on rules
     * @param {number} distanceMeters - Distance in meters
     * @param {string} transportation - Transportation mode (optional)
     * @returns {Object} - {allowed: boolean, warning: string|null}
     */
    static validateDistance(distanceMeters, transportation = null) {
        const distanceKm = distanceMeters / 1000;

        // Rule: > 500km = reject
        if (distanceKm > 500) {
            return {
                allowed: false,
                warning: null,
                error: 'Quãng đường quá xa cho 1 ngày (>500km)'
            };
        }

        // Rule: 250-500km = warning
        if (distanceKm > 250) {
            return {
                allowed: true,
                warning: `Quãng đường khá xa cho 1 ngày (${distanceKm.toFixed(1)}km)`,
                error: null
            };
        }

        // Rule: <= 250km = OK
        return {
            allowed: true,
            warning: null,
            error: null
        };
    }

    /**
     * Get distance between two sites with validation
     * @param {Object} fromSite - Site with latitude and longitude
     * @param {Object} toSite - Site with latitude and longitude
     * @param {string} transportation - Transportation mode (car, bike, etc.)
     * @returns {Object} - {distance, duration, validation}
     */
    static async getDistanceWithValidation(fromSite, toSite, transportation = null) {
        try {
            // Map transportation to VietMap vehicle type
            let vehicle = 'bike'; // default
            if (transportation) {
                const lowerTransport = transportation.toLowerCase();
                if (lowerTransport.includes('car') || lowerTransport.includes('ô tô') || lowerTransport.includes('xe hơi')) {
                    vehicle = 'car';
                } else if (lowerTransport.includes('bike') || lowerTransport.includes('xe máy') || lowerTransport.includes('motor')) {
                    vehicle = 'bike';
                }
            }

            // Try VietMap first
            const routeInfo = await this.getRouteInfo(
                { lat: parseFloat(fromSite.latitude), lng: parseFloat(fromSite.longitude) },
                { lat: parseFloat(toSite.latitude), lng: parseFloat(toSite.longitude) },
                vehicle
            );

            let distance, duration;

            if (routeInfo) {
                distance = routeInfo.distance;
                duration = routeInfo.duration;
            } else {
                // Fallback to Haversine
                distance = this.calculateHaversineDistance(
                    parseFloat(fromSite.latitude),
                    parseFloat(fromSite.longitude),
                    parseFloat(toSite.latitude),
                    parseFloat(toSite.longitude)
                );
                duration = null;
                Logger.warn('Using Haversine fallback for distance calculation');
            }

            const validation = this.validateDistance(distance, transportation);

            return {
                distance,
                duration,
                validation
            };
        } catch (error) {
            Logger.error('Distance calculation error:', error);
            throw error;
        }
    }
}

module.exports = OSRMUtil;
