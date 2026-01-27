/**
 * OSRM (Open Source Routing Machine) Utility
 * Provides route calculation and distance validation for planner items
 */

const Logger = require('./logger.util');

class OSRMUtil {
    /**
     * Get route information from OSRM API
     * @param {Object} from - Starting coordinates {lat, lng}
     * @param {Object} to - Destination coordinates {lat, lng}
     * @returns {Object|null} - {distance: meters, duration: seconds} or null if failed
     */
    static async getRouteInfo(from, to) {
        try {
            const url = `https://router.project-osrm.org/route/v1/driving/${from.lng},${from.lat};${to.lng},${to.lat}?overview=false`;

            Logger.info(`OSRM API call: ${url}`);

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 10000); // 10s timeout

            const response = await fetch(url, {
                signal: controller.signal,
                headers: {
                    'User-Agent': 'Catholic-Pilgrimage-App/1.0'
                }
            });

            clearTimeout(timeout);

            if (!response.ok) {
                Logger.warn(`OSRM API returned status ${response.status}`);
                return null;
            }

            const data = await response.json();

            if (!data.routes || data.routes.length === 0) {
                Logger.warn('OSRM: No routes found');
                return null;
            }

            Logger.info(`OSRM: Distance ${data.routes[0].distance}m, Duration ${data.routes[0].duration}s`);

            return {
                distance: data.routes[0].distance, // in meters
                duration: data.routes[0].duration  // in seconds
            };
        } catch (error) {
            if (error.name === 'AbortError') {
                Logger.error('OSRM API timeout');
            } else {
                Logger.error('OSRM API error:', error.message);
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
     * @param {string} transportation - Transportation mode
     * @returns {Object} - {distance, duration, validation}
     */
    static async getDistanceWithValidation(fromSite, toSite, transportation = null) {
        try {
            // Try OSRM first
            const routeInfo = await this.getRouteInfo(
                { lat: parseFloat(fromSite.latitude), lng: parseFloat(fromSite.longitude) },
                { lat: parseFloat(toSite.latitude), lng: parseFloat(toSite.longitude) }
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
