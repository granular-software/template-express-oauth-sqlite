import { ApolloClient, InMemoryCache, createHttpLink } from '@apollo/client';

// Minimal Apollo Client setup
const httpLink = createHttpLink({
  uri: '/api/graphql', // Use proxied endpoint to avoid CORS
});

// Create the Apollo Client with minimal configuration
export const apolloClient = new ApolloClient({
  link: httpLink,
  cache: new InMemoryCache(),
  connectToDevTools: process.env.NODE_ENV === 'development',
});

// Export utility functions
export const resetApolloClient = () => {
  apolloClient.resetStore();
};

export const clearApolloCache = () => {
  apolloClient.cache.reset();
}; 