/**
 * Haversine Utility
 * Calculate distance between two GPS coordinates using the Haversine formula
 */
class HaversineUtil {
    /**
     * Calculate distance between two points on Earth
     * @param {number} lat1 - Latitude of first point
     * @param {number} lng1 - Longitude of first point
     * @param {number} lat2 - Latitude of second point
     * @param {number} lng2 - Longitude of second point
     * @returns {number} Distance in meters
     */
    static distance(lat1, lng1, lat2, lng2) {
        const R = 6371000; // Earth's radius in meters
        const toRad = v => v * Math.PI / 180;

        const dLat = toRad(lat2 - lat1);
        const dLng = toRad(lng2 - lng1);

        const a =
            Math.sin(dLat / 2) ** 2 +
            Math.cos(toRad(lat1)) *
            Math.cos(toRad(lat2)) *
            Math.sin(dLng / 2) ** 2;

        return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)));
    }
}

module.exports = HaversineUtil;
