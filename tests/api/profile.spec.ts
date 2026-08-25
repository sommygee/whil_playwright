import { test, expect, type APIRequestContext } from '@playwright/test';
import { getTestAccount } from './test-account';

const BASE_URL = 'https://whattodolagos-api.onrender.com';

test.describe('Profile API Tests', () => {
  async function getAuthToken(request: APIRequestContext): Promise<string> {
    const account = getTestAccount();
    test.skip(!account, 'A reusable test account is required');

    const response = await request.post(`${BASE_URL}/auth/login`, {
      data: { email: account!.email, password: account!.password },
    });
    const body = await response.json();

    expect(response.status()).toBe(200);
    expect(body.token).toEqual(expect.any(String));
    return body.token;
  }

  function authHeaders(token: string) {
    return { Authorization: `Bearer ${token}` };
  }

  test('01 - Get authenticated user profile', async ({ request }) => {
    const token = await getAuthToken(request);
    const response = await request.get(`${BASE_URL}/profile`, {
      headers: authHeaders(token),
    });
    const body = await response.json();

    expect(response.status()).toBe(200);
    expect(body).toEqual(expect.any(Object));
  });

  test('02 - Get notification settings', async ({ request }) => {
    const token = await getAuthToken(request);
    const response = await request.get(`${BASE_URL}/profile/settings/notifications`, {
      headers: authHeaders(token),
    });
    const body = await response.json();

    expect([200, 404]).toContain(response.status());
    expect(body).toEqual(expect.any(Object));
  });

  test('03 - Get profile inbox', async ({ request }) => {
    const token = await getAuthToken(request);
    const response = await request.get(`${BASE_URL}/profile/inbox`, {
      headers: authHeaders(token),
    });
    const body = await response.json();

    expect(response.status()).toBe(200);
    expect(body).toEqual(expect.anything());
  });

  test('04 - Validate profile update with authenticated request', async ({ request }) => {
    const token = await getAuthToken(request);
    const response = await request.put(`${BASE_URL}/profile/update-profile`, {
      headers: authHeaders(token),
      data: {},
    });
    const body = await response.json();

    expect([200, 400]).toContain(response.status());
    expect(body).toEqual(expect.any(Object));
  });

  test('05 - Validate cover photo update fields', async ({ request }) => {
    const token = await getAuthToken(request);
    const response = await request.put(`${BASE_URL}/profile/update-cover-photo`, {
      headers: authHeaders(token),
      data: {},
    });
    const body = await response.json();

    expect(response.status()).toBe(400);
    expect(body).toHaveProperty('message');
  });

  test('06 - Validate password change fields', async ({ request }) => {
    const token = await getAuthToken(request);
    const response = await request.put(`${BASE_URL}/profile/change-password`, {
      headers: authHeaders(token),
      data: {},
    });
    const body = await response.json();

    expect(response.status()).toBe(400);
    expect(body).toHaveProperty('message');
  });

  test('07 - Validate notification update with authenticated request', async ({ request }) => {
    const token = await getAuthToken(request);
    const response = await request.put(`${BASE_URL}/profile/settings/notifications`, {
      headers: authHeaders(token),
      data: {},
    });
    const body = await response.json();

    expect([200, 400]).toContain(response.status());
    expect(body).toEqual(expect.any(Object));
  });

  test('08 - Validate inbox read update with authenticated request', async ({ request }) => {
    const token = await getAuthToken(request);
    const response = await request.put(`${BASE_URL}/profile/inbox/read`, {
      headers: authHeaders(token),
      data: {},
    });
    const body = await response.json();

    expect([200, 400]).toContain(response.status());
    expect(body).toEqual(expect.any(Object));
  });

  test('09 - Reject review update for an unknown review', async ({ request }) => {
    const token = await getAuthToken(request);
    const response = await request.put(`${BASE_URL}/profile/review/invalid-review-id`, {
      headers: authHeaders(token),
      data: {},
    });
    const body = await response.json();

    expect([400, 404]).toContain(response.status());
    expect(body).toHaveProperty('message');
  });

  test('10 - Reject review deletion for an unknown review', async ({ request }) => {
    const token = await getAuthToken(request);
    const response = await request.delete(`${BASE_URL}/profile/review/invalid-review-id`, {
      headers: authHeaders(token),
    });
    const body = await response.json();

    expect([400, 404]).toContain(response.status());
    expect(body).toHaveProperty('message');
  });

  test('11 - Reject profile update without token', async ({ request }) => {
    const response = await request.put(`${BASE_URL}/profile/update-profile`, {
      data: {},
    });
    expect([401, 403]).toContain(response.status());
  });

  test('12 - Reject cover photo update without token', async ({ request }) => {
    const response = await request.put(`${BASE_URL}/profile/update-cover-photo`, {
      data: { coverPhotoUrl: 'https://example.com/cover.jpg' },
    });
    expect([401, 403]).toContain(response.status());
  });

  test('13 - Reject password change without token', async ({ request }) => {
    const response = await request.put(`${BASE_URL}/profile/change-password`, {
      data: { oldPassword: 'old-password', newPassword: 'new-password' },
    });
    expect([401, 403]).toContain(response.status());
  });

  test('14 - Reject notification update without token', async ({ request }) => {
    const response = await request.put(`${BASE_URL}/profile/settings/notifications`, {
      data: {},
    });
    expect([401, 403]).toContain(response.status());
  });

  test('15 - Reject account deletion without token', async ({ request }) => {
    const response = await request.put(`${BASE_URL}/profile/delete-account`);
    expect([401, 403]).toContain(response.status());
  });

  test('16 - Reject review update without token', async ({ request }) => {
    const response = await request.put(`${BASE_URL}/profile/review/invalid-review-id`, {
      data: {},
    });
    expect([401, 403]).toContain(response.status());
  });

  test('17 - Reject review deletion without token', async ({ request }) => {
    const response = await request.delete(`${BASE_URL}/profile/review/invalid-review-id`);
    expect([401, 403]).toContain(response.status());
  });

  test('18 - Reject inbox read update without token', async ({ request }) => {
    const response = await request.put(`${BASE_URL}/profile/inbox/read`, {
      data: {},
    });
    expect([401, 403]).toContain(response.status());
  });
});
