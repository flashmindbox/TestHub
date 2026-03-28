import type { ProjectConfig } from '../../src/types/project.types';

export const marketplaceProject: ProjectConfig = {
  name: 'marketplace',
  displayName: 'StudyTab Marketplace',

  environments: {
    local: {
      baseUrl: 'http://localhost:5174',
      apiUrl: 'http://localhost:3002',
    },
    staging: {
      baseUrl: 'https://marketplace.studytab.ai',
      apiUrl: 'https://marketplace.studytab.ai',
    },
    production: {
      baseUrl: 'https://marketplace.studytab.ai',
      apiUrl: 'https://marketplace.studytab.ai',
      readOnly: true,
    },
  },

  auth: {
    strategy: 'session',
    loginPath: '/login',
    logoutPath: '/',
    cookieName: 'better-auth.session_token',
    testUsers: {
      standard: {
        email: 'test-teacher@marketplace.test',
        password: 'TestTeacher123!',
        role: 'teacher',
      },
      admin: {
        email: process.env.MARKETPLACE_ADMIN_EMAIL || 'admin@marketplace.test',
        password: process.env.MARKETPLACE_ADMIN_PASSWORD || 'AdminTest123!',
        role: 'admin',
      },
    },
  },

  criticalPaths: ['/browse', '/login', '/register'],
  healthCheck: '/health',

  customConfig: {
    internalSecret: process.env.MARKETPLACE_SECRET || 'test-secret',
  },
};
