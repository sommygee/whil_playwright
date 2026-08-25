import { test, expect, type APIRequestContext } from '@playwright/test';
import { getTestAccount } from './test-account';

const BASE_URL = 'https://whattodolagos-api.onrender.com';

test.describe('Profile API Tests', () => {
  test.describe.configure({ mode: 'serial' });

  async function getAuthToken(request: APIRequestContext): Promise<string> {
    const account = getTestAccount();
    test.skip(!account, 'A reusable test account is required');

    const response = await request.post(`${BASE_URL}/auth/login`, {
      data: {
        email: account!.email,
        password: account!.password,
      },
    });
    const body = await response.json();

    expect(response.status()).toBe(200);
    expect(body.token).toEqual(expect.any(String));
    return body.token;
  }

  test('01 - Get profile with valid token', async ({ request }) => {
    const token = await getAuthToken(request);
    const response = await request.get(`${BASE_URL}/profile`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const body = await response.json();

    expect(response.status()).toBe(200);
    expect(body).toEqual(expect.any(Object));
  });

  test('02 - Reject profile without token', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/profile`);
    const body = await response.json();

    expect([401, 403]).toContain(response.status());
    expect(body).toHaveProperty('message');
  });

  test('03 - Reject profile update without token', async ({ request }) => {
    const response = await request.put(`${BASE_URL}/profile/update-profile`, {
      data: {},
    });
    const body = await response.json();

    expect([400, 401, 403]).toContain(response.status());
    expect(body).toHaveProperty('message');
  });

  test('04 - Reject cover photo update without token', async ({ request }) => {
    const response = await request.put(`${BASE_URL}/profile/update-cover-photo`, {
      data: {},
    });
    const body = await response.json();

    expect([400, 401, 403]).toContain(response.status());
    expect(body).toHaveProperty('message');
  });

  test('05 - Reject password change without token', async ({ request }) => {
    const response = await request.put(`${BASE_URL}/profile/change-password`, {
      data: {},
    });
    const body = await response.json();

    expect([400, 401, 403]).toContain(response.status());
    expect(body).toHaveProperty('message');
  });

  test('06 - Reject account deletion without token', async ({ request }) => {
    const response = await request.put(`${BASE_URL}/profile/delete-account`);
    const body = await response.json();

    expect([400, 401, 403]).toContain(response.status());
    expect(body).toHaveProperty('message');
  });
});
