import { ProjectConfig } from '../../src/types';

/**
 * Template for adding new projects to TestHub
 *
 * Usage:
 * 1. Copy this file to config/projects/your-project.project.ts
 * 2. Replace all placeholder values
 * 3. Export from config/projects/index.ts
 * 4. Create page objects in src/page-objects/your-project/
 * 5. Create tests in tests/e2e/your-project/
 */
export const templateProject: ProjectConfig = {
  name: 'your-project-name',
  displayName: 'Your Project Display Name',

  environments: {
    local: {
      baseUrl: 'http://localhost:3000',
      apiUrl: 'http://localhost:3000/api',
    },
    staging: {
      baseUrl: 'https://staging.yourproject.com',
      apiUrl: 'https://staging.yourproject.com/api',
    },
    production: {
      baseUrl: 'https://yourproject.com',
      apiUrl: 'https://yourproject.com/api',
      readOnly: true, // Only run read-only tests in production
    },
  },

  auth: {
    strategy: 'session', // 'session' | 'jwt' | 'oauth' | 'none'
    loginPath: '/login',
    logoutPath: '/logout',
    testUsers: {
      standard: {
        email: 'test@example.com',
        password: 'Test123!',
        role: 'user',
      },
      admin: {
        email: 'admin@example.com',
        password: 'Admin123!',
        role: 'admin',
      },
    },
  },

  criticalPaths: [
    '/',
    '/dashboard',
    // Add your critical paths here
  ],

  healthCheck: '/api/health',

  customConfig: {
    // Add project-specific configuration here
  },
};
