import fs from 'fs';
import path from 'path';

export type TestAccount = {
  email: string;
  password: string;
};

const accountFile = path.resolve(__dirname, '../../.auth/test-account.json');

function isPlaceholder(value: string | undefined): boolean {
  return !value || value.startsWith('your-') || value.startsWith('real-');
}

export function getTestAccount(): TestAccount | undefined {
  const configuredEmail = process.env.TEST_EMAIL;
  const configuredPassword = process.env.TEST_PASSWORD;

  if (!isPlaceholder(configuredEmail) && !isPlaceholder(configuredPassword)) {
    return { email: configuredEmail!, password: configuredPassword! };
  }

  if (!fs.existsSync(accountFile)) {
    return undefined;
  }

  try {
    const account = JSON.parse(fs.readFileSync(accountFile, 'utf8')) as TestAccount;
    if (account.email && account.password) {
      return account;
    }
  } catch {
    return undefined;
  }

  return undefined;
}

export function saveTestAccount(account: TestAccount): void {
  fs.mkdirSync(path.dirname(accountFile), { recursive: true });
  fs.writeFileSync(accountFile, `${JSON.stringify(account, null, 2)}\n`, 'utf8');
}
