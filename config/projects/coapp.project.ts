import { ProjectConfig } from '../../src/types';

export const coappProject: ProjectConfig = {
  name: 'coapp',
  displayName: 'CoApp',

  environments: {
    local: {
      baseUrl: 'http://localhost:4000',
      apiUrl: 'http://localhost:4001',
    },
    staging: {
      baseUrl: 'https://staging.coapp.in',
      apiUrl: 'https://api.staging.coapp.in',
    },
    production: {
      baseUrl: 'https://coapp.in',
      apiUrl: 'https://api.coapp.in',
      readOnly: true,
    },
  },

  auth: {
    strategy: 'jwt',
    loginPath: '/login',
    logoutPath: '/logout',
    cookieName: 'coapp_token',
    testUsers: {
      // Starter plan tenant
      starterAdmin: {
        email: process.env.COAPP_STARTER_ADMIN_EMAIL || 'admin@starter-test.coapp.in',
        password: process.env.COAPP_STARTER_ADMIN_PASSWORD || 'Test123!',
        role: 'OWNER',
        tenant: 'starter-test',
        plan: 'STARTER',
      },
      starterFaculty: {
        email: process.env.COAPP_STARTER_FACULTY_EMAIL || 'faculty@starter-test.coapp.in',
        password: process.env.COAPP_STARTER_FACULTY_PASSWORD || 'Test123!',
        role: 'FACULTY',
        tenant: 'starter-test',
        plan: 'STARTER',
      },
      // Growth plan tenant
      growthAdmin: {
        email: process.env.COAPP_GROWTH_ADMIN_EMAIL || 'admin@growth-test.coapp.in',
        password: process.env.COAPP_GROWTH_ADMIN_PASSWORD || 'Test123!',
        role: 'OWNER',
        tenant: 'growth-test',
        plan: 'GROWTH',
      },
    },
  },

  criticalPaths: [
    '/',
    '/dashboard',
    '/students',
    '/batches',
    '/fees',
    '/inquiries',
  ],

  healthCheck: '/api/health',

  customConfig: {
    apiVersion: 'v1',
    multiTenant: true,
    plans: ['STARTER', 'GROWTH', 'ENTERPRISE'],
    features: {
      students: true,
      batches: true,
      fees: true,
      inquiries: true,
      learning: true,
      ai: false, // Add-on
    },
    routes: {
      auth: {
        login: '/login',
        register: '/register',
        forgotPassword: '/forgot-password',
      },
      dashboard: '/dashboard',
      students: {
        list: '/students',
        detail: '/students/:id',
        create: '/students/new',
      },
      batches: {
        list: '/batches',
        detail: '/batches/:id',
        create: '/batches/new',
      },
      fees: {
        list: '/fees',
        detail: '/fees/:id',
        collect: '/fees/:id/collect',
      },
      inquiries: {
        list: '/inquiries',
        detail: '/inquiries/:id',
        create: '/inquiries/new',
      },
      api: {
        auth: '/api/v1/auth',
        tenants: '/api/v1/tenants',
        students: '/api/v1/students',
        batches: '/api/v1/batches',
        fees: '/api/v1/fees',
        payments: '/api/v1/payments',
        inquiries: '/api/v1/inquiries',
      },
    },
    testData: {
      // IDs for test data (will be seeded)
      tenants: {
        starter: 'test-tenant-starter',
        growth: 'test-tenant-growth',
      },
    },
  },
};
