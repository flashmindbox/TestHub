/**
 * User Pool for Test Isolation
 *
 * Provides isolated test users for parallel test execution.
 * Each worker acquires a unique user, preventing shared state issues.
 */

export interface PoolUser {
  id: string;
  email: string;
  password: string;
  inUse: boolean;
  workerId?: number;
}

export interface UserPoolConfig {
  poolSize?: number;
  emailPattern?: string;
  defaultPassword?: string;
}

const DEFAULT_CONFIG: Required<UserPoolConfig> = {
  poolSize: 10,
  emailPattern: 'testuser{n}@example.com',
  defaultPassword: 'Test123!',
};

class UserPool {
  private users: PoolUser[] = [];
  private config: Required<UserPoolConfig>;
  private lockFile: Map<string, number> = new Map();

  constructor(config: UserPoolConfig = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.initializePool();
  }

  private initializePool(): void {
    for (let i = 1; i <= this.config.poolSize; i++) {
      this.users.push({
        id: `user-${i}`,
        email: this.config.emailPattern.replace('{n}', String(i)),
        password: this.config.defaultPassword,
        inUse: false,
      });
    }
  }

  /**
   * Acquire a user for exclusive use by a worker.
   * Returns undefined if no users available.
   */
  acquire(workerId: number): PoolUser | undefined {
    const available = this.users.find(u => !u.inUse);
    if (available) {
      available.inUse = true;
      available.workerId = workerId;
      this.lockFile.set(available.id, workerId);
      console.log(`[UserPool] Worker ${workerId} acquired ${available.email}`);
      return { ...available };
    }
    console.warn(`[UserPool] No users available for worker ${workerId}`);
    return undefined;
  }

  /**
   * Release a user back to the pool.
   */
  release(userId: string): void {
    const user = this.users.find(u => u.id === userId);
    if (user) {
      console.log(`[UserPool] Released ${user.email} from worker ${user.workerId}`);
      user.inUse = false;
      user.workerId = undefined;
      this.lockFile.delete(userId);
    }
  }

  /**
   * Release all users held by a specific worker.
   */
  releaseByWorker(workerId: number): void {
    this.users
      .filter(u => u.workerId === workerId)
      .forEach(u => this.release(u.id));
  }

  /**
   * Get pool status for debugging.
   */
  getStatus(): { total: number; available: number; inUse: number } {
    const inUse = this.users.filter(u => u.inUse).length;
    return {
      total: this.users.length,
      available: this.users.length - inUse,
      inUse,
    };
  }

  /**
   * Get all users in the pool.
   */
  getAllUsers(): PoolUser[] {
    return this.users.map(u => ({ ...u }));
  }

  /**
   * Reset the pool (for testing).
   */
  reset(): void {
    this.users.forEach(u => {
      u.inUse = false;
      u.workerId = undefined;
    });
    this.lockFile.clear();
  }
}

// Singleton instance
let poolInstance: UserPool | null = null;

export function getUserPool(config?: UserPoolConfig): UserPool {
  if (!poolInstance) {
    poolInstance = new UserPool(config);
  }
  return poolInstance;
}

export function resetUserPool(): void {
  poolInstance?.reset();
  poolInstance = null;
}

export { UserPool };
