import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import type { 
  MCPOAuthStorage,
  OAuthClient,
  OAuthUser,
  AuthorizationCode,
  AccessToken,
  RefreshToken
} from 'mcpresso-oauth-server';

export class SQLiteStorage implements MCPOAuthStorage {
  private db: Database | null = null;

  constructor(private dbPath: string) {}

  async initialize(): Promise<void> {
    this.db = await open({
      filename: this.dbPath,
      driver: sqlite3.Database
    });

    // Create tables
    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS oauth_clients (
        id TEXT PRIMARY KEY,
        secret TEXT NOT NULL,
        name TEXT NOT NULL,
        type TEXT NOT NULL,
        redirect_uris TEXT NOT NULL,
        scopes TEXT NOT NULL,
        grant_types TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS oauth_users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        hashed_password TEXT,
        scopes TEXT NOT NULL,
        profile TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS oauth_authorization_codes (
        code TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        redirect_uri TEXT NOT NULL,
        scope TEXT NOT NULL,
        resource TEXT,
        code_challenge TEXT,
        code_challenge_method TEXT,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS oauth_access_tokens (
        access_token TEXT PRIMARY KEY,
        client_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        scope TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await this.db.exec(`
      CREATE TABLE IF NOT EXISTS oauth_refresh_tokens (
        refresh_token TEXT PRIMARY KEY,
        access_token_id TEXT NOT NULL,
        client_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        scope TEXT NOT NULL,
        expires_at DATETIME NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create indexes
    await this.db.exec('CREATE INDEX IF NOT EXISTS idx_oauth_clients_id ON oauth_clients(id)');
    await this.db.exec('CREATE INDEX IF NOT EXISTS idx_oauth_users_id ON oauth_users(id)');
    await this.db.exec('CREATE INDEX IF NOT EXISTS idx_oauth_users_username ON oauth_users(username)');
    await this.db.exec('CREATE INDEX IF NOT EXISTS idx_oauth_authorization_codes_code ON oauth_authorization_codes(code)');
    await this.db.exec('CREATE INDEX IF NOT EXISTS idx_oauth_access_tokens_token ON oauth_access_tokens(access_token)');
    await this.db.exec('CREATE INDEX IF NOT EXISTS idx_oauth_refresh_tokens_token ON oauth_refresh_tokens(refresh_token)');
  }

  // ===== CLIENT MANAGEMENT =====

  async createClient(client: OAuthClient): Promise<void> {
    await this.db!.run(`
      INSERT OR REPLACE INTO oauth_clients 
      (id, secret, name, type, redirect_uris, scopes, grant_types, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      client.id,
      client.secret,
      client.name,
      client.type,
      JSON.stringify(client.redirectUris),
      JSON.stringify(client.scopes),
      JSON.stringify(client.grantTypes)
    ]);
  }

  async getClient(clientId: string): Promise<OAuthClient | null> {
    const row = await this.db!.get('SELECT * FROM oauth_clients WHERE id = ?', [clientId]);
    if (!row) return null;

    return {
      id: row.id,
      secret: row.secret,
      name: row.name,
      type: row.type,
      redirectUris: JSON.parse(row.redirect_uris),
      scopes: JSON.parse(row.scopes),
      grantTypes: JSON.parse(row.grant_types),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  async listClients(): Promise<OAuthClient[]> {
    const rows = await this.db!.all('SELECT * FROM oauth_clients ORDER BY created_at DESC');
    
    return rows.map(row => ({
      id: row.id,
      secret: row.secret,
      name: row.name,
      type: row.type,
      redirectUris: JSON.parse(row.redirect_uris),
      scopes: JSON.parse(row.scopes),
      grantTypes: JSON.parse(row.grant_types),
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
  }

  async updateClient(clientId: string, updates: Partial<OAuthClient>): Promise<void> {
    const fields = [];
    const values = [];

    if (updates.secret !== undefined) {
      fields.push('secret = ?');
      values.push(updates.secret);
    }
    if (updates.name !== undefined) {
      fields.push('name = ?');
      values.push(updates.name);
    }
    if (updates.type !== undefined) {
      fields.push('type = ?');
      values.push(updates.type);
    }
    if (updates.redirectUris !== undefined) {
      fields.push('redirect_uris = ?');
      values.push(JSON.stringify(updates.redirectUris));
    }
    if (updates.scopes !== undefined) {
      fields.push('scopes = ?');
      values.push(JSON.stringify(updates.scopes));
    }
    if (updates.grantTypes !== undefined) {
      fields.push('grant_types = ?');
      values.push(JSON.stringify(updates.grantTypes));
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(clientId);

    const query = `UPDATE oauth_clients SET ${fields.join(', ')} WHERE id = ?`;
    await this.db!.run(query, values);
  }

  async deleteClient(clientId: string): Promise<void> {
    await this.db!.run('DELETE FROM oauth_clients WHERE id = ?', [clientId]);
  }

  // ===== USER MANAGEMENT =====

  async createUser(user: OAuthUser): Promise<void> {
    await this.db!.run(`
      INSERT OR REPLACE INTO oauth_users 
      (id, username, email, hashed_password, scopes, profile, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    `, [
      user.id,
      user.username,
      user.email,
      user.hashedPassword,
      JSON.stringify(user.scopes),
      user.profile ? JSON.stringify(user.profile) : null
    ]);
  }

  async getUser(userId: string): Promise<OAuthUser | null> {
    const row = await this.db!.get('SELECT * FROM oauth_users WHERE id = ?', [userId]);
    if (!row) return null;

    return {
      id: row.id,
      username: row.username,
      email: row.email,
      hashedPassword: row.hashed_password,
      scopes: JSON.parse(row.scopes),
      profile: row.profile ? JSON.parse(row.profile) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  async getUserByUsername(username: string): Promise<OAuthUser | null> {
    const row = await this.db!.get('SELECT * FROM oauth_users WHERE username = ?', [username]);
    if (!row) return null;

    return {
      id: row.id,
      username: row.username,
      email: row.email,
      hashedPassword: row.hashed_password,
      scopes: JSON.parse(row.scopes),
      profile: row.profile ? JSON.parse(row.profile) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    };
  }

  async listUsers(): Promise<OAuthUser[]> {
    const rows = await this.db!.all('SELECT * FROM oauth_users ORDER BY created_at DESC');
    
    return rows.map(row => ({
      id: row.id,
      username: row.username,
      email: row.email,
      hashedPassword: row.hashed_password,
      scopes: JSON.parse(row.scopes),
      profile: row.profile ? JSON.parse(row.profile) : null,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at)
    }));
  }

  async updateUser(userId: string, updates: Partial<OAuthUser>): Promise<void> {
    const fields = [];
    const values = [];

    if (updates.username !== undefined) {
      fields.push('username = ?');
      values.push(updates.username);
    }
    if (updates.email !== undefined) {
      fields.push('email = ?');
      values.push(updates.email);
    }
    if (updates.hashedPassword !== undefined) {
      fields.push('hashed_password = ?');
      values.push(updates.hashedPassword);
    }
    if (updates.scopes !== undefined) {
      fields.push('scopes = ?');
      values.push(JSON.stringify(updates.scopes));
    }
    if (updates.profile !== undefined) {
      fields.push('profile = ?');
      values.push(updates.profile ? JSON.stringify(updates.profile) : null);
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');
    values.push(userId);

    const query = `UPDATE oauth_users SET ${fields.join(', ')} WHERE id = ?`;
    await this.db!.run(query, values);
  }

  async deleteUser(userId: string): Promise<void> {
    await this.db!.run('DELETE FROM oauth_users WHERE id = ?', [userId]);
  }

  // ===== AUTHORIZATION CODES =====

  async createAuthorizationCode(code: AuthorizationCode): Promise<void> {
    await this.db!.run(`
      INSERT INTO oauth_authorization_codes 
      (code, client_id, user_id, redirect_uri, scope, resource, code_challenge, code_challenge_method, expires_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      code.code,
      code.clientId,
      code.userId,
      code.redirectUri,
      JSON.stringify(code.scope),
      code.resource,
      code.codeChallenge,
      code.codeChallengeMethod,
      code.expiresAt.toISOString()
    ]);
  }

  async getAuthorizationCode(code: string): Promise<AuthorizationCode | null> {
    const row = await this.db!.get(
      'SELECT * FROM oauth_authorization_codes WHERE code = ? AND expires_at > datetime("now")',
      [code]
    );
    if (!row) return null;

    return {
      code: row.code,
      clientId: row.client_id,
      userId: row.user_id,
      redirectUri: row.redirect_uri,
      scope: JSON.parse(row.scope),
      resource: row.resource,
      codeChallenge: row.code_challenge,
      codeChallengeMethod: row.code_challenge_method,
      expiresAt: new Date(row.expires_at),
      createdAt: new Date(row.created_at)
    };
  }

  async deleteAuthorizationCode(code: string): Promise<void> {
    await this.db!.run('DELETE FROM oauth_authorization_codes WHERE code = ?', [code]);
  }

  async cleanupExpiredCodes(): Promise<void> {
    await this.db!.run('DELETE FROM oauth_authorization_codes WHERE expires_at <= datetime("now")');
  }

  // ===== ACCESS TOKENS =====

  async createAccessToken(token: AccessToken): Promise<void> {
    await this.db!.run(`
      INSERT INTO oauth_access_tokens 
      (access_token, client_id, user_id, scope, expires_at)
      VALUES (?, ?, ?, ?, ?)
    `, [
      token.token,
      token.clientId,
      token.userId,
      JSON.stringify(token.scope),
      token.expiresAt.toISOString()
    ]);
  }

  async getAccessToken(token: string): Promise<AccessToken | null> {
    const row = await this.db!.get(
      'SELECT * FROM oauth_access_tokens WHERE access_token = ? AND expires_at > datetime("now")',
      [token]
    );
    if (!row) return null;

    return {
      token: row.access_token,
      clientId: row.client_id,
      userId: row.user_id,
      scope: JSON.parse(row.scope),
      expiresAt: new Date(row.expires_at),
      createdAt: new Date(row.created_at)
    };
  }

  async deleteAccessToken(token: string): Promise<void> {
    await this.db!.run('DELETE FROM oauth_access_tokens WHERE access_token = ?', [token]);
  }

  async cleanupExpiredTokens(): Promise<void> {
    await this.db!.run('DELETE FROM oauth_access_tokens WHERE expires_at <= datetime("now")');
  }

  // ===== REFRESH TOKENS =====

  async createRefreshToken(token: RefreshToken): Promise<void> {
    await this.db!.run(`
      INSERT INTO oauth_refresh_tokens 
      (refresh_token, access_token_id, client_id, user_id, scope, expires_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `, [
      token.token,
      token.accessTokenId,
      token.clientId,
      token.userId,
      JSON.stringify(token.scope),
      token.expiresAt.toISOString()
    ]);
  }

  async getRefreshToken(token: string): Promise<RefreshToken | null> {
    const row = await this.db!.get(
      'SELECT * FROM oauth_refresh_tokens WHERE refresh_token = ? AND expires_at > datetime("now")',
      [token]
    );
    if (!row) return null;

    return {
      token: row.refresh_token,
      accessTokenId: row.access_token_id,
      clientId: row.client_id,
      userId: row.user_id,
      scope: JSON.parse(row.scope),
      expiresAt: new Date(row.expires_at),
      createdAt: new Date(row.created_at)
    };
  }

  async deleteRefreshToken(token: string): Promise<void> {
    await this.db!.run('DELETE FROM oauth_refresh_tokens WHERE refresh_token = ?', [token]);
  }

  async deleteRefreshTokensByAccessToken(accessTokenId: string): Promise<void> {
    await this.db!.run('DELETE FROM oauth_refresh_tokens WHERE access_token_id = ?', [accessTokenId]);
  }

  async cleanupExpiredRefreshTokens(): Promise<void> {
    await this.db!.run('DELETE FROM oauth_refresh_tokens WHERE expires_at <= datetime("now")');
  }

  // ===== UTILITY METHODS =====

  getStats(): { clients: number; users: number; authorizationCodes: number; accessTokens: number; refreshTokens: number } {
    // Note: This is a synchronous method that returns cached stats
    // For real-time stats, you would need to implement a separate async method
    return {
      clients: 0, // Would need to be implemented with caching
      users: 0,
      authorizationCodes: 0,
      accessTokens: 0,
      refreshTokens: 0
    };
  }

  async close(): Promise<void> {
    if (this.db) {
      await this.db.close();
    }
  }
} 