import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export interface Settings {
  NODE_ENV: string;
  GETGATHER_URL: string;
  MAXMIND_ACCOUNT_ID: string;
  MAXMIND_LICENSE_KEY: string;
  SENTRY_DSN: string;
}

export const settings: Settings = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  GETGATHER_URL: process.env.GETGATHER_URL || 'http://127.0.0.1:23456',
  MAXMIND_ACCOUNT_ID: process.env.MAXMIND_ACCOUNT_ID || '',
  MAXMIND_LICENSE_KEY: process.env.MAXMIND_LICENSE_KEY || '',
  SENTRY_DSN: process.env.SENTRY_DSN || '',
};
