import { test, expect, APIRequestContext } from '@playwright/test';
import MailosaurClient from 'mailosaur';
import { getTestAccount, saveTestAccount } from './test-account';

const BASE_URL = 'https://whattodolagos-api.onrender.com';

const MAILOSAUR_API_KEY = process.env.MAILOSAUR_API_KEY;
const MAILOSAUR_SERVER_ID = process.env.MAILOSAUR_SERVER_ID;
const MAILOSAUR_SERVER_DOMAIN = process.env.MAILOSAUR_SERVER_DOMAIN;
const mailosaurConfigured =
  !!MAILOSAUR_API_KEY &&
  !!MAILOSAUR_SERVER_ID &&
  !!MAILOSAUR_SERVER_DOMAIN &&
  !MAILOSAUR_API_KEY.startsWith('your-') &&
  !MAILOSAUR_SERVER_ID.startsWith('your-') &&
  !MAILOSAUR_SERVER_DOMAIN.startsWith('your-');

const TEST_EMAIL = process.env.TEST_EMAIL ?? getTestAccount()?.email;
const TEST_PASSWORD = process.env.TEST_PASSWORD ?? getTestAccount()?.password;

async function createFreshTestAccount(
  request: APIRequestContext
): Promise<{ email: string; password: string }> {
  if (!mailosaurConfigured) {
    throw new Error(
      'MAILOSAUR_API_KEY, MAILOSAUR_SERVER_ID, and MAILOSAUR_SERVER_DOMAIN are required to create a valid test account.'
    );
  }

  const mailosaur = new MailosaurClient(MAILOSAUR_API_KEY!);
  const uniqueId = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
  const email = `qa_${uniqueId}@${MAILOSAUR_SERVER_DOMAIN}`;
  const password = `QaPassword!${uniqueId}`;
  const username = `qa_${uniqueId}`;

  const sendSignupOtpResponse = await request.post(
    `${BASE_URL}/auth/send-signup-otp`,
    {
      data: {
        email,
        firstname: 'QA',
        lastname: 'Tester',
      },
    }
  );

  const sendOtpBody = await sendSignupOtpResponse.json();
  expect(sendSignupOtpResponse.ok(), `Signup OTP request failed: ${JSON.stringify(sendOtpBody)}`).toBeTruthy();

  const message = await mailosaur.messages.get(
    MAILOSAUR_SERVER_ID!,
    { sentTo: email },
    { timeout: 30000 }
  );
  const messageText = message.text?.body || message.html?.body || '';
  const otp = messageText.match(/\b\d{4,8}\b/)?.[0];

  expect(otp, 'Mailosaur email should contain a numeric signup OTP').toBeTruthy();

  const verifyOtpResponse = await request.post(
    `${BASE_URL}/auth/verify-signup-otp`,
    {
      data: { email, otp },
    }
  );

  const verifyBody = await verifyOtpResponse.json();
  expect(verifyOtpResponse.ok(), `OTP verification failed: ${JSON.stringify(verifyBody)}`).toBeTruthy();

  const registerResponse = await request.post(
    `${BASE_URL}/auth/register`,
    {
      data: {
        email,
        password,
        firstname: 'QA',
        lastname: 'Tester',
        username,
        personalizedContent: [],
        favoriteAreas: [],
      },
    }
  );

  const registerBody = await registerResponse.json();
  expect(registerResponse.ok(), `Account registration failed: ${JSON.stringify(registerBody)}`).toBeTruthy();

  saveTestAccount({ email, password });
  return { email, password };
}

async function resolveCredentials(
  request: APIRequestContext
): Promise<{ email: string; password: string }> {
  const candidates = [
    { email: process.env.TEST_EMAIL, password: process.env.TEST_PASSWORD },
    getTestAccount(),
  ].filter(
    (candidate): candidate is { email: string; password: string } =>
      !!candidate && !!candidate.email && !!candidate.password
  );

  for (const candidate of candidates) {
    const response = await request.post(`${BASE_URL}/auth/login`, {
      data: {
        email: candidate.email,
        password: candidate.password,
      },
    });

    if (response.ok()) {
      return candidate;
    }
  }

  return createFreshTestAccount(request);
}

async function login(
  request: APIRequestContext
): Promise<string> {
  const { email, password } = await resolveCredentials(request);

  const response = await request.post(`${BASE_URL}/auth/login`, {
    data: {
      email,
      password,
    },
  });

  const body = await response.json();

  expect(
    response.status(),
    `Login failed. Response: ${JSON.stringify(body)}`
  ).toBe(200);

  expect(body).toHaveProperty('token');
  expect(typeof body.token).toBe('string');
  expect(body.token.length).toBeGreaterThan(0);

  return body.token;
}

function logResponse(
  endpoint: string,
  responseTime: number,
  status: number,
  body: unknown
) {
  console.log(`\n--- ${endpoint} ---`);
  console.log('Status:', status);
  console.log('Response time:', `${responseTime}ms`);
  console.log('Response:', body);
}

test.describe('Profile API Tests', () => {

  // ============================================================
  // GET /profile
  // ============================================================

  test('01 - Get authenticated profile', async ({ request }) => {
    const token = await login(request);

    const start = Date.now();

    const response = await request.get(`${BASE_URL}/profile`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const responseTime = Date.now() - start;
    const body = await response.json();

    logResponse(
      'GET /profile',
      responseTime,
      response.status(),
      body
    );

    expect(response.status()).toBe(200);
  });

  test('02 - Get profile without authentication', async ({ request }) => {
    const start = Date.now();

    const response = await request.get(`${BASE_URL}/profile`);

    const responseTime = Date.now() - start;
    const body = await response.json();

    logResponse(
      'GET /profile - No Auth',
      responseTime,
      response.status(),
      body
    );

    expect(response.ok()).toBeFalsy();
    expect([401, 403]).toContain(response.status());
  });

  test('03 - Get profile with invalid token', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/profile`, {
      headers: {
        Authorization: 'Bearer invalid-token',
      },
    });

    const body = await response.json();

    logResponse(
      'GET /profile - Invalid Token',
      0,
      response.status(),
      body
    );

    expect(response.ok()).toBeFalsy();
    expect([401, 403]).toContain(response.status());
  });

  // ============================================================
  // PUT /profile/update-profile
  // ============================================================

  test('04 - Update profile with empty body', async ({ request }) => {
    const token = await login(request);

    const start = Date.now();

    const response = await request.put(
      `${BASE_URL}/profile/update-profile`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        data: {},
      }
    );

    const responseTime = Date.now() - start;
    const body = await response.json();

    logResponse(
      'PUT /profile/update-profile',
      responseTime,
      response.status(),
      body
    );

    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(500);
  });

  test('05 - Update profile without authentication', async ({
    request,
  }) => {
    const response = await request.put(
      `${BASE_URL}/profile/update-profile`,
      {
        data: {},
      }
    );

    const body = await response.json();

    logResponse(
      'PUT /profile/update-profile - No Auth',
      0,
      response.status(),
      body
    );

    expect(response.ok()).toBeFalsy();
    expect([401, 403]).toContain(response.status());
  });

  // ============================================================
  // PUT /profile/update-cover-photo
  // ============================================================

  test('06 - Update cover photo with valid URL', async ({
    request,
  }) => {
    const token = await login(request);

    const start = Date.now();

    const response = await request.put(
      `${BASE_URL}/profile/update-cover-photo`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        data: {
          coverPhotoUrl: 'https://example.com/test-cover-photo.jpg',
        },
      }
    );

    const responseTime = Date.now() - start;
    const body = await response.json();

    logResponse(
      'PUT /profile/update-cover-photo',
      responseTime,
      response.status(),
      body
    );

    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(500);
  });

  test('07 - Update cover photo with missing URL', async ({
    request,
  }) => {
    const token = await login(request);

    const response = await request.put(
      `${BASE_URL}/profile/update-cover-photo`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        data: {},
      }
    );

    const body = await response.json();

    logResponse(
      'PUT /profile/update-cover-photo - Missing URL',
      0,
      response.status(),
      body
    );

    expect(response.status()).toBeGreaterThanOrEqual(400);
    expect(response.status()).toBeLessThan(500);
  });

  test('08 - Update cover photo without authentication', async ({
    request,
  }) => {
    const response = await request.put(
      `${BASE_URL}/profile/update-cover-photo`,
      {
        data: {
          coverPhotoUrl: 'https://example.com/test-cover-photo.jpg',
        },
      }
    );

    const body = await response.json();

    logResponse(
      'PUT /profile/update-cover-photo - No Auth',
      0,
      response.status(),
      body
    );

    expect(response.ok()).toBeFalsy();
    expect([401, 403]).toContain(response.status());
  });

  // ============================================================
  // PUT /profile/change-password
  // ============================================================

  test('09 - Change password with invalid old password', async ({
    request,
  }) => {
    const token = await login(request);

    const response = await request.put(
      `${BASE_URL}/profile/change-password`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        data: {
          oldPassword: 'DefinitelyWrongPassword123!',
          newPassword: 'NewTestPassword123!',
        },
      }
    );

    const body = await response.json();

    logResponse(
      'PUT /profile/change-password - Wrong Old Password',
      0,
      response.status(),
      body
    );

    expect(response.ok()).toBeFalsy();
    expect([400, 401, 403, 422]).toContain(response.status());
  });

  test('10 - Change password with missing old password', async ({
    request,
  }) => {
    const token = await login(request);

    const response = await request.put(
      `${BASE_URL}/profile/change-password`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        data: {
          newPassword: 'NewTestPassword123!',
        },
      }
    );

    const body = await response.json();

    logResponse(
      'PUT /profile/change-password - Missing Old Password',
      0,
      response.status(),
      body
    );

    expect(response.ok()).toBeFalsy();
    expect([400, 422]).toContain(response.status());
  });

  test('11 - Change password with missing new password', async ({
    request,
  }) => {
    const token = await login(request);

    const response = await request.put(
      `${BASE_URL}/profile/change-password`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        data: {
          oldPassword: TEST_PASSWORD,
        },
      }
    );

    const body = await response.json();

    logResponse(
      'PUT /profile/change-password - Missing New Password',
      0,
      response.status(),
      body
    );

    expect(response.ok()).toBeFalsy();
    expect([400, 422]).toContain(response.status());
  });

  test('12 - Change password without authentication', async ({
    request,
  }) => {
    const response = await request.put(
      `${BASE_URL}/profile/change-password`,
      {
        data: {
          oldPassword: 'OldPassword123!',
          newPassword: 'NewPassword123!',
        },
      }
    );

    const body = await response.json();

    logResponse(
      'PUT /profile/change-password - No Auth',
      0,
      response.status(),
      body
    );

    expect(response.ok()).toBeFalsy();
    expect([401, 403]).toContain(response.status());
  });

  // ============================================================
  // GET /profile/settings/notifications
  // ============================================================

  test('13 - Get notification settings', async ({ request }) => {
    const token = await login(request);

    const start = Date.now();

    const response = await request.get(
      `${BASE_URL}/profile/settings/notifications`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const responseTime = Date.now() - start;
    const body = await response.json();

    logResponse(
      'GET /profile/settings/notifications',
      responseTime,
      response.status(),
      body
    );

    expect(response.status()).toBe(200);
  });

  test('14 - Get notification settings without authentication', async ({
    request,
  }) => {
    const response = await request.get(
      `${BASE_URL}/profile/settings/notifications`
    );

    const body = await response.json();

    logResponse(
      'GET /profile/settings/notifications - No Auth',
      0,
      response.status(),
      body
    );

    expect(response.ok()).toBeFalsy();
    expect([401, 403]).toContain(response.status());
  });

  // ============================================================
  // PUT /profile/settings/notifications
  // ============================================================

  test('15 - Update notification settings with empty body', async ({
    request,
  }) => {
    const token = await login(request);

    const response = await request.put(
      `${BASE_URL}/profile/settings/notifications`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        data: {},
      }
    );

    const body = await response.json();

    logResponse(
      'PUT /profile/settings/notifications',
      0,
      response.status(),
      body
    );

    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(500);
  });

  test('16 - Update notification settings without authentication', async ({
    request,
  }) => {
    const response = await request.put(
      `${BASE_URL}/profile/settings/notifications`,
      {
        data: {},
      }
    );

    const body = await response.json();

    logResponse(
      'PUT /profile/settings/notifications - No Auth',
      0,
      response.status(),
      body
    );

    expect(response.ok()).toBeFalsy();
    expect([401, 403]).toContain(response.status());
  });

  // ============================================================
  // PUT /profile/review/{reviewId}
  // ============================================================

  test('17 - Update review with valid review ID', async ({
    request,
  }) => {
    const token = await login(request);

    /*
     * Replace this with a real review ID belonging to TEST_EMAIL.
     * The reviewId is a PATH PARAMETER, not a request-body parameter.
     */
    const reviewId = process.env.TEST_REVIEW_ID;

    if (!reviewId) {
      test.skip(
        'TEST_REVIEW_ID must be configured for the update review test.'
      );
    }

    const response = await request.put(
      `${BASE_URL}/profile/review/${reviewId}`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        data: {},
      }
    );

    const body = await response.json();

    logResponse(
      'PUT /profile/review/{reviewId}',
      0,
      response.status(),
      body
    );

    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(500);
  });

  test('18 - Update review without authentication', async ({
    request,
  }) => {
    const response = await request.put(
      `${BASE_URL}/profile/review/invalid-review-id`
    );

    const body = await response.json();

    logResponse(
      'PUT /profile/review/{reviewId} - No Auth',
      0,
      response.status(),
      body
    );

    expect(response.ok()).toBeFalsy();
    expect([401, 403]).toContain(response.status());
  });

  // ============================================================
  // DELETE /profile/review/{reviewId}
  // ============================================================

  test('19 - Delete review with invalid review ID', async ({
    request,
  }) => {
    const token = await login(request);

    const response = await request.delete(
      `${BASE_URL}/profile/review/invalid-review-id`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const body = await response.json();

    logResponse(
      'DELETE /profile/review/{reviewId} - Invalid ID',
      0,
      response.status(),
      body
    );

    expect(response.ok()).toBeFalsy();
    expect([400, 404, 422]).toContain(response.status());
  });

  test('20 - Delete review without authentication', async ({
    request,
  }) => {
    const response = await request.delete(
      `${BASE_URL}/profile/review/invalid-review-id`
    );

    const body = await response.json();

    logResponse(
      'DELETE /profile/review/{reviewId} - No Auth',
      0,
      response.status(),
      body
    );

    expect(response.ok()).toBeFalsy();
    expect([401, 403]).toContain(response.status());
  });

  // ============================================================
  // GET /profile/inbox
  // ============================================================

  test('21 - Get profile inbox', async ({ request }) => {
    const token = await login(request);

    const start = Date.now();

    const response = await request.get(`${BASE_URL}/profile/inbox`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const responseTime = Date.now() - start;
    const body = await response.json();

    logResponse(
      'GET /profile/inbox',
      responseTime,
      response.status(),
      body
    );

    expect(response.status()).toBe(200);
  });

  test('22 - Get profile inbox without authentication', async ({
    request,
  }) => {
    const response = await request.get(`${BASE_URL}/profile/inbox`);

    const body = await response.json();

    logResponse(
      'GET /profile/inbox - No Auth',
      0,
      response.status(),
      body
    );

    expect(response.ok()).toBeFalsy();
    expect([401, 403]).toContain(response.status());
  });

  // ============================================================
  // PUT /profile/inbox/read
  // ============================================================

  test('23 - Mark inbox messages as read', async ({ request }) => {
    const token = await login(request);

    const response = await request.put(
      `${BASE_URL}/profile/inbox/read`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const body = await response.json();

    logResponse(
      'PUT /profile/inbox/read',
      0,
      response.status(),
      body
    );

    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(500);
  });

  test('24 - Mark inbox messages as read without authentication', async ({
    request,
  }) => {
    const response = await request.put(
      `${BASE_URL}/profile/inbox/read`
    );

    const body = await response.json();

    logResponse(
      'PUT /profile/inbox/read - No Auth',
      0,
      response.status(),
      body
    );

    expect(response.ok()).toBeFalsy();
    expect([401, 403]).toContain(response.status());
  });

  // ============================================================
  // PUT /profile/delete-account
  //
  // IMPORTANT:
  // This test MUST remain last because it deletes TEST_EMAIL.
  // ============================================================

  test('25 - Delete account', async ({ request }) => {
    const token = await login(request);

    const response = await request.put(
      `${BASE_URL}/profile/delete-account`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    const body = await response.json();

    logResponse(
      'PUT /profile/delete-account',
      0,
      response.status(),
      body
    );

    expect(response.status()).toBeGreaterThanOrEqual(200);
    expect(response.status()).toBeLessThan(500);
  });

  test('26 - Delete account without authentication', async ({
    request,
  }) => {
    const response = await request.put(
      `${BASE_URL}/profile/delete-account`
    );

    const body = await response.json();

    logResponse(
      'PUT /profile/delete-account - No Auth',
      0,
      response.status(),
      body
    );

    expect(response.ok()).toBeFalsy();
    expect([401, 403]).toContain(response.status());
  });
});