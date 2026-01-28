/**
 * OSRM (Open Source Routing Machine) Utility
 * Provides route calculation and distance validation for planner items
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

            // TESTING: Log response status
            console.log('\n========== VIETMAP MATRIX API RESPONSE STATUS ==========');
            console.log(`Status: ${response.status} ${response.statusText}`);
            console.log('========================================================\n');

            if (!response.ok) {
                // Try to read error response
                try {
                    const errorText = await response.text();
                    console.log('Error response body:', errorText);
                } catch (e) {
                    console.log('Could not read error response');
                }
                Logger.warn(`VietMap API returned status ${response.status}`);
                return null;
            }

            const data = await response.json();

            // TESTING: Log full API response
            console.log('\n========== VIETMAP MATRIX API RESPONSE ==========');
            console.log('Full response:', JSON.stringify(data, null, 2));
            console.log('=================================================\n');

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

    // TESTING: Haversine fallback disabled to test VietMap Matrix API
    // /**
    //  * Calculate distance using Haversine formula (fallback)
    //  * @param {number} lat1 - Latitude of point 1
    //  * @param {number} lng1 - Longitude of point 1
    //  * @param {number} lat2 - Latitude of point 2
    //  * @param {number} lng2 - Longitude of point 2
    //  * @returns {number} - Distance in meters
    //  */
    // static calculateHaversineDistance(lat1, lng1, lat2, lng2) {
    //     const R = 6371000; // Earth's radius in meters
    //     const φ1 = lat1 * Math.PI / 180;
    //     const φ2 = lat2 * Math.PI / 180;
    //     const Δφ = (lat2 - lat1) * Math.PI / 180;
    //     const Δλ = (lng2 - lng1) * Math.PI / 180;

    //     const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    //         Math.cos(φ1) * Math.cos(φ2) *
    //         Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    //     const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    //     return R * c; // Distance in meters
    // }

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

                // TESTING: Log VietMap Matrix API results
                console.log('\n========== ✅ VIETMAP MATRIX API SUCCESS ==========');
                console.log(`Điểm A: [${fromSite.latitude}, ${fromSite.longitude}]`);
                console.log(`Điểm B: [${toSite.latitude}, ${toSite.longitude}]`);
                console.log(`Phương tiện: ${vehicle}`);
                console.log(`Khoảng cách: ${distance}m (${(distance / 1000).toFixed(2)}km)`);
                console.log(`Thời gian: ${duration ? `${duration}s (${(duration / 60).toFixed(1)} phút)` : 'N/A'}`);
                console.log('===================================================\n');
            } else {
                // TESTING: VietMap failed, no fallback
                console.log('\n==========VIETMAP MATRIX API FAILED ==========');
                console.log(`Điểm A: [${fromSite.latitude}, ${fromSite.longitude}]`);
                console.log(`Điểm B: [${toSite.latitude}, ${toSite.longitude}]`);
                console.log('VietMap Matrix API không trả về kết quả');
                console.log('Haversine fallback đã bị tắt để test');
                console.log('==================================================\n');
                Logger.error('VietMap Matrix API failed and Haversine fallback is disabled for testing');
                throw new Error('VietMap Matrix API không hoạt động và fallback đã bị tắt để test');
                // // Fallback to Haversine
                // distance = this.calculateHaversineDistance(
                //     parseFloat(fromSite.latitude),
                //     parseFloat(fromSite.longitude),
                //     parseFloat(toSite.latitude),
                //     parseFloat(toSite.longitude)
                // );
                // duration = null;
                // Logger.warn('Using Haversine fallback for distance calculation');
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
