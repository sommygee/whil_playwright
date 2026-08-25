import { test, expect } from '@playwright/test';
import MailosaurClient from 'mailosaur';
import { getTestAccount, saveTestAccount } from './test-account';

const BASE_URL = 'https://whattodolagos-api.onrender.com';

const MAILOSAUR_API_KEY = process.env.MAILOSAUR_API_KEY;
const MAILOSAUR_SERVER_ID = process.env.MAILOSAUR_SERVER_ID;
const MAILOSAUR_SERVER_DOMAIN = process.env.MAILOSAUR_SERVER_DOMAIN;
const mailosaurConfigured =
  MAILOSAUR_API_KEY &&
  MAILOSAUR_SERVER_ID &&
  MAILOSAUR_SERVER_DOMAIN &&
  !MAILOSAUR_API_KEY.startsWith('your-') &&
  !MAILOSAUR_SERVER_ID.startsWith('your-') &&
  !MAILOSAUR_SERVER_DOMAIN.startsWith('your-');

test.describe('Authentication API Tests', () => {
  test.describe.configure({ mode: 'serial' });
  /*
   * ============================================================
   * 01 - CHECK EMAIL
   * ============================================================
   */

  test('01 - Check email availability', async ({ request }) => {
    const email = `qa_${Date.now()}@example.com`;

    const start = Date.now();

    const response = await request.get(`${BASE_URL}/auth/check-email`, {
      params: {
        email,
      },
    });

    const responseTime = Date.now() - start;
    const body = await response.json();

    console.log('\n--- Check Email ---');
    console.log('Status:', response.status());
    console.log('Response time:', `${responseTime}ms`);
    console.log('Response:', body);

    expect(response.ok()).toBeTruthy();
    expect(body).toHaveProperty('isTaken');
    expect(typeof body.isTaken).toBe('boolean');
  });

  test('02 - Check email with invalid email format', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/auth/check-email`, {
      params: {
        email: 'invalid-email',
      },
    });

    const body = await response.json();

    console.log('\n--- Invalid Email Check ---');
    console.log('Status:', response.status());
    console.log('Response:', body);

    expect(response.ok()).toBeTruthy();
    expect(response.status()).toBe(200);
    expect(body).toHaveProperty('isTaken', false);
  });

  test('03 - Check email without email parameter', async ({ request }) => {
    const response = await request.get(`${BASE_URL}/auth/check-email`);

    const body = await response.json();

    console.log('\n--- Missing Email ---');
    console.log('Status:', response.status());
    console.log('Response:', body);

    expect(response.ok()).toBeFalsy();
    expect([400, 422]).toContain(response.status());
  });

  /*
   * ============================================================
   * 02 - SEND SIGNUP OTP
   * ============================================================
   */

  test('04 - Send signup OTP with valid data', async ({ request }) => {
    const email = `qa_${Date.now()}@example.com`;

    const start = Date.now();

    const response = await request.post(
      `${BASE_URL}/auth/send-signup-otp`,
      {
        data: {
          email,
          firstname: 'QA',
          lastname: 'Tester',
        },
      }
    );

    const responseTime = Date.now() - start;
    const body = await response.json();

    console.log('\n--- Send Signup OTP ---');
    console.log('Status:', response.status());
    console.log('Response time:', `${responseTime}ms`);
    console.log('Response:', body);

    expect(response.ok()).toBeTruthy();
  });

  test('05 - Send signup OTP with invalid email', async ({ request }) => {
    const response = await request.post(
      `${BASE_URL}/auth/send-signup-otp`,
      {
        data: {
          email: 'invalid-email',
          firstname: 'QA',
          lastname: 'Tester',
        },
      }
    );

    const body = await response.json();

    console.log('\n--- Invalid Signup OTP Email ---');
    console.log('Status:', response.status());
    console.log('Response:', body);

    expect(response.ok()).toBeFalsy();
    expect([400, 422]).toContain(response.status());
  });

  test('06 - Send signup OTP with missing first name', async ({ request }) => {
    const response = await request.post(
      `${BASE_URL}/auth/send-signup-otp`,
      {
        data: {
          email: `qa_${Date.now()}@example.com`,
          lastname: 'Tester',
        },
      }
    );

    const body = await response.json();

    console.log('\n--- Missing First Name ---');
    console.log('Status:', response.status());
    console.log('Response:', body);

    expect(response.ok()).toBeFalsy();
    expect([400, 422]).toContain(response.status());
  });

  test('07 - Send signup OTP with missing last name', async ({ request }) => {
    const response = await request.post(
      `${BASE_URL}/auth/send-signup-otp`,
      {
        data: {
          email: `qa_${Date.now()}@example.com`,
          firstname: 'QA',
        },
      }
    );

    const body = await response.json();

    console.log('\n--- Missing Last Name ---');
    console.log('Status:', response.status());
    console.log('Response:', body);

    expect(response.ok()).toBeFalsy();
    expect([400, 422]).toContain(response.status());
  });

  /*
   * ============================================================
   * 03 - VERIFY SIGNUP OTP
   * ============================================================
   */

  test('08 - Verify signup OTP with invalid OTP', async ({ request }) => {
    const response = await request.post(
      `${BASE_URL}/auth/verify-signup-otp`,
      {
        data: {
          email: `qa_${Date.now()}@example.com`,
          otp: 'INVALIDOTP',
        },
      }
    );

    const body = await response.json();

    console.log('\n--- Invalid Signup OTP ---');
    console.log('Status:', response.status());
    console.log('Response:', body);

    expect(response.ok()).toBeFalsy();
    expect([400, 401, 404, 422]).toContain(response.status());
  });

  test('09 - Verify signup OTP with missing OTP', async ({ request }) => {
    const response = await request.post(
      `${BASE_URL}/auth/verify-signup-otp`,
      {
        data: {
          email: `qa_${Date.now()}@example.com`,
        },
      }
    );

    const body = await response.json();

    console.log('\n--- Missing Signup OTP ---');
    console.log('Status:', response.status());
    console.log('Response:', body);

    expect(response.ok()).toBeFalsy();
    expect([400, 422]).toContain(response.status());
  });

  /*
   * ============================================================
   * 04 - REGISTER
   * ============================================================
   */

  test('10 - Register with missing required fields', async ({ request }) => {
    const response = await request.post(
      `${BASE_URL}/auth/register`,
      {
        data: {},
      }
    );

    const body = await response.json();

    console.log('\n--- Register Missing Fields ---');
    console.log('Status:', response.status());
    console.log('Response:', body);

    expect(response.ok()).toBeFalsy();
    expect([400, 422]).toContain(response.status());
  });

  test('11 - Register with invalid email', async ({ request }) => {
    const response = await request.post(
      `${BASE_URL}/auth/register`,
      {
        data: {
          email: 'invalid-email',
          password: 'TestPassword123!',
          firstname: 'QA',
          lastname: 'Tester',
          username: `qa_${Date.now()}`,
          personalizedContent: [],
          favoriteAreas: [],
        },
      }
    );

    const body = await response.json();

    console.log('\n--- Register Invalid Email ---');
    console.log('Status:', response.status());
    console.log('Response:', body);

    expect(response.ok()).toBeFalsy();
    expect([400, 422]).toContain(response.status());
  });

  test('12 - Register with missing password', async ({ request }) => {
    const response = await request.post(
      `${BASE_URL}/auth/register`,
      {
        data: {
          email: `qa_${Date.now()}@example.com`,
          firstname: 'QA',
          lastname: 'Tester',
          username: `qa_${Date.now()}`,
          personalizedContent: [],
          favoriteAreas: [],
        },
      }
    );

    const body = await response.json();

    console.log('\n--- Register Missing Password ---');
    console.log('Status:', response.status());
    console.log('Response:', body);

    expect(response.ok()).toBeFalsy();
    expect([400, 422]).toContain(response.status());
  });

  test('Register new account with Mailosaur OTP', async ({ request }) => {
    test.skip(
      !!getTestAccount(),
      'A reusable test account already exists; registration is skipped'
    );
    test.skip(
      !mailosaurConfigured,
      'MAILOSAUR_API_KEY, MAILOSAUR_SERVER_ID, and MAILOSAUR_SERVER_DOMAIN are required'
    );

    const mailosaur = new MailosaurClient(MAILOSAUR_API_KEY!);
    const uniqueId = `${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    const email = `qa_${uniqueId}@${MAILOSAUR_SERVER_DOMAIN}`;
    const password = `QaPassword!${uniqueId}`;
    const username = `qa_${uniqueId}`;

    const signupResponse = await request.post(
      `${BASE_URL}/auth/send-signup-otp`,
      {
        data: {
          email,
          firstname: 'QA',
          lastname: 'Tester',
        },
      }
    );

    expect(signupResponse.ok()).toBeTruthy();

    const message = await mailosaur.messages.get(MAILOSAUR_SERVER_ID!, {
      sentTo: email,
    }, {
      timeout: 30000,
    });
    const messageText = message.text?.body || message.html?.body || '';
    const otp = messageText.match(/\b\d{4,8}\b/)?.[0];

    expect(otp, 'Mailosaur email should contain a numeric signup OTP').toBeTruthy();

    const verifyResponse = await request.post(
      `${BASE_URL}/auth/verify-signup-otp`,
      {
        data: { email, otp },
      }
    );

    expect(verifyResponse.ok()).toBeTruthy();

    let registerResponse;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        registerResponse = await request.post(
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
        break;
      } catch (error) {
        if (attempt === 3) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    expect(registerResponse!.ok()).toBeTruthy();

    const loginResponse = await request.post(
      `${BASE_URL}/auth/login`,
      { data: { email, password } }
    );
    const loginBody = await loginResponse.json();

    expect(loginResponse.status()).toBe(200);
    expect(loginBody).toHaveProperty('user');
    expect(loginBody).toHaveProperty('token');

    saveTestAccount({ email, password });
  });

  /*
   * ============================================================
   * 05 - LOGIN
   * ============================================================
   */

  test('13 - Login with valid credentials', async ({ request }) => {
    const account = getTestAccount();
    test.skip(!account, 'A reusable test account is required');

    const start = Date.now();

    const response = await request.post(
      `${BASE_URL}/auth/login`,
      {
        data: {
          email: account!.email,
          password: account!.password,
        },
      }
    );

    const responseTime = Date.now() - start;
    const body = await response.json();

    console.log('\n--- Valid Login ---');
    console.log('Status:', response.status());
    console.log('Response time:', `${responseTime}ms`);
    console.log('Response:', body);

    expect(response.status()).toBe(200);

    expect(body).toHaveProperty('user');
    expect(body).toHaveProperty('token');

    expect(typeof body.token).toBe('string');
    expect(body.token.length).toBeGreaterThan(0);
  });

  test('14 - Login with incorrect password', async ({ request }) => {
    const account = getTestAccount();
    test.skip(!account, 'A reusable test account is required');

    const response = await request.post(
      `${BASE_URL}/auth/login`,
      {
        data: {
          email: account!.email,
          password: 'WrongPassword123!',
        },
      }
    );

    const body = await response.json();

    console.log('\n--- Incorrect Password ---');
    console.log('Status:', response.status());
    console.log('Response:', body);

    expect(response.ok()).toBeFalsy();
    expect([400, 401, 403]).toContain(response.status());
  });

  test('15 - Login with non-existent email', async ({ request }) => {
    const response = await request.post(
      `${BASE_URL}/auth/login`,
      {
        data: {
          email: `nonexistent_${Date.now()}@example.com`,
          password: 'TestPassword123!',
        },
      }
    );

    const body = await response.json();

    console.log('\n--- Non-existent User ---');
    console.log('Status:', response.status());
    console.log('Response:', body);

    expect(response.ok()).toBeFalsy();
    expect([400, 401, 404]).toContain(response.status());
  });

  test('16 - Login with missing email', async ({ request }) => {
    const response = await request.post(
      `${BASE_URL}/auth/login`,
      {
        data: {
          password: 'TestPassword123!',
        },
      }
    );

    const body = await response.json();

    console.log('\n--- Login Missing Email ---');
    console.log('Status:', response.status());
    console.log('Response:', body);

    expect(response.ok()).toBeFalsy();
    expect([400, 401, 422]).toContain(response.status());
  });

  test('17 - Login with missing password', async ({ request }) => {
    const account = getTestAccount();
    const response = await request.post(
      `${BASE_URL}/auth/login`,
      {
        data: {
          email: account?.email || 'test@example.com',
        },
      }
    );

    const body = await response.json();

    console.log('\n--- Login Missing Password ---');
    console.log('Status:', response.status());
    console.log('Response:', body);

    expect(response.ok()).toBeFalsy();
    expect([400, 401, 422]).toContain(response.status());
  });

  /*
   * ============================================================
   * 06 - VERIFY ACCOUNT
   * ============================================================
   */

  test('18 - Verify account with invalid token', async ({ request }) => {
    const response = await request.get(
      `${BASE_URL}/auth/verify`,
      {
        params: {
          token: 'invalid-token',
        },
      }
    );

    const body = await response.text();

    console.log('\n--- Invalid Verification Token ---');
    console.log('Status:', response.status());
    console.log('Response:', body);

    expect(response.ok()).toBeFalsy();
    expect([400, 401, 404, 422]).toContain(response.status());
  });

  /*
   * ============================================================
   * 07 - FORGOT PASSWORD
   * ============================================================
   */

  test('19 - Forgot password with invalid email', async ({ request }) => {
    const response = await request.post(
      `${BASE_URL}/auth/forgot-password`,
      {
        data: {
          email: 'invalid-email',
        },
      }
    );

    const body = await response.json();

    console.log('\n--- Forgot Password Invalid Email ---');
    console.log('Status:', response.status());
    console.log('Response:', body);

    expect(response.ok()).toBeFalsy();
    expect([400, 404, 422]).toContain(response.status());
  });

  test('20 - Forgot password with missing email', async ({ request }) => {
    const response = await request.post(
      `${BASE_URL}/auth/forgot-password`,
      {
        data: {},
      }
    );

    const body = await response.json();

    console.log('\n--- Forgot Password Missing Email ---');
    console.log('Status:', response.status());
    console.log('Response:', body);

    expect(response.ok()).toBeFalsy();
    expect([400, 404, 422]).toContain(response.status());
  });

  /*
   * ============================================================
   * 08 - VERIFY RESET TOKEN
   * ============================================================
   */

  test('21 - Verify reset token with invalid token', async ({ request }) => {
    const response = await request.post(
      `${BASE_URL}/auth/verify-reset-token`,
      {
        data: {
          token: 'invalid-reset-token',
        },
      }
    );

    const body = await response.json();

    console.log('\n--- Invalid Reset Token ---');
    console.log('Status:', response.status());
    console.log('Response:', body);

    expect(response.ok()).toBeFalsy();
    expect([400, 401, 404, 422]).toContain(response.status());
  });

  /*
   * ============================================================
   * 09 - RESET PASSWORD
   * ============================================================
   */

  test('22 - Reset password with invalid token', async ({ request }) => {
    const response = await request.post(
      `${BASE_URL}/auth/reset-password`,
      {
        data: {
          token: 'invalid-reset-token',
          password: 'NewPassword123!',
        },
      }
    );

    const body = await response.json();

    console.log('\n--- Invalid Reset Password Token ---');
    console.log('Status:', response.status());
    console.log('Response:', body);

    expect(response.ok()).toBeFalsy();
    expect([400, 401, 404, 422]).toContain(response.status());
  });

  /*
   * ============================================================
   * 10 - GOOGLE AUTH
   * ============================================================
   */

  test('23 - Google authentication with invalid token', async ({ request }) => {
    const response = await request.post(
      `${BASE_URL}/auth/google`,
      {
        data: {
          token: 'invalid-google-token',
        },
      }
    );

    const body = await response.json();

    console.log('\n--- Invalid Google Token ---');
    console.log('Status:', response.status());
    console.log('Response:', body);

    expect(response.ok()).toBeFalsy();
    expect([400, 401, 403, 422]).toContain(response.status());
  });
});