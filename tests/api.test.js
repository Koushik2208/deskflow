'use strict';

require('dotenv').config();

const http = require('http');
const https = require('https');

const RUN = Date.now();
const BASE_URL = process.env.BASE_URL || 'http://localhost:5000';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

let total = 0;
let passed = 0;
let failed = 0;
let skipped = 0;
const failures = [];

// State saved across tests
let memberToken = null;
let adminToken = null;
let managerToken = null;
let guestToken = null;
let managerId = null;
let locationId = null;
let spaceId = null;
let bookingId = null;
let billingId = null;
let bookingTotalAmount = null;
let recurringGroupId = null;
let earlyCheckInBookingId = null;
let guestPassId = null;
let guestPassToken = null;
let guestPassId2 = null;
let guestPassToken2 = null;
let reviewId = null;

// Date helpers — all computed in UTC
const _now = new Date();
const _y = _now.getUTCFullYear();
const _m = _now.getUTCMonth();
const _d = _now.getUTCDate();

const tomorrowStr         = new Date(Date.UTC(_y, _m, _d + 1)).toISOString().split('T')[0];
const dayAfterTomorrowStr = new Date(Date.UTC(_y, _m, _d + 2)).toISOString().split('T')[0];
const oneWeekFromTomorrow = new Date(Date.UTC(_y, _m, _d + 8)).toISOString().split('T')[0];
const fiveWeeksFromTomorrow = new Date(Date.UTC(_y, _m, _d + 36)).toISOString().split('T')[0];
const threeDaysFromNow    = new Date(Date.UTC(_y, _m, _d + 3)).toISOString();

// ─────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const payload = body != null ? JSON.stringify(body) : null;
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (payload) headers['Content-Length'] = Buffer.byteLength(payload);

    const opts = {
      hostname: url.hostname,
      port: parseInt(url.port, 10) || (url.protocol === 'https:' ? 443 : 80),
      path: url.pathname + url.search,
      method,
      headers,
    };

    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request(opts, (res) => {
      let raw = '';
      res.on('data', (chunk) => { raw += chunk; });
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(raw); } catch { parsed = raw; }
        resolve({ status: res.statusCode, body: parsed });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function assert(condition, name, expected, actual) {
  total++;
  if (condition) {
    passed++;
    console.log(`PASS: ${name}`);
  } else {
    failed++;
    failures.push(name);
    console.log(`FAIL: ${name}`);
    if (expected !== undefined) console.log(`  Expected: ${JSON.stringify(expected)}`);
    if (actual   !== undefined) console.log(`  Actual:   ${JSON.stringify(actual)}`);
  }
}

function skip(name, reason) {
  skipped++;
  console.log(`SKIP: ${name}${reason ? ` — ${reason}` : ''}`);
}

// ─────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────

async function run() {
  let r;

  // ═══════════════════════════════════════════════════════
  // 1. AUTH
  // ═══════════════════════════════════════════════════════
  console.log('\n── 1. Auth ──');

  r = await request('POST', '/api/auth/register', {
    name: `Member ${RUN}`,
    email: `member${RUN}@test.com`,
    password: 'Password123!',
  });
  assert(r.status === 201, 'Register member', 201, r.status);
  memberToken = r.body.token || null;

  r = await request('POST', '/api/auth/login', {
    email: `member${RUN}@test.com`,
    password: 'Password123!',
  });
  assert(r.status === 200 || r.status === 201, 'Login member', '200 or 201', r.status);
  if (r.body.token) memberToken = r.body.token;

  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    console.log('\nWARN: ADMIN_EMAIL and/or ADMIN_PASSWORD not set.');
    console.log('      All admin-dependent tests will be skipped.\n');
  } else {
    r = await request('POST', '/api/auth/login', {
      email: ADMIN_EMAIL,
      password: ADMIN_PASSWORD,
    });
    assert(r.status === 200 || r.status === 201, 'Login admin', '200 or 201', r.status);
    adminToken = r.body.token || null;

    if (adminToken) {
      r = await request('POST', '/api/auth/register/location-manager', {
        name: `Manager ${RUN}`,
        email: `manager${RUN}@test.com`,
        password: 'Password123!',
      }, adminToken);
      assert(r.status === 201, 'Register location_manager (admin)', 201, r.status);
      managerId = r.body.user ? r.body.user.id : null;

      r = await request('POST', '/api/auth/login', {
        email: `manager${RUN}@test.com`,
        password: 'Password123!',
      });
      assert(r.status === 200 || r.status === 201, 'Login location_manager', '200 or 201', r.status);
      managerToken = r.body.token || null;
    }
  }

  // ═══════════════════════════════════════════════════════
  // 2. LOCATIONS
  // ═══════════════════════════════════════════════════════
  console.log('\n── 2. Locations ──');

  if (!adminToken) {
    skip('Create location (admin)', 'no adminToken');
    skip('Get all locations (member)', 'no locationId');
    skip('Get location by id (member)', 'no locationId');
    skip('Update location (admin)', 'no adminToken');
    skip('Assign manager to location (admin)', 'no adminToken');
    skip('Create location unauthorized (member → 403)', 'no setup');
  } else {
    r = await request('POST', '/api/locations', {
      name: `Test Location ${RUN}`,
      address: '123 Main St',
      city: 'Testville',
    }, adminToken);
    assert(r.status === 201, 'Create location (admin)', 201, r.status);
    locationId = r.body._id || null;

    r = await request('GET', '/api/locations', null, memberToken);
    assert(r.status === 200 && Array.isArray(r.body), 'Get all locations (member)', '200 + array', `status:${r.status}`);

    if (locationId) {
      r = await request('GET', `/api/locations/${locationId}`, null, memberToken);
      assert(r.status === 200, 'Get location by id (member)', 200, r.status);

      r = await request('PUT', `/api/locations/${locationId}`, {
        name: `Updated Location ${RUN}`,
      }, adminToken);
      assert(r.status === 200, 'Update location (admin)', 200, r.status);

      if (managerId) {
        r = await request('PUT', `/api/locations/${locationId}/assign-manager`, {
          userId: managerId,
        }, adminToken);
        assert(r.status === 200, 'Assign manager to location (admin)', 200, r.status);
      } else {
        skip('Assign manager to location (admin)', 'no managerId');
      }
    } else {
      skip('Get location by id (member)', 'locationId not set');
      skip('Update location (admin)', 'locationId not set');
      skip('Assign manager to location (admin)', 'locationId not set');
    }

    r = await request('POST', '/api/locations', {
      name: 'Denied',
      address: '1 Denied Rd',
      city: 'Nowhere',
    }, memberToken);
    assert(r.status === 403, 'Create location unauthorized (member → 403)', 403, r.status);
  }

  // ═══════════════════════════════════════════════════════
  // 3. SPACES
  // ═══════════════════════════════════════════════════════
  console.log('\n── 3. Spaces ──');

  if (!adminToken || !locationId) {
    const why = !adminToken ? 'no adminToken' : 'no locationId';
    skip('Create space (admin)', why);
    skip('Get all spaces (member)', why);
    skip('Get space by id (member)', why);
    skip('Update space (admin)', why);
    skip('Check availability (available slot)', why);
    skip('Create space unauthorized (member → 403)', why);
  } else {
    r = await request('POST', '/api/spaces', {
      name: `Test Space ${RUN}`,
      type: 'desk',
      location: locationId,
      pricePerHour: 10,
      pricePerDay: 60,
      capacity: 4,
      amenities: ['wifi', 'whiteboard'],
    }, adminToken);
    assert(r.status === 201, 'Create space (admin)', 201, r.status);
    spaceId = r.body._id || null;

    r = await request('GET', '/api/spaces', null, memberToken);
    assert(r.status === 200 && Array.isArray(r.body), 'Get all spaces (member)', '200 + array', `status:${r.status}`);

    if (spaceId) {
      r = await request('GET', `/api/spaces/${spaceId}`, null, memberToken);
      assert(r.status === 200, 'Get space by id (member)', 200, r.status);

      r = await request('PUT', `/api/spaces/${spaceId}`, {
        name: `Updated Space ${RUN}`,
      }, adminToken);
      assert(r.status === 200, 'Update space (admin)', 200, r.status);

      const availUrl = `/api/spaces/availability?spaceId=${spaceId}&date=${tomorrowStr}&startTime=08:00&endTime=09:00`;
      r = await request('GET', availUrl, null, memberToken);
      assert(
        r.status === 200 && r.body.available === true,
        'Check availability (available slot 08:00–09:00)',
        '200 + available:true',
        `status:${r.status}, available:${r.body && r.body.available}`
      );
    } else {
      skip('Get space by id (member)', 'spaceId not set');
      skip('Update space (admin)', 'spaceId not set');
      skip('Check availability (available slot)', 'spaceId not set');
    }

    r = await request('POST', '/api/spaces', {
      name: 'Denied',
      type: 'desk',
      location: locationId,
      pricePerHour: 5,
      pricePerDay: 30,
      capacity: 1,
    }, memberToken);
    assert(r.status === 403, 'Create space unauthorized (member → 403)', 403, r.status);
  }

  // ═══════════════════════════════════════════════════════
  // 4. BOOKINGS — SINGLE + AVAILABILITY EDGE CASES
  // ═══════════════════════════════════════════════════════
  console.log('\n── 4. Bookings (single) ──');

  if (!memberToken || !spaceId || !locationId) {
    const why = 'missing memberToken, spaceId, or locationId';
    skip('Create booking (member)', why);
    skip('Duplicate booking (same slot → 409)', why);
    skip('Get my bookings (member)', why);
    skip('Get all bookings (admin)', why);
    skip('Get booking by id (member)', why);
    skip('Unauthorized get all bookings (member → 403)', why);
    skip('Availability: full overlap (10:00–12:00 → unavailable)', why);
    skip('Availability: partial overlap start (09:00–11:00 → unavailable)', why);
    skip('Availability: partial overlap end (11:00–13:00 → unavailable)', why);
    skip('Availability: adjacent no overlap (12:00–14:00 → available)', why);
  } else {
    r = await request('POST', '/api/bookings', {
      space: spaceId,
      location: locationId,
      date: tomorrowStr,
      startTime: '10:00',
      endTime: '12:00',
      recurringType: 'none',
    }, memberToken);
    assert(r.status === 201, 'Create booking (member)', 201, r.status);
    if (r.status === 201 && r.body.booking) {
      bookingId = r.body.booking._id || null;
      billingId = r.body.billingRecord ? r.body.billingRecord._id : null;
      bookingTotalAmount = r.body.booking.totalAmount != null ? r.body.booking.totalAmount : null;
    }

    // Duplicate — same space/date/time
    r = await request('POST', '/api/bookings', {
      space: spaceId,
      location: locationId,
      date: tomorrowStr,
      startTime: '10:00',
      endTime: '12:00',
      recurringType: 'none',
    }, memberToken);
    assert(r.status === 409, 'Duplicate booking (same slot → 409)', 409, r.status);

    r = await request('GET', '/api/bookings/my', null, memberToken);
    assert(
      r.status === 200 && Array.isArray(r.body) && r.body.some((b) => b._id === bookingId),
      'Get my bookings (member) — contains bookingId',
      '200 + array containing bookingId',
      `status:${r.status}, found:${Array.isArray(r.body) && r.body.some((b) => b._id === bookingId)}`
    );

    if (adminToken) {
      r = await request('GET', '/api/bookings/all', null, adminToken);
      assert(r.status === 200 && Array.isArray(r.body), 'Get all bookings (admin)', '200 + array', `status:${r.status}`);
    } else {
      skip('Get all bookings (admin)', 'no adminToken');
    }

    if (bookingId) {
      r = await request('GET', `/api/bookings/${bookingId}`, null, memberToken);
      assert(r.status === 200, 'Get booking by id (member)', 200, r.status);
    } else {
      skip('Get booking by id (member)', 'bookingId not set');
    }

    r = await request('GET', '/api/bookings/all', null, memberToken);
    assert(r.status === 403, 'Unauthorized get all bookings (member → 403)', 403, r.status);

    // Availability edge cases — all use the booked slot (10:00–12:00 tomorrow)
    console.log('\n── 4b. Availability edge cases ──');

    r = await request('GET', `/api/spaces/availability?spaceId=${spaceId}&date=${tomorrowStr}&startTime=10:00&endTime=12:00`, null, memberToken);
    assert(
      r.status === 200 && r.body.available === false,
      'Availability: full overlap (10:00–12:00 → unavailable)',
      '200 + available:false',
      `status:${r.status}, available:${r.body && r.body.available}`
    );

    r = await request('GET', `/api/spaces/availability?spaceId=${spaceId}&date=${tomorrowStr}&startTime=09:00&endTime=11:00`, null, memberToken);
    assert(
      r.status === 200 && r.body.available === false,
      'Availability: partial overlap start (09:00–11:00 → unavailable)',
      '200 + available:false',
      `status:${r.status}, available:${r.body && r.body.available}`
    );

    r = await request('GET', `/api/spaces/availability?spaceId=${spaceId}&date=${tomorrowStr}&startTime=11:00&endTime=13:00`, null, memberToken);
    assert(
      r.status === 200 && r.body.available === false,
      'Availability: partial overlap end (11:00–13:00 → unavailable)',
      '200 + available:false',
      `status:${r.status}, available:${r.body && r.body.available}`
    );

    r = await request('GET', `/api/spaces/availability?spaceId=${spaceId}&date=${tomorrowStr}&startTime=12:00&endTime=14:00`, null, memberToken);
    assert(
      r.status === 200 && r.body.available === true,
      'Availability: adjacent no overlap (12:00–14:00 → available)',
      '200 + available:true',
      `status:${r.status}, available:${r.body && r.body.available}`
    );
  }

  // ═══════════════════════════════════════════════════════
  // 5. BOOKINGS — RECURRING
  // ═══════════════════════════════════════════════════════
  console.log('\n── 5. Bookings (recurring) ──');

  if (!memberToken || !spaceId || !locationId) {
    skip('Create recurring booking (member)', 'missing required IDs');
    skip('Recurring booking — 5 or 6 occurrences', 'depends on recurring booking');
    skip('Conflicting recurring booking → 409', 'depends on recurring booking');
    skip('Conflicting recurring — unavailableDates non-empty', 'depends on conflict');
  } else {
    const recurringBody = {
      space: spaceId,
      location: locationId,
      date: oneWeekFromTomorrow,
      startTime: '14:00',
      endTime: '15:00',
      recurringType: 'weekly',
      recurringEndDate: fiveWeeksFromTomorrow,
    };

    r = await request('POST', '/api/bookings', recurringBody, memberToken);
    assert(r.status === 201, 'Create recurring booking (member)', 201, r.status);
    if (r.status === 201) {
      recurringGroupId = r.body.recurringGroup ? r.body.recurringGroup._id : null;
      const arr = r.body.bookings;
      assert(
        Array.isArray(arr) && (arr.length === 5 || arr.length === 6),
        'Recurring booking — 5 or 6 occurrences',
        '5 or 6',
        Array.isArray(arr) ? arr.length : 'N/A'
      );
    } else {
      skip('Recurring booking — 5 or 6 occurrences', 'create recurring failed');
    }

    // Conflicting: same parameters → all dates are taken
    r = await request('POST', '/api/bookings', recurringBody, memberToken);
    assert(r.status === 409, 'Conflicting recurring booking → 409', 409, r.status);
    assert(
      r.status === 409 && Array.isArray(r.body.unavailableDates) && r.body.unavailableDates.length > 0,
      'Conflicting recurring — unavailableDates non-empty',
      'non-empty array',
      r.body.unavailableDates
    );
  }

  // ═══════════════════════════════════════════════════════
  // 6. CHECK-IN / CHECK-OUT
  // ═══════════════════════════════════════════════════════
  console.log('\n── 6. Check-in / Check-out ──');

  if (!memberToken || !spaceId || !locationId) {
    skip('Create early check-in test booking', 'missing required IDs');
    skip('Check-in too early (> 15 min before start → 400)', 'depends on early booking');
    skip('Check-in on bookingId', 'missing required IDs');
    skip('Check-out on bookingId', 'depends on check-in');
  } else {
    // Booking 2 days from now — always outside the 15-min check-in window
    r = await request('POST', '/api/bookings', {
      space: spaceId,
      location: locationId,
      date: dayAfterTomorrowStr,
      startTime: '10:00',
      endTime: '12:00',
      recurringType: 'none',
    }, memberToken);
    assert(r.status === 201, 'Create early check-in test booking', 201, r.status);
    if (r.status === 201 && r.body.booking) {
      earlyCheckInBookingId = r.body.booking._id || null;
    }

    if (earlyCheckInBookingId) {
      r = await request('PUT', `/api/bookings/${earlyCheckInBookingId}/checkin`, null, memberToken);
      assert(r.status === 400, 'Check-in too early (> 15 min before start → 400)', 400, r.status);
    } else {
      skip('Check-in too early (> 15 min before start → 400)', 'earlyCheckInBookingId not set');
    }

    // Main booking (tomorrow 10:00–12:00) — skip if outside window
    if (bookingId) {
      const windowStart = new Date(`${tomorrowStr}T09:45:00.000Z`);
      const windowEnd   = new Date(`${tomorrowStr}T12:00:00.000Z`);
      const nowCheck    = new Date();

      if (nowCheck < windowStart || nowCheck >= windowEnd) {
        skip(
          'Check-in on bookingId',
          `outside check-in window (opens ${windowStart.toISOString()}, closes ${windowEnd.toISOString()})`
        );
        skip('Check-out on bookingId', 'check-in was skipped');
      } else {
        r = await request('PUT', `/api/bookings/${bookingId}/checkin`, null, memberToken);
        assert(r.status === 200, 'Check-in on bookingId', 200, r.status);
        if (r.status === 200) {
          r = await request('PUT', `/api/bookings/${bookingId}/checkout`, null, memberToken);
          assert(r.status === 200, 'Check-out on bookingId', 200, r.status);
        } else {
          skip('Check-out on bookingId', 'check-in did not succeed');
        }
      }
    } else {
      skip('Check-in on bookingId', 'bookingId not set');
      skip('Check-out on bookingId', 'bookingId not set');
    }
  }

  // ═══════════════════════════════════════════════════════
  // 7. GUEST PASSES
  // ═══════════════════════════════════════════════════════
  console.log('\n── 7. Guest Passes ──');

  if (!memberToken || !bookingId) {
    const why = !memberToken ? 'no memberToken' : 'no bookingId';
    skip('Create guest pass (member)', why);
    skip('Duplicate guest pass for same booking → 409', why);
    skip('Get my guest passes (member)', why);
    skip('Get guest pass by id (member)', why);
    skip('Guest pass GET — token field absent', why);
    skip('Revoke guest pass (member)', why);
    skip("Revoked pass status === 'revoked'", why);
    skip('Revoke already-revoked pass → 400', why);
    skip('Create guest pass #2 (for guest registration)', why);
    skip('Register guest via token', why);
  } else {
    r = await request('POST', '/api/guest-passes', {
      bookingId,
      expiresAt: threeDaysFromNow,
    }, memberToken);
    assert(r.status === 201, 'Create guest pass (member)', 201, r.status);
    if (r.status === 201) {
      guestPassId    = r.body._id   || null;
      guestPassToken = r.body.token || null;
    }

    // Duplicate — same booking, active pass exists
    r = await request('POST', '/api/guest-passes', {
      bookingId,
      expiresAt: threeDaysFromNow,
    }, memberToken);
    assert(r.status === 409, 'Duplicate guest pass for same booking → 409', 409, r.status);

    r = await request('GET', '/api/guest-passes/my', null, memberToken);
    assert(r.status === 200 && Array.isArray(r.body), 'Get my guest passes (member)', '200 + array', `status:${r.status}`);

    if (guestPassId) {
      r = await request('GET', `/api/guest-passes/${guestPassId}`, null, memberToken);
      assert(r.status === 200, 'Get guest pass by id (member)', 200, r.status);
      assert(!('token' in r.body), 'Guest pass GET — token field absent', 'no token key', Object.keys(r.body));
    } else {
      skip('Get guest pass by id (member)', 'guestPassId not set');
      skip('Guest pass GET — token field absent', 'guestPassId not set');
    }

    // Revoke #1
    if (guestPassId) {
      r = await request('PUT', `/api/guest-passes/${guestPassId}/revoke`, null, memberToken);
      assert(r.status === 200, 'Revoke guest pass (member)', 200, r.status);
      assert(r.body.status === 'revoked', "Revoked pass status === 'revoked'", 'revoked', r.body.status);
    } else {
      skip('Revoke guest pass (member)', 'guestPassId not set');
      skip("Revoked pass status === 'revoked'", 'guestPassId not set');
    }

    // Revoke again — already revoked
    if (guestPassId) {
      r = await request('PUT', `/api/guest-passes/${guestPassId}/revoke`, null, memberToken);
      assert(r.status === 400, 'Revoke already-revoked pass → 400', 400, r.status);
    } else {
      skip('Revoke already-revoked pass → 400', 'guestPassId not set');
    }

    // Guest pass #2 — #1 is now revoked, so no active pass blocks creation
    r = await request('POST', '/api/guest-passes', {
      bookingId,
      expiresAt: threeDaysFromNow,
    }, memberToken);
    assert(r.status === 201, 'Create guest pass #2 (for guest registration)', 201, r.status);
    if (r.status === 201) {
      guestPassId2    = r.body._id   || null;
      guestPassToken2 = r.body.token || null;
    }

    if (guestPassToken2) {
      r = await request('POST', '/api/auth/register/guest', {
        name: `Guest ${RUN}`,
        email: `guest${RUN}@test.com`,
        password: 'Password123!',
        token: guestPassToken2,
      });
      assert(r.status === 201, 'Register guest via token', 201, r.status);
      guestToken = r.body.token || null;
    } else {
      skip('Register guest via token', 'guestPassToken2 not set');
    }
  }

  // ═══════════════════════════════════════════════════════
  // 8. BILLING
  // ═══════════════════════════════════════════════════════
  console.log('\n── 8. Billing ──');

  if (!memberToken) {
    skip('Get my billing (member) — non-empty', 'no memberToken');
    skip('Get all billing (admin)', 'no adminToken');
    skip('Get billing by id (member)', 'no memberToken');
    skip('Billing amount matches booking totalAmount', 'no memberToken');
    skip('Unauthorized get all billing (member → 403)', 'no memberToken');
  } else {
    r = await request('GET', '/api/billing/my', null, memberToken);
    if (bookingId) {
      assert(
        r.status === 200 && Array.isArray(r.body) && r.body.length > 0,
        'Get my billing (member) — non-empty',
        '200 + non-empty array',
        `status:${r.status}, length:${Array.isArray(r.body) ? r.body.length : 'N/A'}`
      );
    } else {
      assert(
        r.status === 200 && Array.isArray(r.body),
        'Get my billing (member)',
        '200 + array',
        `status:${r.status}`
      );
    }

    if (adminToken) {
      r = await request('GET', '/api/billing/all', null, adminToken);
      assert(r.status === 200 && Array.isArray(r.body), 'Get all billing (admin)', '200 + array', `status:${r.status}`);
    } else {
      skip('Get all billing (admin)', 'no adminToken');
    }

    if (billingId) {
      r = await request('GET', `/api/billing/${billingId}`, null, memberToken);
      assert(r.status === 200, 'Get billing by id (member)', 200, r.status);
      assert(
        r.body.amount === bookingTotalAmount,
        'Billing amount matches booking totalAmount',
        bookingTotalAmount,
        r.body.amount
      );
    } else {
      skip('Get billing by id (member)', 'billingId not set');
      skip('Billing amount matches booking totalAmount', 'billingId not set');
    }

    r = await request('GET', '/api/billing/all', null, memberToken);
    assert(r.status === 403, 'Unauthorized get all billing (member → 403)', 403, r.status);
  }

  // ═══════════════════════════════════════════════════════
  // 9. REVIEWS
  // ═══════════════════════════════════════════════════════
  console.log('\n── 9. Reviews ──');

  if (!memberToken || !spaceId) {
    const why = !memberToken ? 'no memberToken' : 'no spaceId';
    skip('Create review without completed booking (member → 403)', why);
    skip('Create review (admin)', why);
    skip('Duplicate review (admin same space → 409)', why);
    skip('Get space reviews', why);
    skip('Get space reviews — contains reviewId', why);
    skip('Get space for ratings check', why);
    skip('Space ratings updated (numReviews > 0, ratings > 0)', why);
    skip('Delete review (admin)', why);
    skip('Get space for ratings reset check', why);
    skip('Space numReviews reset to 0 after review delete', why);
  } else {
    // Member with no completed booking → 403
    r = await request('POST', '/api/reviews', {
      spaceId,
      rating: 4,
      comment: 'No completed booking',
    }, memberToken);
    assert(r.status === 403, 'Create review without completed booking (member → 403)', 403, r.status);

    if (!adminToken) {
      skip('Create review (admin)', 'no adminToken');
      skip('Duplicate review (admin same space → 409)', 'no adminToken');
    } else {
      r = await request('POST', '/api/reviews', {
        spaceId,
        rating: 5,
        comment: 'Test review',
      }, adminToken);
      assert(r.status === 201, 'Create review (admin)', 201, r.status);
      reviewId = r.body._id || null;

      r = await request('POST', '/api/reviews', {
        spaceId,
        rating: 3,
        comment: 'Duplicate attempt',
      }, adminToken);
      assert(r.status === 409, 'Duplicate review (admin same space → 409)', 409, r.status);
    }

    r = await request('GET', `/api/reviews/space/${spaceId}`, null, memberToken);
    assert(r.status === 200 && Array.isArray(r.body), 'Get space reviews', '200 + array', `status:${r.status}`);
    if (reviewId) {
      assert(
        r.body.some((rv) => rv._id === reviewId),
        'Get space reviews — contains reviewId',
        'array with reviewId',
        r.body.map((rv) => rv._id)
      );
    } else {
      skip('Get space reviews — contains reviewId', 'reviewId not set');
    }

    r = await request('GET', `/api/spaces/${spaceId}`, null, memberToken);
    assert(r.status === 200, 'Get space for ratings check', 200, r.status);
    if (reviewId) {
      assert(
        r.body.numReviews > 0 && r.body.ratings > 0,
        'Space ratings updated (numReviews > 0, ratings > 0)',
        'numReviews > 0 and ratings > 0',
        `numReviews:${r.body.numReviews}, ratings:${r.body.ratings}`
      );
    } else {
      skip('Space ratings updated (numReviews > 0, ratings > 0)', 'no reviewId');
    }

    if (reviewId && adminToken) {
      r = await request('DELETE', `/api/reviews/${reviewId}`, null, adminToken);
      assert(r.status === 200, 'Delete review (admin)', 200, r.status);

      r = await request('GET', `/api/spaces/${spaceId}`, null, memberToken);
      assert(r.status === 200, 'Get space for ratings reset check', 200, r.status);
      assert(r.body.numReviews === 0, 'Space numReviews reset to 0 after review delete', 0, r.body.numReviews);
    } else {
      skip('Delete review (admin)', !reviewId ? 'no reviewId' : 'no adminToken');
      skip('Get space for ratings reset check', 'depends on delete review');
      skip('Space numReviews reset to 0 after review delete', 'depends on delete review');
    }
  }

  // ═══════════════════════════════════════════════════════
  // 10. SOFT DELETES + CLEANUP
  // ═══════════════════════════════════════════════════════
  console.log('\n── 10. Soft Deletes ──');

  if (!adminToken) {
    skip('Delete space (admin)', 'no adminToken');
    skip('Get inactive space (member → 404)', 'no adminToken');
    skip('Get inactive space (admin → 200 + isActive:false)', 'no adminToken');
    skip('Delete location (admin)', 'no adminToken');
  } else if (!spaceId) {
    skip('Delete space (admin)', 'no spaceId');
    skip('Get inactive space (member → 404)', 'no spaceId');
    skip('Get inactive space (admin → 200 + isActive:false)', 'no spaceId');
    if (locationId) {
      r = await request('DELETE', `/api/locations/${locationId}`, null, adminToken);
      assert(
        r.status === 200 && r.body.isActive === false,
        'Delete location (admin) → isActive:false',
        '200 + isActive:false',
        `status:${r.status}, isActive:${r.body && r.body.isActive}`
      );
    } else {
      skip('Delete location (admin)', 'no locationId');
    }
  } else {
    r = await request('DELETE', `/api/spaces/${spaceId}`, null, adminToken);
    assert(
      r.status === 200 && r.body.isActive === false,
      'Delete space (admin) → isActive:false',
      '200 + isActive:false',
      `status:${r.status}, isActive:${r.body && r.body.isActive}`
    );

    // NOTE: getSpaceById has no isActive filter — member currently gets 200.
    // This assertion verifies expected behavior (404); it will fail until
    // the controller adds an isActive guard for non-admin roles.
    r = await request('GET', `/api/spaces/${spaceId}`, null, memberToken);
    assert(r.status === 404, 'Get inactive space (member → 404)', 404, r.status);

    r = await request('GET', `/api/spaces/${spaceId}`, null, adminToken);
    assert(
      r.status === 200 && r.body.isActive === false,
      'Get inactive space (admin → 200 + isActive:false)',
      '200 + isActive:false',
      `status:${r.status}, isActive:${r.body && r.body.isActive}`
    );

    if (locationId) {
      r = await request('DELETE', `/api/locations/${locationId}`, null, adminToken);
      assert(
        r.status === 200 && r.body.isActive === false,
        'Delete location (admin) → isActive:false',
        '200 + isActive:false',
        `status:${r.status}, isActive:${r.body && r.body.isActive}`
      );
    } else {
      skip('Delete location (admin)', 'no locationId');
    }
  }

  // ═══════════════════════════════════════════════════════
  // 11. RBAC SPOT CHECKS
  // ═══════════════════════════════════════════════════════
  console.log('\n── 11. RBAC Spot Checks ──');

  if (memberToken) {
    r = await request('POST', '/api/locations', { name: 'X', address: 'X', city: 'X' }, memberToken);
    assert(r.status === 403, 'RBAC: member POST /api/locations → 403', 403, r.status);

    r = await request('GET', '/api/bookings/all', null, memberToken);
    assert(r.status === 403, 'RBAC: member GET /api/bookings/all → 403', 403, r.status);

    r = await request('GET', '/api/billing/all', null, memberToken);
    assert(r.status === 403, 'RBAC: member GET /api/billing/all → 403', 403, r.status);
  } else {
    skip('RBAC: member POST /api/locations → 403', 'no memberToken');
    skip('RBAC: member GET /api/bookings/all → 403', 'no memberToken');
    skip('RBAC: member GET /api/billing/all → 403', 'no memberToken');
  }

  if (guestToken) {
    // guest lacks booking:create permission — 403 regardless of body validity
    r = await request('POST', '/api/bookings', {
      space: spaceId || '000000000000000000000000',
      location: locationId || '000000000000000000000000',
      date: tomorrowStr,
      startTime: '15:00',
      endTime: '16:00',
      recurringType: 'none',
    }, guestToken);
    assert(r.status === 403, 'RBAC: guest POST /api/bookings → 403', 403, r.status);
  } else {
    skip('RBAC: guest POST /api/bookings → 403', 'no guestToken (guest registration did not complete)');
  }

  if (managerToken && spaceId) {
    // location_manager lacks space:delete permission
    r = await request('DELETE', `/api/spaces/${spaceId}`, null, managerToken);
    assert(r.status === 403, 'RBAC: location_manager DELETE /api/spaces/:id → 403', 403, r.status);
  } else {
    skip('RBAC: location_manager DELETE /api/spaces/:id → 403', !managerToken ? 'no managerToken' : 'no spaceId');
  }

  // ═══════════════════════════════════════════════════════
  // SUMMARY
  // ═══════════════════════════════════════════════════════
  console.log('\n================================');
  console.log(`Total:   ${total}`);
  console.log(`Passed:  ${passed}`);
  console.log(`Failed:  ${failed}`);
  if (skipped > 0) console.log(`Skipped: ${skipped}`);
  console.log('================================');
  if (failures.length > 0) {
    console.log('\nFailed tests:');
    failures.forEach((name) => console.log(`  - ${name}`));
  }

  process.exit(failed > 0 ? 1 : 0);
}

run().catch((err) => {
  console.error('Unexpected error:', err);
  process.exit(1);
});
