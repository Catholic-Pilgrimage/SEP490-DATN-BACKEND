const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const { loadShiftService, createSiteRecord, createEventRecord } = require('./_shiftTestHelper');

describe('LocalGuideShiftService.getDynamicHoursForDate', () => {
    let LocalGuideShiftService;

    beforeEach(() => {
        ({ LocalGuideShiftService } = loadShiftService());
    });

    // ─── Default (no events) ───

    it('returns single site window when no events overlap', () => {
        const site = createSiteRecord({ opening_hours: { open: '08:00', close: '17:00' } });
        const result = LocalGuideShiftService.getDynamicHoursForDate(site, [], '2026-04-13');

        assert.equal(result.windows.length, 1);
        assert.equal(result.windows[0].open, '08:00:00');
        assert.equal(result.windows[0].close, '17:00:00');
        assert.equal(result.events.length, 0);
    });

    it('returns empty windows when site has no opening_hours and no events', () => {
        const site = createSiteRecord({ opening_hours: null });
        const result = LocalGuideShiftService.getDynamicHoursForDate(site, [], '2026-04-13');

        assert.equal(result.windows.length, 0);
    });

    // ─── P2: Weekday-map format ───

    it('parses weekday-map format for the correct day', () => {
        const site = createSiteRecord({
            opening_hours: { monday: '09:00-18:00', tuesday: '10:00-16:00' },
        });
        // 2026-04-13 is a Monday
        const result = LocalGuideShiftService.getDynamicHoursForDate(site, [], '2026-04-13');

        assert.equal(result.windows.length, 1);
        assert.equal(result.windows[0].open, '09:00:00');
        assert.equal(result.windows[0].close, '18:00:00');
    });

    // ─── P2: Events still create windows even without default hours ───

    it('creates event window when site has no opening_hours', () => {
        const site = createSiteRecord({ opening_hours: null });
        const events = [createEventRecord({
            start_date: '2026-04-13', end_date: null,
            start_time: '18:00:00', end_time: '22:00:00',
        })];
        const result = LocalGuideShiftService.getDynamicHoursForDate(site, events, '2026-04-13');

        assert.equal(result.windows.length, 1);
        assert.equal(result.windows[0].open, '18:00:00');
        assert.equal(result.windows[0].close, '22:00:00');
    });

    // ─── P1: Gaps preserved between site hours and disjoint event ───

    it('keeps gap between site close and event start (does NOT flatten)', () => {
        const site = createSiteRecord({ opening_hours: { open: '08:00', close: '17:00' } });
        const events = [createEventRecord({
            start_date: '2026-04-13', end_date: null,
            start_time: '19:00:00', end_time: '22:00:00',
        })];
        const result = LocalGuideShiftService.getDynamicHoursForDate(site, events, '2026-04-13');

        // Should have TWO separate windows: site hours and event hours
        assert.equal(result.windows.length, 2);
        assert.equal(result.windows[0].open, '08:00:00');
        assert.equal(result.windows[0].close, '17:00:00');
        assert.equal(result.windows[1].open, '19:00:00');
        assert.equal(result.windows[1].close, '22:00:00');
    });

    it('rejects shift that falls in the gap between site and event', () => {
        // Shift 17:30-19:30 should NOT fit in either [08:00-17:00] or [19:00-22:00]
        const site = createSiteRecord({ opening_hours: { open: '08:00', close: '17:00' } });
        const events = [createEventRecord({
            start_date: '2026-04-13', end_date: null,
            start_time: '19:00:00', end_time: '22:00:00',
        })];
        const result = LocalGuideShiftService.getDynamicHoursForDate(site, events, '2026-04-13');

        const shiftStart = '17:30:00';
        const shiftEnd = '19:30:00';
        const fits = result.windows.some(w => shiftStart >= w.open && shiftEnd <= w.close);
        assert.equal(fits, false, 'Shift in the gap must be rejected');
    });

    it('merges overlapping event into site window', () => {
        const site = createSiteRecord({ opening_hours: { open: '08:00', close: '17:00' } });
        const events = [createEventRecord({
            start_date: '2026-04-13', end_date: null,
            start_time: '16:00:00', end_time: '20:00:00', // overlaps with site close
        })];
        const result = LocalGuideShiftService.getDynamicHoursForDate(site, events, '2026-04-13');

        // Should merge into ONE window: 08:00-20:00
        assert.equal(result.windows.length, 1);
        assert.equal(result.windows[0].open, '08:00:00');
        assert.equal(result.windows[0].close, '20:00:00');
    });

    // ─── Same-day event extends ───

    it('extends open when same-day event starts before site open', () => {
        const site = createSiteRecord({ opening_hours: { open: '08:00', close: '17:00' } });
        const events = [createEventRecord({
            start_date: '2026-04-13', end_date: null,
            start_time: '05:00:00', end_time: '09:00:00', // overlaps with site open
        })];
        const result = LocalGuideShiftService.getDynamicHoursForDate(site, events, '2026-04-13');

        assert.equal(result.windows.length, 1);
        assert.equal(result.windows[0].open, '05:00:00');
        assert.equal(result.windows[0].close, '17:00:00');
    });

    // ─── All-day event ───

    it('sets full-day window for all-day event (no times)', () => {
        const site = createSiteRecord({ opening_hours: { open: '08:00', close: '17:00' } });
        const events = [createEventRecord({
            start_date: '2026-04-13', end_date: null,
            start_time: null, end_time: null,
        })];
        const result = LocalGuideShiftService.getDynamicHoursForDate(site, events, '2026-04-13');

        assert.equal(result.windows.length, 1);
        assert.equal(result.windows[0].open, '00:00:00');
        assert.equal(result.windows[0].close, '23:59:00');
        assert.equal(result.events[0].all_day, true);
    });

    // ─── Cross-midnight single-night event ───

    it('adds evening window on start date of cross-midnight event', () => {
        const site = createSiteRecord({ opening_hours: { open: '08:00', close: '17:00' } });
        const events = [createEventRecord({
            start_date: '2026-04-13', end_date: null,
            start_time: '22:00:00', end_time: '02:00:00',
        })];
        const result = LocalGuideShiftService.getDynamicHoursForDate(site, events, '2026-04-13');

        assert.equal(result.windows.length, 2);
        assert.equal(result.windows[0].open, '08:00:00');
        assert.equal(result.windows[0].close, '17:00:00');
        assert.equal(result.windows[1].open, '22:00:00');
        assert.equal(result.windows[1].close, '23:59:00');
    });

    it('adds early-morning window on spillover day of cross-midnight event', () => {
        const site = createSiteRecord({ opening_hours: { open: '08:00', close: '17:00' } });
        const events = [createEventRecord({
            start_date: '2026-04-13', end_date: null,
            start_time: '22:00:00', end_time: '02:00:00',
        })];
        const result = LocalGuideShiftService.getDynamicHoursForDate(site, events, '2026-04-14');

        assert.equal(result.windows.length, 2);
        assert.equal(result.windows[0].open, '00:00:00');
        assert.equal(result.windows[0].close, '02:00:00');
        assert.equal(result.windows[1].open, '08:00:00');
        assert.equal(result.windows[1].close, '17:00:00');
    });

    it('does NOT add windows on a day AFTER the cross-midnight spillover', () => {
        const site = createSiteRecord({ opening_hours: { open: '08:00', close: '17:00' } });
        const events = [createEventRecord({
            start_date: '2026-04-13', end_date: null,
            start_time: '22:00:00', end_time: '02:00:00',
        })];
        const result = LocalGuideShiftService.getDynamicHoursForDate(site, events, '2026-04-15');

        assert.equal(result.windows.length, 1); // only default site hours
        assert.equal(result.events.length, 0);
    });

    // ─── P1: Multi-day cross-midnight event – end_date gets close extension ───

    it('extends close on end_date of multi-day cross-midnight event', () => {
        const site = createSiteRecord({ opening_hours: { open: '08:00', close: '17:00' } });
        const events = [createEventRecord({
            start_date: '2026-04-13', end_date: '2026-04-15',
            start_time: '22:00:00', end_time: '02:00:00',
        })];
        // April 15 = end_date. Event starts again at 22:00 this night.
        const result = LocalGuideShiftService.getDynamicHoursForDate(site, events, '2026-04-15');

        // Should have: spillover [00:00-02:00], site [08:00-17:00], event tonight [22:00-23:59]
        assert.equal(result.windows.length, 3);
        assert.equal(result.windows[0].open, '00:00:00');
        assert.equal(result.windows[0].close, '02:00:00');
        assert.equal(result.windows[1].open, '08:00:00');
        assert.equal(result.windows[1].close, '17:00:00');
        assert.equal(result.windows[2].open, '22:00:00');
        assert.equal(result.windows[2].close, '23:59:00');
    });

    it('extends both bounds on intermediate days of multi-day cross-midnight event', () => {
        const site = createSiteRecord({ opening_hours: { open: '08:00', close: '17:00' } });
        const events = [createEventRecord({
            start_date: '2026-04-13', end_date: '2026-04-15',
            start_time: '22:00:00', end_time: '02:00:00',
        })];
        // April 14 = intermediate day
        const result = LocalGuideShiftService.getDynamicHoursForDate(site, events, '2026-04-14');

        // Should have: spillover [00:00-02:00], site [08:00-17:00], event tonight [22:00-23:59]
        assert.equal(result.windows.length, 3);
        assert.equal(result.windows[0].close, '02:00:00');
        assert.equal(result.windows[2].open, '22:00:00');
    });

    // ─── Multiple events on same day ───

    it('creates separate windows for multiple disjoint events', () => {
        const site = createSiteRecord({ opening_hours: { open: '08:00', close: '17:00' } });
        const events = [
            createEventRecord({
                name: 'Morning Mass',
                start_date: '2026-04-13', end_date: null,
                start_time: '05:30:00', end_time: '06:30:00',
            }),
            createEventRecord({
                name: 'Evening Concert',
                start_date: '2026-04-13', end_date: null,
                start_time: '19:00:00', end_time: '23:00:00',
            }),
        ];
        const result = LocalGuideShiftService.getDynamicHoursForDate(site, events, '2026-04-13');

        assert.equal(result.windows.length, 3);
        assert.equal(result.windows[0].open, '05:30:00');
        assert.equal(result.windows[0].close, '06:30:00');
        assert.equal(result.windows[1].open, '08:00:00');
        assert.equal(result.windows[1].close, '17:00:00');
        assert.equal(result.windows[2].open, '19:00:00');
        assert.equal(result.windows[2].close, '23:00:00');
        assert.equal(result.events.length, 2);
    });

    // ─── mergeTimeWindows ───

    it('merges overlapping windows correctly', () => {
        const merged = LocalGuideShiftService.mergeTimeWindows([
            { open: '08:00:00', close: '12:00:00' },
            { open: '10:00:00', close: '14:00:00' },
            { open: '16:00:00', close: '18:00:00' },
        ]);

        assert.equal(merged.length, 2);
        assert.equal(merged[0].open, '08:00:00');
        assert.equal(merged[0].close, '14:00:00');
        assert.equal(merged[1].open, '16:00:00');
        assert.equal(merged[1].close, '18:00:00');
    });

    it('returns empty array for empty input', () => {
        const merged = LocalGuideShiftService.mergeTimeWindows([]);
        assert.equal(merged.length, 0);
    });

    // ─── Bug fix: missing weekday entry = closed ───

    it('returns hasSchedule=true with empty windows for missing weekday entry', () => {
        const site = createSiteRecord({
            opening_hours: { monday: '09:00-18:00' }, // no sunday entry
        });
        // 2026-04-12 is a Sunday
        const result = LocalGuideShiftService.getDynamicHoursForDate(site, [], '2026-04-12');

        assert.equal(result.hasSchedule, true);
        assert.equal(result.windows.length, 0, 'Missing weekday entry should produce no windows');
    });

    it('returns hasSchedule=false when site has no opening_hours at all', () => {
        const site = createSiteRecord({ opening_hours: null });
        const result = LocalGuideShiftService.getDynamicHoursForDate(site, [], '2026-04-13');

        assert.equal(result.hasSchedule, false);
    });

    // ─── Bug fix: unified cross-midnight hours ───

    it('splits unified cross-midnight hours into two usable windows', () => {
        const site = createSiteRecord({ opening_hours: { open: '22:00', close: '04:00' } });
        const result = LocalGuideShiftService.getDynamicHoursForDate(site, [], '2026-04-13');

        assert.equal(result.windows.length, 2);
        assert.equal(result.windows[0].open, '00:00:00');
        assert.equal(result.windows[0].close, '04:00:00');
        assert.equal(result.windows[1].open, '22:00:00');
        assert.equal(result.windows[1].close, '23:59:00');
    });

    // ─── Bug fix: weekday-map cross-midnight does NOT self-spill ───

    it('weekday-map cross-midnight only spills to next day, not same day', () => {
        const site = createSiteRecord({
            opening_hours: {
                // 2026-04-13 is Monday, 2026-04-12 is Sunday
                sunday: '09:00-15:00',    // normal hours, no spill
                monday: '22:00-04:00',    // cross-midnight
            },
        });
        // On Monday (2026-04-13): should have [22:00-23:59] only (tonight's portion)
        // Should NOT have [00:00-04:00] (that would be Tuesday's spill from Monday)
        // Sunday is NOT cross-midnight, so no yesterday spill either
        const mondayResult = LocalGuideShiftService.getDynamicHoursForDate(site, [], '2026-04-13');

        assert.equal(mondayResult.windows.length, 1);
        assert.equal(mondayResult.windows[0].open, '22:00:00');
        assert.equal(mondayResult.windows[0].close, '23:59:00');

        // On Tuesday (2026-04-14): should have [00:00-04:00] from Monday's spill
        const tuesdayResult = LocalGuideShiftService.getDynamicHoursForDate(site, [], '2026-04-14');

        const hasSpill = tuesdayResult.windows.some(w => w.open === '00:00:00' && w.close === '04:00:00');
        assert.equal(hasSpill, true, 'Tuesday should have Monday cross-midnight spill');
    });
});
