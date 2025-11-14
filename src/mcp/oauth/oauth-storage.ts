/**
 * OAuth Storage using SQLite
 * Stores OAuth clients, authorization codes, and access tokens
 */

import Database from 'better-sqlite3';
import { logger } from '../../utils/logger.js';
import path from 'path';
import fs from 'fs';

export interface OAuthClient {
  client_id: string;
  client_secret?: string;
  redirect_uris: string[];
  client_name?: string;
  [key: string]: any;
}

export interface OAuthCodeData {
  code?: string | undefined;
  clientId: string;
  redirectUri: string;
  scopes?: string | undefined;
  resource?: string | undefined;
  state?: string | undefined;
  codeChallenge: string;
  codeChallengeMethod?: string | undefined;
  createdAt?: number | undefined;
  expiresAt: number;
}

export interface OAuthTokenData {
  token?: string | undefined;
  clientId: string;
  scopes: string;
  expiresAt: number;
  resource?: string | undefined;
  createdAt?: number | undefined;
}

export class OAuthStorage {
  private db: Database.Database;

  constructor(dbPath?: string) {
    const storagePath = dbPath || path.join(process.cwd(), 'data', 'oauth.db');

    // Create data directory if it doesn't exist
    const dataDir = path.dirname(storagePath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    this.db = new Database(storagePath);
    this.initSchema();
    logger.info('OAuth storage initialized', { path: storagePath });
  }

  private initSchema(): void {
    this.db.exec(`
      CREATE TABLE IF NOT EXISTS oauth_clients (
        client_id TEXT PRIMARY KEY,
        client_data TEXT NOT NULL,
        created_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS oauth_codes (
        code TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        redirect_uri TEXT NOT NULL,
        scopes TEXT,
        resource TEXT,
        state TEXT,
        code_challenge TEXT NOT NULL,
        code_challenge_method TEXT,
        created_at INTEGER NOT NULL,
        expires_at INTEGER NOT NULL
      );

      CREATE TABLE IF NOT EXISTS oauth_tokens (
        token TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        scopes TEXT NOT NULL,
        expires_at INTEGER NOT NULL,
        resource TEXT,
        created_at INTEGER NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_codes_expires ON oauth_codes(expires_at);
      CREATE INDEX IF NOT EXISTS idx_tokens_expires ON oauth_tokens(expires_at);
    `);

    this.cleanupExpired();
  }

  private cleanupExpired(): void {
    const now = Date.now();
    const deletedCodes = this.db.prepare('DELETE FROM oauth_codes WHERE expires_at < ?').run(now);
    const deletedTokens = this.db.prepare('DELETE FROM oauth_tokens WHERE expires_at < ?').run(now);

    if (deletedCodes.changes > 0 || deletedTokens.changes > 0) {
      logger.info('Cleaned up expired OAuth data', {
        codes: deletedCodes.changes,
        tokens: deletedTokens.changes
      });
    }
  }

  async getClient(clientId: string): Promise<OAuthClient | undefined> {
    const row = this.db.prepare('SELECT client_data FROM oauth_clients WHERE client_id = ?').get(clientId) as { client_data: string } | undefined;
    return row ? JSON.parse(row.client_data) : undefined;
  }

  async registerClient(client: OAuthClient): Promise<OAuthClient> {
    this.db.prepare('INSERT OR REPLACE INTO oauth_clients (client_id, client_data, created_at) VALUES (?, ?, ?)')
      .run(client.client_id, JSON.stringify(client), Date.now());

    logger.info('OAuth client registered', { clientId: client.client_id });
    return client;
  }

  saveCode(code: string, data: OAuthCodeData): void {
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO oauth_codes (code, client_id, redirect_uri, scopes, resource, state, code_challenge, code_challenge_method, created_at, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      code,
      data.clientId,
      data.redirectUri,
      data.scopes,
      data.resource,
      data.state,
      data.codeChallenge,
      data.codeChallengeMethod,
      now,
      data.expiresAt
    );
  }

  getCode(code: string): OAuthCodeData | undefined {
    const row = this.db.prepare('SELECT * FROM oauth_codes WHERE code = ? AND expires_at > ?')
      .get(code, Date.now()) as any;

    if (!row) return undefined;

    return {
      code: row.code,
      clientId: row.client_id,
      redirectUri: row.redirect_uri,
      scopes: row.scopes,
      resource: row.resource,
      state: row.state,
      codeChallenge: row.code_challenge,
      codeChallengeMethod: row.code_challenge_method,
      createdAt: row.created_at,
      expiresAt: row.expires_at
    };
  }

  deleteCode(code: string): void {
    this.db.prepare('DELETE FROM oauth_codes WHERE code = ?').run(code);
  }

  saveToken(token: string, data: OAuthTokenData): void {
    const now = Date.now();
    this.db.prepare(`
      INSERT INTO oauth_tokens (token, client_id, scopes, expires_at, resource, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      token,
      data.clientId,
      data.scopes,
      data.expiresAt,
      data.resource,
      now
    );
  }

  getToken(token: string): OAuthTokenData | undefined {
    const row = this.db.prepare('SELECT * FROM oauth_tokens WHERE token = ? AND expires_at > ?')
      .get(token, Date.now()) as any;

    if (!row) return undefined;

    return {
      token: row.token,
      clientId: row.client_id,
      scopes: row.scopes,
      expiresAt: row.expires_at,
      resource: row.resource,
      createdAt: row.created_at
    };
  }

  deleteToken(token: string): void {
    this.db.prepare('DELETE FROM oauth_tokens WHERE token = ?').run(token);
  }

  cleanupExpiredTokens(): number {
    const result = this.db.prepare('DELETE FROM oauth_tokens WHERE expires_at < ?').run(Date.now());
    return result.changes;
  }

  cleanupExpiredCodes(): number {
    const result = this.db.prepare('DELETE FROM oauth_codes WHERE expires_at < ?').run(Date.now());
    return result.changes;
  }

  close(): void {
    this.db.close();
  }
}
