/**
 * Environment configuration for the AWMT Dashboard
 * Provides type-safe access to environment variables with defaults
 */

export const config = {
  // GraphQL API Configuration
  graphql: {
    uri: process.env.NEXT_PUBLIC_GRAPHQL_URI || 'http://localhost:3000/graphql',
    // Enable introspection only in development
    introspection: process.env.NODE_ENV === 'development',
    // Enable playground only in development
    playground: process.env.NODE_ENV === 'development',
  },

  // Authentication Configuration
  auth: {
    // Token storage key
    tokenKey: 'awmt_auth_token',
    // Token refresh threshold (minutes before expiry)
    refreshThreshold: 5,
  },

  // Apollo Client Configuration
  apollo: {
    // Default error policy
    defaultErrorPolicy: 'all' as const,
    // Cache configuration
    cache: {
      // Cache size limit (MB)
      sizeLimit: 50,
      // Enable cache persistence
      persist: process.env.NODE_ENV === 'production',
    },
    // Connection configuration
    connection: {
      // Request timeout (ms)
      timeout: 30000,
      // Retry attempts
      retryAttempts: 3,
      // Retry delay (ms)
      retryDelay: 1000,
    },
    // Development tools
    devtools: process.env.NODE_ENV === 'development',
  },

  // Application Configuration
  app: {
    // Environment
    environment: process.env.NODE_ENV || 'development',
    // Version
    version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
    // Debug mode
    debug: process.env.NODE_ENV === 'development',
    // Performance monitoring
    enablePerformanceMonitoring: process.env.NODE_ENV === 'production',
  },

  // Feature Flags
  features: {
    // Enable optimistic updates
    optimisticUpdates: true,
    // Enable real-time subscriptions
    realTimeUpdates: true,
    // Enable offline support
    offlineSupport: false,
    // Enable analytics
    analytics: process.env.NODE_ENV === 'production',
  },
} as const;

// Type definitions
export type Config = typeof config;
export type GraphQLConfig = Config['graphql'];
export type AuthConfig = Config['auth'];
export type ApolloConfig = Config['apollo'];

// Validation function
export function validateConfig(): void {
  if (!config.graphql.uri) {
    throw new Error('NEXT_PUBLIC_GRAPHQL_URI is required');
  }

  // Log configuration in development
  if (config.app.debug) {
    console.log('📋 AWMT Dashboard Configuration:', {
      environment: config.app.environment,
      graphqlUri: config.graphql.uri,
      apolloDevtools: config.apollo.devtools,
      features: config.features,
    });
  }
} 