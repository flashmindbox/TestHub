/**
 * Database Snapshot/Restore Utility
 *
 * Provides database snapshot and restore capabilities for test isolation.
 * Supports PostgreSQL (primary) and SQLite databases.
 *
 * @module utils/db-snapshot
 */

import { execSync, exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';

const execAsync = promisify(exec);

// =============================================================================
// TYPES
// =============================================================================

/**
 * Database type enumeration
 */
export type DatabaseType = 'postgresql' | 'sqlite' | 'unknown';

/**
 * Database connection configuration
 */
export interface DbConnectionConfig {
  type: DatabaseType;
  url: string;
  host?: string;
  port?: number;
  database?: string;
  username?: string;
  password?: string;
  /** Path to SQLite file (if applicable) */
  filePath?: string;
}

/**
 * Snapshot metadata
 */
export interface SnapshotMetadata {
  name: string;
  createdAt: Date;
  databaseType: DatabaseType;
  size: number;
  path: string;
}

/**
 * DbSnapshot options
 */
export interface DbSnapshotOptions {
  /** Directory to store snapshots */
  snapshotDir?: string;
  /** StudyTab project root path */
  studyTabRoot?: string;
  /** Custom DATABASE_URL (overrides auto-detection) */
  databaseUrl?: string;
  /** Verbose logging */
  verbose?: boolean;
}

// =============================================================================
// CONNECTION PARSER
// =============================================================================

/**
 * Parse DATABASE_URL into connection config
 */
export function parseConnectionUrl(url: string): DbConnectionConfig {
  // SQLite detection
  if (url.startsWith('file:') || url.endsWith('.db') || url.endsWith('.sqlite')) {
    const filePath = url.replace('file:', '').split('?')[0];
    return {
      type: 'sqlite',
      url,
      filePath,
    };
  }

  // PostgreSQL detection
  if (url.startsWith('postgresql://') || url.startsWith('postgres://')) {
    try {
      const parsed = new URL(url);
      return {
        type: 'postgresql',
        url,
        host: parsed.hostname,
        port: parseInt(parsed.port) || 5432,
        database: parsed.pathname.slice(1).split('?')[0],
        username: parsed.username,
        password: parsed.password,
      };
    } catch {
      return { type: 'postgresql', url };
    }
  }

  return { type: 'unknown', url };
}

/**
 * Detect DATABASE_URL from StudyTab environment
 */
export function detectDatabaseUrl(studyTabRoot: string): string | null {
  // Priority order for .env files
  const envPaths = [
    path.join(studyTabRoot, 'packages', 'database', '.env'),
    path.join(studyTabRoot, 'apps', 'api-elysia', '.env'),
    path.join(studyTabRoot, '.env'),
  ];

  for (const envPath of envPaths) {
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      const match = content.match(/DATABASE_URL=["']?([^"'\n]+)["']?/);
      if (match) {
        return match[1];
      }
    }
  }

  return null;
}

// =============================================================================
// SNAPSHOT STRATEGIES
// =============================================================================

/**
 * Base interface for snapshot strategies
 */
interface SnapshotStrategy {
  snapshot(name: string, outputPath: string): Promise<void>;
  restore(name: string, snapshotPath: string): Promise<void>;
  reset(): Promise<void>;
}

/**
 * PostgreSQL snapshot strategy using pg_dump/pg_restore
 */
class PostgresSnapshotStrategy implements SnapshotStrategy {
  constructor(
    private config: DbConnectionConfig,
    private verbose: boolean = false
  ) {}

  private getEnv(): NodeJS.ProcessEnv {
    return {
      ...process.env,
      PGPASSWORD: this.config.password || '',
    };
  }

  private log(message: string): void {
    if (this.verbose) {
      console.log(`[PostgreSQL] ${message}`);
    }
  }

  async snapshot(name: string, outputPath: string): Promise<void> {
    const { host, port, database, username } = this.config;

    this.log(`Creating snapshot '${name}' of database '${database}'...`);

    const cmd = [
      'pg_dump',
      `-h ${host}`,
      `-p ${port}`,
      `-U ${username}`,
      `-d ${database}`,
      '--format=custom',
      '--clean',
      '--if-exists',
      `--file="${outputPath}"`,
    ].join(' ');

    try {
      await execAsync(cmd, { env: this.getEnv() });
      this.log(`Snapshot saved to ${outputPath}`);
    } catch (error) {
      const err = error as Error & { stderr?: string };
      throw new Error(`Failed to create PostgreSQL snapshot: ${err.stderr || err.message}`);
    }
  }

  async restore(name: string, snapshotPath: string): Promise<void> {
    const { host, port, database, username } = this.config;

    this.log(`Restoring snapshot '${name}' to database '${database}'...`);

    const cmd = [
      'pg_restore',
      `-h ${host}`,
      `-p ${port}`,
      `-U ${username}`,
      `-d ${database}`,
      '--clean',
      '--if-exists',
      '--no-owner',
      '--no-privileges',
      `"${snapshotPath}"`,
    ].join(' ');

    try {
      await execAsync(cmd, { env: this.getEnv() });
      this.log(`Snapshot '${name}' restored successfully`);
    } catch (error) {
      const err = error as Error & { stderr?: string };
      // pg_restore may return non-zero even on success with warnings
      if (err.stderr && !err.stderr.includes('ERROR')) {
        this.log(`Snapshot restored with warnings`);
        return;
      }
      throw new Error(`Failed to restore PostgreSQL snapshot: ${err.stderr || err.message}`);
    }
  }

  async reset(): Promise<void> {
    const { host, port, database, username } = this.config;

    this.log(`Resetting database '${database}'...`);

    // Drop and recreate all tables using psql
    const dropCmd = [
      'psql',
      `-h ${host}`,
      `-p ${port}`,
      `-U ${username}`,
      `-d ${database}`,
      `-c "DROP SCHEMA public CASCADE; CREATE SCHEMA public;"`,
    ].join(' ');

    try {
      await execAsync(dropCmd, { env: this.getEnv() });
      this.log('Database reset successfully');
    } catch (error) {
      const err = error as Error & { stderr?: string };
      throw new Error(`Failed to reset database: ${err.stderr || err.message}`);
    }
  }
}

/**
 * SQLite snapshot strategy using file copy
 */
class SqliteSnapshotStrategy implements SnapshotStrategy {
  constructor(
    private config: DbConnectionConfig,
    private verbose: boolean = false
  ) {}

  private log(message: string): void {
    if (this.verbose) {
      console.log(`[SQLite] ${message}`);
    }
  }

  async snapshot(name: string, outputPath: string): Promise<void> {
    const { filePath } = this.config;

    if (!filePath || !fs.existsSync(filePath)) {
      throw new Error(`SQLite database file not found: ${filePath}`);
    }

    this.log(`Creating snapshot '${name}' of ${filePath}...`);

    try {
      fs.copyFileSync(filePath, outputPath);
      this.log(`Snapshot saved to ${outputPath}`);
    } catch (error) {
      throw new Error(`Failed to create SQLite snapshot: ${(error as Error).message}`);
    }
  }

  async restore(name: string, snapshotPath: string): Promise<void> {
    const { filePath } = this.config;

    if (!filePath) {
      throw new Error('SQLite database file path not configured');
    }

    if (!fs.existsSync(snapshotPath)) {
      throw new Error(`Snapshot file not found: ${snapshotPath}`);
    }

    this.log(`Restoring snapshot '${name}' to ${filePath}...`);

    try {
      fs.copyFileSync(snapshotPath, filePath);
      this.log(`Snapshot '${name}' restored successfully`);
    } catch (error) {
      throw new Error(`Failed to restore SQLite snapshot: ${(error as Error).message}`);
    }
  }

  async reset(): Promise<void> {
    const { filePath } = this.config;

    if (!filePath) {
      throw new Error('SQLite database file path not configured');
    }

    this.log(`Resetting database ${filePath}...`);

    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
      // Create empty file
      fs.writeFileSync(filePath, '');
      this.log('Database reset successfully');
    } catch (error) {
      throw new Error(`Failed to reset database: ${(error as Error).message}`);
    }
  }
}

/**
 * Generic Prisma-based strategy (fallback)
 */
class PrismaSnapshotStrategy implements SnapshotStrategy {
  constructor(
    private studyTabRoot: string,
    private verbose: boolean = false
  ) {}

  private log(message: string): void {
    if (this.verbose) {
      console.log(`[Prisma] ${message}`);
    }
  }

  private get databasePackagePath(): string {
    return path.join(this.studyTabRoot, 'packages', 'database');
  }

  async snapshot(name: string, outputPath: string): Promise<void> {
    this.log(`Creating Prisma-based snapshot '${name}'...`);

    // For Prisma, we'll create a SQL dump using prisma migrate diff
    const cmd = `npx prisma migrate diff --from-empty --to-schema-datamodel prisma/schema.prisma --script > "${outputPath}"`;

    try {
      await execAsync(cmd, { cwd: this.databasePackagePath });
      this.log(`Schema snapshot saved to ${outputPath}`);
    } catch (error) {
      // Fall back to simpler approach - just note that data will be lost
      this.log('Warning: Prisma snapshot only captures schema, not data');
      fs.writeFileSync(outputPath, `-- Snapshot: ${name}\n-- Created: ${new Date().toISOString()}\n-- Note: Prisma snapshots only preserve schema structure`);
    }
  }

  async restore(name: string, snapshotPath: string): Promise<void> {
    this.log(`Restoring via Prisma db push...`);

    // Reset and re-push schema
    const cmd = 'npx prisma db push --force-reset --accept-data-loss';

    try {
      await execAsync(cmd, { cwd: this.databasePackagePath });
      this.log('Schema restored successfully');
    } catch (error) {
      const err = error as Error & { stderr?: string };
      throw new Error(`Failed to restore via Prisma: ${err.stderr || err.message}`);
    }
  }

  async reset(): Promise<void> {
    this.log('Resetting database via Prisma...');

    const cmd = 'npx prisma db push --force-reset --accept-data-loss';

    try {
      await execAsync(cmd, { cwd: this.databasePackagePath });
      this.log('Database reset successfully');
    } catch (error) {
      const err = error as Error & { stderr?: string };
      throw new Error(`Failed to reset via Prisma: ${err.stderr || err.message}`);
    }
  }
}

// =============================================================================
// DB SNAPSHOT CLASS
// =============================================================================

/**
 * Database Snapshot Manager
 *
 * Provides snapshot and restore capabilities for test isolation.
 *
 * @example
 * ```typescript
 * const db = new DbSnapshot({
 *   studyTabRoot: 'C:/MyProjects/studytab',
 *   snapshotDir: './snapshots',
 * });
 *
 * // Take a snapshot before tests
 * await db.snapshot('before-tests');
 *
 * // Run tests...
 *
 * // Restore after tests
 * await db.restore('before-tests');
 *
 * // Or reset to empty state
 * await db.reset();
 * ```
 */
export class DbSnapshot {
  private config: DbConnectionConfig;
  private strategy: SnapshotStrategy;
  private snapshotDir: string;
  private verbose: boolean;
  private studyTabRoot: string;

  constructor(options: DbSnapshotOptions = {}) {
    this.verbose = options.verbose ?? false;
    this.studyTabRoot = options.studyTabRoot ?? this.detectStudyTabRoot();
    this.snapshotDir = options.snapshotDir ?? path.join(process.cwd(), '.snapshots');

    // Ensure snapshot directory exists
    if (!fs.existsSync(this.snapshotDir)) {
      fs.mkdirSync(this.snapshotDir, { recursive: true });
    }

    // Get database URL
    const databaseUrl = options.databaseUrl ?? detectDatabaseUrl(this.studyTabRoot);

    if (!databaseUrl) {
      throw new Error(
        'DATABASE_URL not found. Please provide databaseUrl option or ensure StudyTab .env is configured.'
      );
    }

    this.config = parseConnectionUrl(databaseUrl);
    this.strategy = this.createStrategy();

    this.log(`Initialized with ${this.config.type} database`);
  }

  private log(message: string): void {
    if (this.verbose) {
      console.log(`[DbSnapshot] ${message}`);
    }
  }

  private detectStudyTabRoot(): string {
    // Try common locations
    const candidates = [
      path.join(process.cwd(), '..', 'studytab'),
      path.join(process.cwd(), '..', 'StudyTab'),
      'C:/MyProjects/studytab',
      'C:/MyProjects/StudyTab',
      path.join(process.env.HOME || '', 'projects', 'studytab'),
    ];

    for (const candidate of candidates) {
      if (fs.existsSync(path.join(candidate, 'packages', 'database'))) {
        return candidate;
      }
    }

    throw new Error(
      'Could not detect StudyTab root. Please provide studyTabRoot option.'
    );
  }

  private createStrategy(): SnapshotStrategy {
    switch (this.config.type) {
      case 'postgresql':
        return new PostgresSnapshotStrategy(this.config, this.verbose);
      case 'sqlite':
        return new SqliteSnapshotStrategy(this.config, this.verbose);
      default:
        this.log('Unknown database type, falling back to Prisma strategy');
        return new PrismaSnapshotStrategy(this.studyTabRoot, this.verbose);
    }
  }

  private getSnapshotPath(name: string): string {
    const ext = this.config.type === 'sqlite' ? '.db' : '.dump';
    return path.join(this.snapshotDir, `${name}${ext}`);
  }

  private getMetadataPath(name: string): string {
    return path.join(this.snapshotDir, `${name}.json`);
  }

  /**
   * Get current database configuration
   */
  getConfig(): DbConnectionConfig {
    return { ...this.config };
  }

  /**
   * Get database type
   */
  getDatabaseType(): DatabaseType {
    return this.config.type;
  }

  /**
   * Create a snapshot of the current database state
   */
  async snapshot(name: string): Promise<void> {
    const snapshotPath = this.getSnapshotPath(name);
    const metadataPath = this.getMetadataPath(name);

    this.log(`Creating snapshot '${name}'...`);

    await this.strategy.snapshot(name, snapshotPath);

    // Save metadata
    const metadata: SnapshotMetadata = {
      name,
      createdAt: new Date(),
      databaseType: this.config.type,
      size: fs.existsSync(snapshotPath) ? fs.statSync(snapshotPath).size : 0,
      path: snapshotPath,
    };

    fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2));

    this.log(`Snapshot '${name}' created (${formatBytes(metadata.size)})`);
  }

  /**
   * Restore database to a previously saved snapshot
   */
  async restore(name: string): Promise<void> {
    const snapshotPath = this.getSnapshotPath(name);

    if (!fs.existsSync(snapshotPath)) {
      throw new Error(`Snapshot '${name}' not found at ${snapshotPath}`);
    }

    this.log(`Restoring snapshot '${name}'...`);

    await this.strategy.restore(name, snapshotPath);

    this.log(`Snapshot '${name}' restored`);
  }

  /**
   * Reset database to empty state
   */
  async reset(): Promise<void> {
    this.log('Resetting database to empty state...');
    await this.strategy.reset();
    this.log('Database reset complete');
  }

  /**
   * List all available snapshots
   */
  async list(): Promise<SnapshotMetadata[]> {
    const files = fs.readdirSync(this.snapshotDir);
    const metadataFiles = files.filter((f) => f.endsWith('.json'));

    const snapshots: SnapshotMetadata[] = [];

    for (const file of metadataFiles) {
      try {
        const content = fs.readFileSync(path.join(this.snapshotDir, file), 'utf-8');
        const metadata = JSON.parse(content) as SnapshotMetadata;
        metadata.createdAt = new Date(metadata.createdAt);
        snapshots.push(metadata);
      } catch {
        // Skip invalid metadata files
      }
    }

    return snapshots.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Delete a snapshot
   */
  async delete(name: string): Promise<void> {
    const snapshotPath = this.getSnapshotPath(name);
    const metadataPath = this.getMetadataPath(name);

    if (fs.existsSync(snapshotPath)) {
      fs.unlinkSync(snapshotPath);
    }

    if (fs.existsSync(metadataPath)) {
      fs.unlinkSync(metadataPath);
    }

    this.log(`Snapshot '${name}' deleted`);
  }

  /**
   * Delete all snapshots
   */
  async deleteAll(): Promise<void> {
    const snapshots = await this.list();

    for (const snapshot of snapshots) {
      await this.delete(snapshot.name);
    }

    this.log('All snapshots deleted');
  }

  /**
   * Check if a snapshot exists
   */
  exists(name: string): boolean {
    return fs.existsSync(this.getSnapshotPath(name));
  }

  /**
   * Get snapshot metadata
   */
  getMetadata(name: string): SnapshotMetadata | null {
    const metadataPath = this.getMetadataPath(name);

    if (!fs.existsSync(metadataPath)) {
      return null;
    }

    try {
      const content = fs.readFileSync(metadataPath, 'utf-8');
      const metadata = JSON.parse(content) as SnapshotMetadata;
      metadata.createdAt = new Date(metadata.createdAt);
      return metadata;
    } catch {
      return null;
    }
  }

  /**
   * Run a seed script after restore
   */
  async seed(seedScript?: string): Promise<void> {
    const script = seedScript ?? 'npm run db:seed';
    const cwd = path.join(this.studyTabRoot, 'packages', 'database');

    this.log(`Running seed script: ${script}`);

    try {
      await execAsync(script, { cwd });
      this.log('Seed completed');
    } catch (error) {
      const err = error as Error & { stderr?: string };
      throw new Error(`Failed to run seed: ${err.stderr || err.message}`);
    }
  }

  /**
   * Snapshot, run callback, then restore
   * Useful for wrapping test suites
   */
  async withSnapshot<T>(name: string, callback: () => Promise<T>): Promise<T> {
    await this.snapshot(name);

    try {
      return await callback();
    } finally {
      await this.restore(name);
      await this.delete(name);
    }
  }
}

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Format bytes to human readable string
 */
function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a DbSnapshot instance with sensible defaults
 */
export function createDbSnapshot(options?: DbSnapshotOptions): DbSnapshot {
  return new DbSnapshot(options);
}

// =============================================================================
// EXPORTS
// =============================================================================

export default DbSnapshot;
