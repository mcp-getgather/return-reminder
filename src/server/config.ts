import dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

export interface Settings {
  NODE_ENV: string;
  GETGATHER_URL: string;
  GETGATHER_API_KEY: string;
  MAXMIND_ACCOUNT_ID: string;
  MAXMIND_LICENSE_KEY: string;
}

export const settings: Settings = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  GETGATHER_URL: process.env.GETGATHER_URL || '',
  GETGATHER_API_KEY: process.env.GETGATHER_API_KEY || '',
  MAXMIND_ACCOUNT_ID: process.env.MAXMIND_ACCOUNT_ID || '',
  MAXMIND_LICENSE_KEY: process.env.MAXMIND_LICENSE_KEY || '',
};
