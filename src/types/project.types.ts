export type AuthStrategy = 'session' | 'jwt' | 'oauth' | 'none';

export interface TestUser {
  email: string;
  password: string;
  role?: string;
}

export interface EnvironmentConfig {
  baseUrl: string;
  apiUrl: string;
  readOnly?: boolean;
}

export interface AuthConfig {
  strategy: AuthStrategy;
  loginPath: string;
  logoutPath?: string;
  testUsers: {
    standard: TestUser;
    admin?: TestUser;
    [key: string]: TestUser | undefined;
  };
  cookieName?: string;
  headerName?: string;
}

export interface ProjectConfig {
  name: string;
  displayName: string;
  environments: {
    local: EnvironmentConfig;
    staging?: EnvironmentConfig;
    production?: EnvironmentConfig;
    [key: string]: EnvironmentConfig | undefined;
  };
  auth: AuthConfig;
  criticalPaths: string[];
  healthCheck: string;
  customConfig?: Record<string, unknown>;
}

export type ProjectName = 'studytab' | string;
