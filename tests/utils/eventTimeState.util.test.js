const { describe, it } = require('node:test');
const assert = require('node:assert/strict');

// Import the pure function directly (no DB needed)
const path = require('node:path');
const ROOT = path.resolve(__dirname, '../..');
const UTIL_PATH = path.join(ROOT, 'utils', 'eventTimeState.util.js');

// Mock appConfig and logger before requiring the util
const APP_CONFIG_PATH = path.join(ROOT, 'config', 'app.config.js');
const LOGGER_PATH = path.join(ROOT, 'utils', 'logger.util.js');

function setMock(modulePath, exports) {
    require.cache[modulePath] = {
        id: modulePath,
        filename: modulePath,
        loaded: true,
        exports,
    };
}

function clearModules() {
    delete require.cache[UTIL_PATH];
}

// ===== Setup mocks =====
setMock(APP_CONFIG_PATH, { timezone: 'Asia/Ho_Chi_Minh' });
setMock(LOGGER_PATH, {
    info: () => { },
    error: () => { },
    warn: () => { },
});

const { calculateEventTimeState } = require(UTIL_PATH);

// ===== Tests =====

describe('calculateEventTimeState', () => {

    // ---------- upcoming ----------
    describe('upcoming', () => {
        it('should return upcoming when today is before start_date', () => {
            const result = calculateEventTimeState('2026-12-25', '2026-12-31', '2026-12-01');
            assert.equal(result, 'upcoming');
        });

        it('should return upcoming when today is the day before start_date', () => {
            const result = calculateEventTimeState('2026-06-15', null, '2026-06-14');
            assert.equal(result, 'upcoming');
        });
    });

    // ---------- ongoing ----------
    describe('ongoing', () => {
        it('should return ongoing when today equals start_date (multi-day event)', () => {
            const result = calculateEventTimeState('2026-06-15', '2026-06-20', '2026-06-15');
            assert.equal(result, 'ongoing');
        });

        it('should return ongoing when today equals end_date', () => {
            const result = calculateEventTimeState('2026-06-15', '2026-06-20', '2026-06-20');
            assert.equal(result, 'ongoing');
        });

        it('should return ongoing when today is between start and end', () => {
            const result = calculateEventTimeState('2026-06-15', '2026-06-20', '2026-06-18');
            assert.equal(result, 'ongoing');
        });

        it('should return ongoing for single-day event (end_date=null) on start_date', () => {
            const result = calculateEventTimeState('2026-06-15', null, '2026-06-15');
            assert.equal(result, 'ongoing');
        });
    });

    // ---------- ended ----------
    describe('ended', () => {
        it('should return ended when today is after end_date', () => {
            const result = calculateEventTimeState('2026-06-15', '2026-06-20', '2026-06-21');
            assert.equal(result, 'ended');
        });

        it('should return ended for single-day event (end_date=null) after start_date', () => {
            const result = calculateEventTimeState('2026-06-15', null, '2026-06-16');
            assert.equal(result, 'ended');
        });

        it('should return ended for past event with both dates', () => {
            const result = calculateEventTimeState('2025-01-01', '2025-01-05', '2026-04-08');
            assert.equal(result, 'ended');
        });
    });

    // ---------- edge cases ----------
    describe('edge cases', () => {
        it('should return ongoing when start_date equals end_date and today matches', () => {
            const result = calculateEventTimeState('2026-08-01', '2026-08-01', '2026-08-01');
            assert.equal(result, 'ongoing');
        });

        it('should return ended when start_date equals end_date and today is after', () => {
            const result = calculateEventTimeState('2026-08-01', '2026-08-01', '2026-08-02');
            assert.equal(result, 'ended');
        });

        it('should handle cross-year boundary correctly', () => {
            const result = calculateEventTimeState('2025-12-30', '2026-01-02', '2026-01-01');
            assert.equal(result, 'ongoing');
        });

        it('should handle cross-year as ended', () => {
            const result = calculateEventTimeState('2025-12-30', '2026-01-02', '2026-01-03');
            assert.equal(result, 'ended');
        });
    });
});
