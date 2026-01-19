import { ProjectConfig } from '../../src/types';

export const studytabProject: ProjectConfig = {
  name: 'studytab',
  displayName: 'StudyTab',

  environments: {
    local: {
      baseUrl: 'http://localhost:3002',
      apiUrl: 'http://localhost:3001',
    },
    staging: {
      baseUrl: 'https://staging.studytab.com',
      apiUrl: 'https://staging.studytab.com/api',
    },
    production: {
      baseUrl: 'https://studytab.com',
      apiUrl: 'https://studytab.com/api',
      readOnly: true,
    },
  },

  auth: {
    strategy: 'session',
    loginPath: '/auth/login',
    logoutPath: '/auth/logout',
    cookieName: 'better-auth.session_token',
    testUsers: {
      standard: {
        email: process.env.TEST_USER_EMAIL || 'test@example.com',
        password: process.env.TEST_USER_PASSWORD || 'Test123!',
        role: 'user',
      },
      admin: {
        email: process.env.ADMIN_USER_EMAIL || 'admin@example.com',
        password: process.env.ADMIN_USER_PASSWORD || 'Admin123!',
        role: 'admin',
      },
    },
  },

  criticalPaths: [
    '/',
    '/dashboard',
    '/decks',
    '/study',
    '/settings',
    '/profile',
  ],

  healthCheck: '/api/v1/health',

  customConfig: {
    apiVersion: 'v1',
    features: {
      pomodoro: true,
      aiGeneration: true,
      spaceRepetition: true,
    },
    routes: {
      auth: {
        login: '/auth/login',
        register: '/auth/register',
        forgotPassword: '/auth/forgot-password',
        resetPassword: '/auth/reset-password',
      },
      decks: {
        list: '/decks',
        detail: '/decks/:id',
        create: '/decks/new',
      },
      study: {
        session: '/study',
        stats: '/stats',
      },
      api: {
        auth: '/api/v1/auth',
        decks: '/api/v1/decks',
        cards: '/api/v1/cards',
        study: '/api/v1/study',
        pomodoro: '/api/v1/pomodoro',
        ai: '/api/v1/ai',
        users: '/api/v1/users',
      },
    },
  },
};
