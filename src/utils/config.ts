/**
 * Configuration management from environment variables
 */

import { config as loadEnv } from 'dotenv';

loadEnv();

export interface Config {
  // Server
  port: number;
  baseUrl: string;

  // MCP Authentication
  authToken: string;

  // GitHub OAuth (for Claude Desktop)
  githubClientId?: string;
  githubClientSecret?: string;

  // GHL OAuth
  ghlClientId: string;
  ghlClientSecret: string;
  ghlRedirectUri?: string;

  // Session
  sessionTimeout: number; // in milliseconds

  // Logging
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

function getRequiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}

function getOptionalEnv(key: string, defaultValue: string = ''): string {
  return process.env[key] || defaultValue;
}

export const config: Config = {
  port: parseInt(getOptionalEnv('PORT', '3006'), 10),
  baseUrl: getOptionalEnv('BASE_URL', 'http://localhost:3006'),

  authToken: getRequiredEnv('AUTH_TOKEN'),

  githubClientId: getOptionalEnv('GITHUB_CLIENT_ID'),
  githubClientSecret: getOptionalEnv('GITHUB_CLIENT_SECRET'),

  ghlClientId: getRequiredEnv('GHL_CLIENT_ID'),
  ghlClientSecret: getRequiredEnv('GHL_CLIENT_SECRET'),
  ghlRedirectUri: getOptionalEnv('GHL_REDIRECT_URI'),

  sessionTimeout: 30 * 60 * 1000, // 30 minutes

  logLevel: (getOptionalEnv('LOG_LEVEL', 'info') as Config['logLevel']),
};
