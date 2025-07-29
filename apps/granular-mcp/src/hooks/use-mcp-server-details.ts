"use client"

import { useEffect, useState } from "react"

interface ServerDetails {
  url?: string
  tools?: any[]
  resources?: any[]
  resourceTemplates?: any[]
}

export function useMcpServerDetails(serverId: string) {
  const [serverDetails, setServerDetails] = useState<ServerDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!serverId) return

    // Placeholder implementation – replace with real fetch later
    ;(async () => {
      try {
        setLoading(true)
        // simulate fetch delay
        await new Promise((r) => setTimeout(r, 300))
        setServerDetails({ url: "", tools: [], resources: [] })
      } catch (err) {
        setError("Failed to load server details")
      } finally {
        setLoading(false)
      }
    })()
  }, [serverId])

  return { serverDetails, loading, error }
} 