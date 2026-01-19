import { Page, APIRequestContext, BrowserContext } from '@playwright/test';
import { CreatedResource } from './test-data.types';
import { ProjectConfig } from './project.types';

export interface FailedCleanup {
  resource: CreatedResource;
  error: Error;
  timestamp: Date;
  retryCount: number;
}

export interface CleanupTracker {
  track: (resource: CreatedResource) => void;
  getAll: () => CreatedResource[];
  cleanup: (page: Page, apiContext: APIRequestContext) => Promise<void>;
  clear: () => void;
  hasFailures: () => boolean;
  getFailures: () => FailedCleanup[];
  getFailureReport: () => string;
  clearFailures: () => void;
}

export interface AuthFixture {
  login: (email?: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: () => Promise<boolean>;
  getSession: () => Promise<unknown>;
}

export interface ApiClient {
  get: <T>(path: string) => Promise<T>;
  post: <T>(path: string, data?: unknown) => Promise<T>;
  put: <T>(path: string, data?: unknown) => Promise<T>;
  delete: <T>(path: string) => Promise<T>;
  request: APIRequestContext;
}

export interface TestFixtures {
  projectConfig: ProjectConfig;
  apiClient: ApiClient;
  cleanupTracker: CleanupTracker;
  authenticatedPage: Page;
  authenticatedContext: BrowserContext;
}
