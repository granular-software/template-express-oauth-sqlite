// Wrapper for awmt-sdk to handle Next.js module parsing
import { api } from "awmt-sdk"
import type { QueryPromiseChain, MutationPromiseChain } from "awmt-sdk/api/schema"

// Type-safe API client
export const awmtClient = {
  query: api.chain.query as QueryPromiseChain,
  mutation: api.chain.mutation as MutationPromiseChain,
}

export type { QueryPromiseChain, MutationPromiseChain } 