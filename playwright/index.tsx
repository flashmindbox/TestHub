/**
 * Playwright Component Testing - React Setup
 *
 * Configures providers and context for mounting StudyTab components.
 * This file runs before each component test to set up the environment.
 *
 * @module playwright/index
 */

import { beforeMount, afterMount } from '@playwright/experimental-ct-react/hooks';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

// Create a fresh QueryClient for each test
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        // Disable retries in tests for faster failure feedback
        retry: false,
        // Disable automatic refetching
        refetchOnWindowFocus: false,
        refetchOnMount: false,
        refetchOnReconnect: false,
        // Keep data fresh briefly
        staleTime: 1000 * 60, // 1 minute
        // Disable garbage collection during tests
        gcTime: Infinity,
      },
      mutations: {
        retry: false,
      },
    },
  });

// Type for hooks config passed to mount()
export interface HooksConfig {
  theme?: 'light' | 'dark';
  queryClient?: QueryClient;
  initialRoute?: string;
  mockAuth?: {
    isAuthenticated: boolean;
    user?: {
      id: string;
      email: string;
      name: string;
    };
  };
}

/**
 * Before mount hook - runs before each component is mounted
 * Sets up providers and configuration
 */
beforeMount<HooksConfig>(async ({ App, hooksConfig }) => {
  // Set theme class on html element
  const theme = hooksConfig?.theme ?? 'dark';
  document.documentElement.classList.remove('light', 'dark');
  document.documentElement.classList.add(theme);

  // Create or use provided QueryClient
  const queryClient = hooksConfig?.queryClient ?? createTestQueryClient();

  // Wrap component with providers
  return (
    <QueryClientProvider client={queryClient}>
      <App />
    </QueryClientProvider>
  );
});

/**
 * After mount hook - runs after each component is mounted
 * Can be used for cleanup or additional setup
 */
afterMount<HooksConfig>(async () => {
  // Hook for post-mount operations
  // Note: page is accessed via test context, not hook params
});

// Export for use in tests
export { createTestQueryClient };
