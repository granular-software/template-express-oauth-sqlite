"use client"

import * as React from "react"
import { useQuery, useLazyQuery, useMutation, gql } from "@apollo/client"
import { useAgents } from "@/hooks/use-agents"
import Link from "next/link"
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Server, Wrench, Database, Shield, Search, ExternalLink, Users } from "lucide-react"

type PermissionType = "default" | "allowed" | "unallowed" | "only_if_sure" | "ask_before"
type PermissionSource = "agent" | "role"

// Add highlighting utility function
const highlightText = (text: string, searchTerm: string): React.ReactNode => {
  if (!searchTerm.trim()) return text
  
  const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
  const parts = text.split(regex)
  
  return parts.map((part, index) => 
    regex.test(part) ? (
      <mark key={index} className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">
        {part}
      </mark>
    ) : (
      part
    )
  )
}

interface Permission {
  path: string | null
  reference: {
    path: string
    direct_prototypes: Array<{
      path: string
      label: string
    }>
  } | null
  source: PermissionSource
  sourceRoleId?: string
  sourceRoleName?: string
}

interface Resource {
  path: string
  label: string
  description: string
  permission: Permission | null
}

interface Tool {
  path: string
  label: string
  description: string
  permission: Permission | null
}

interface McpServer {
  label: string
  resources: {
    list: Array<{
      reference: Resource
    }>
  }
  tools: {
    list: Array<{
      reference: Tool
    }>
  }
}

interface McpServerData {
  server: McpServer
}

interface RolePermissionsResponse {
  model: {
    mcp_servers: Array<McpServerData>
  }
}

const GET_MCP_PERMISSIONS = gql`
  query GetMCPPermissions($workspace_id: String!, $agent_id: String!) {
    model(path: $workspace_id) {
      mcp_servers: features(category: "application") {
        server: model {
          label
          resources: at(submodel: "resources") {
            list: submodels {
              reference {
                path
                label
                description
                
                permission: at(submodel: $agent_id) {
                  path
                  reference { 
                    path 
                    direct_prototypes { 
                      path 
                      label
                    } 
                  }
                }
              }
            }
          }
          tools: at(submodel: "tools") {
            list: submodels {
              reference {
                path
                label
                description
                
                permission: at(submodel: $agent_id) {
                  reference { 
                    path 
                    direct_prototypes { 
                      path 
                      label
                    } 
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`

const GET_ROLE_MCP_PERMISSIONS = gql`
  query GetRoleMCPPermissions($workspace_id: String!, $role_id: String!) {
    model(path: $workspace_id) {
      mcp_servers: features(category: "application") {
        server: model {
          label
          resources: at(submodel: "resources") {
            list: submodels {
              reference {
                path
                label
                description
                
                permission: at(submodel: $role_id) {
                  path
                  reference { 
                    path 
                    direct_prototypes { 
                      path 
                      label
                    } 
                  }
                }
              }
            }
          }
          tools: at(submodel: "tools") {
            list: submodels {
              reference {
                path
                label
                description
                
                permission: at(submodel: $role_id) {
                  reference { 
                    path 
                    direct_prototypes { 
                      path 
                      label
                    } 
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`

const REMOVE_PERMISSION = gql`
  mutation RemovePermission($permission_id: String!) {
    at(path: $permission_id) {
      remove_model {
        done
      }
    }
  }
`

const CREATE_PERMISSION_ON_AGENT = gql`
  mutation CreatePermissionOnAgent($agent_id: String!, $target_id: String!, $permission_type: String!) { 
    at(path: $agent_id) {
      use_feature(feature: $permission_type) {
        done
        model { 
          path
        }
        
        at(submodel: "of") {
          set_reference(reference: $target_id) {
            done
          }
        }
      }
    }
  }
`

const CREATE_PERMISSION_ON_TARGET = gql`
  mutation CreatePermissionOnTarget($agent_id: String!, $target_id: String!, $permission_id: String!) { 
    at(path: $target_id) {
      create_submodel(subpath: $agent_id) {
        set_reference(reference: $permission_id) {
          done
        }
      }
    }
  }
`

const GET_AGENT_SUMMARY = gql`
  query GetAgentSummary($agent_id: String!) {
    model(path: $agent_id) {
      summary: at(submodel: "summary") {
        string_value
      }
    }
  }
`

const SET_AGENT_SUMMARY = gql`
  mutation SetAgentSummary($agent_id: String!, $value: String!) {
    at(path: $agent_id) {
      summary: create_submodel(subpath: "summary") {
        set_string_value(value: $value) {
          done
          model {
            path
            string_value
          }
        }
      }
    }
  }
`

interface McpPermissionsProps {
  workspaceId: string
  agentId: string
  agentName?: string
}

export function McpPermissions({ workspaceId, agentId, agentName }: McpPermissionsProps) {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [userOpenAccordions, setUserOpenAccordions] = React.useState<string[]>([])
  const { getAgentRoles } = useAgents(workspaceId)
  const [agentRoles, setAgentRoles] = React.useState<Array<{id: string; name: string}>>([])
  const [rolePermissionsData, setRolePermissionsData] = React.useState<Record<string, {
    model: {
      mcp_servers: Array<{
        server: McpServer
      }>
    }
  }>>({})
  const [rolePermissionsLoading, setRolePermissionsLoading] = React.useState(false)
  const [rolePermissionsError, setRolePermissionsError] = React.useState<Error | null>(null)
  const [changingPermissions, setChangingPermissions] = React.useState<Set<string>>(new Set())
  const [applyingToAllServers, setApplyingToAllServers] = React.useState<Set<number>>(new Set())
  const [generatingSummary, setGeneratingSummary] = React.useState(false)
  const [summaryError, setSummaryError] = React.useState<string | null>(null)
  const [lastSummaryGeneration, setLastSummaryGeneration] = React.useState<number>(0)
  const [tempDisplaySummary, setTempDisplaySummary] = React.useState<string | null>(null)
  
  // Get agent's direct permissions
  const { data: agentData, loading: agentLoading, error: agentError, refetch } = useQuery<{
    model: {
      mcp_servers: Array<{
        server: McpServer
      }>
    }
  }>(GET_MCP_PERMISSIONS, {
    variables: { workspace_id: workspaceId, agent_id: agentId },
    skip: !workspaceId || !agentId,
  })

  // Set up lazy query for role permissions
  const [getRolePermissions] = useLazyQuery<{
    model: {
      mcp_servers: Array<{
        server: McpServer
      }>
    }
  }>(GET_ROLE_MCP_PERMISSIONS)

  // Permission mutation hooks
  const [removePermission] = useMutation(REMOVE_PERMISSION)
  const [createPermissionOnAgent] = useMutation(CREATE_PERMISSION_ON_AGENT)
  const [createPermissionOnTarget] = useMutation(CREATE_PERMISSION_ON_TARGET)

  // Summary hooks
  const { data: summaryData, refetch: refetchSummary } = useQuery<{
    model: {
      summary: {
        string_value: string | null
      } | null
    }
  }>(GET_AGENT_SUMMARY, {
    variables: { agent_id: agentId },
    skip: !agentId,
  })
  const [setAgentSummary] = useMutation(SET_AGENT_SUMMARY)

  // Get agent's assigned roles
  React.useEffect(() => {
    let isMounted = true

    const fetchAgentRoles = async () => {
      if (!agentId) return

      try {
        const roles = await getAgentRoles(agentId)
        // Update state only if the data actually changed and component is still mounted
        if (isMounted) {
          setAgentRoles(prev => {
            const prevIds = prev.map(r => r.id).sort().join(',')
            const newIds = roles.map(r => r.id).sort().join(',')
            return prevIds === newIds ? prev : roles
          })
        }
      } catch (error) {
        console.error("Failed to fetch agent roles:", error)
      }
    }

    fetchAgentRoles()

    return () => {
      isMounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentId])

  // Track current roles to avoid unnecessary refetches
  const currentRoleIds = React.useMemo(() => 
    agentRoles.map(role => role.id).sort().join(','), 
    [agentRoles]
  )

  // Fetch permissions for all roles when roles change
  React.useEffect(() => {
    const fetchRolePermissions = async () => {
      if (agentRoles.length === 0) {
        setRolePermissionsData({})
        return
      }

      setRolePermissionsLoading(true)
      setRolePermissionsError(null)
      
      try {
        const permissionsMap: Record<string, RolePermissionsResponse> = {}
        
        for (const role of agentRoles) {
          const { data } = await getRolePermissions({
            variables: { workspace_id: workspaceId, role_id: role.id },
          })
          if (data) {
            permissionsMap[role.id] = data
          }
        }
        
        setRolePermissionsData(permissionsMap)
      } catch (error) {
        console.error("Failed to fetch role permissions:", error)
        setRolePermissionsError(error as Error)
      } finally {
        setRolePermissionsLoading(false)
      }
    }

    fetchRolePermissions()
  }, [currentRoleIds, workspaceId, agentRoles, getRolePermissions]) // Stable dependency on role IDs string

  // Merge permissions from agent and all roles
  const mergedMcpServers = React.useMemo(() => {
    const agentServers = agentData?.model?.mcp_servers || []
    const roleServersArray = Object.values(rolePermissionsData).map(data => data?.model?.mcp_servers || [])
    
    // Create a map to merge permissions by server/tool/resource path
    const serverMap = new Map<string, McpServerData>()
    
    // Add agent permissions first (direct)
    agentServers.forEach(serverData => {
      const serverKey = serverData.server.label
      if (!serverMap.has(serverKey)) {
        serverMap.set(serverKey, {
          server: {
            ...serverData.server,
            resources: { list: [] },
            tools: { list: [] }
          }
        })
      }
      
      const mergedServer = serverMap.get(serverKey)!
      
      // Add resources with agent source
      serverData.server.resources?.list?.forEach((resourceData: { reference: Resource }) => {
        const existing = mergedServer.server.resources.list.find((r: { reference: Resource }) => 
          r.reference.path === resourceData.reference.path
        )
        if (!existing) {
          mergedServer.server.resources.list.push({
            reference: {
              ...resourceData.reference,
              permission: resourceData.reference.permission ? {
                ...resourceData.reference.permission,
                source: "agent" as PermissionSource
              } : null
            }
          })
        }
      })
      
      // Add tools with agent source
      serverData.server.tools?.list?.forEach((toolData: { reference: Tool }) => {
        const existing = mergedServer.server.tools.list.find((t: { reference: Tool }) => 
          t.reference.path === toolData.reference.path
        )
        if (!existing) {
          mergedServer.server.tools.list.push({
            reference: {
              ...toolData.reference,
              permission: toolData.reference.permission ? {
                ...toolData.reference.permission,
                source: "agent" as PermissionSource
              } : null
            }
          })
        }
      })
    })
    
    // Add role permissions (inherited)
    roleServersArray.forEach((roleServers: Array<McpServerData>, roleIndex: number) => {
      const role = agentRoles[roleIndex]
      if (!role) return
      
      roleServers.forEach((serverData: { server: McpServer }) => {
        const serverKey = serverData.server.label
        if (!serverMap.has(serverKey)) {
          serverMap.set(serverKey, {
            server: {
              ...serverData.server,
              resources: { list: [] },
              tools: { list: [] }
            }
          })
        }
        
        const mergedServer = serverMap.get(serverKey)!
        
        // Add resources with role source (only if not already set by agent)
        serverData.server.resources?.list?.forEach((resourceData: { reference: Resource }) => {
          const existing = mergedServer.server.resources.list.find((r: { reference: Resource }) => 
            r.reference.path === resourceData.reference.path
          )
          if (!existing && resourceData.reference.permission) {
            mergedServer.server.resources.list.push({
              reference: {
                ...resourceData.reference,
                permission: {
                  ...resourceData.reference.permission,
                  source: "role" as PermissionSource,
                  sourceRoleId: role.id,
                  sourceRoleName: role.name
                }
              }
            })
          } else if (existing && !existing.reference.permission && resourceData.reference.permission) {
            // If agent has no permission but role does, add the role permission
            existing.reference.permission = {
              ...resourceData.reference.permission,
              source: "role" as PermissionSource,
              sourceRoleId: role.id,
              sourceRoleName: role.name
            }
          }
        })
        
        // Add tools with role source (only if not already set by agent)
        serverData.server.tools?.list?.forEach((toolData: { reference: Tool }) => {
          const existing = mergedServer.server.tools.list.find((t: { reference: Tool }) => 
            t.reference.path === toolData.reference.path
          )
          if (!existing && toolData.reference.permission) {
            mergedServer.server.tools.list.push({
              reference: {
                ...toolData.reference,
                permission: {
                  ...toolData.reference.permission,
                  source: "role" as PermissionSource,
                  sourceRoleId: role.id,
                  sourceRoleName: role.name
                }
              }
            })
          } else if (existing && !existing.reference.permission && toolData.reference.permission) {
            // If agent has no permission but role does, add the role permission
            existing.reference.permission = {
              ...toolData.reference.permission,
              source: "role" as PermissionSource,
              sourceRoleId: role.id,
              sourceRoleName: role.name
            }
          }
        })
      })
    })
    
    return Array.from(serverMap.values())
  }, [agentData, rolePermissionsData, agentRoles])

  // Get the summary to display (prefer real data, fallback to temp)
  const displaySummary = summaryData?.model?.summary?.string_value || tempDisplaySummary

  // Generate initial summary if none exists and we have permission data
  React.useEffect(() => {
    const hasPermissionData = mergedMcpServers.length > 0
    const hasNoSummary = !displaySummary
    const hasActivePermissions = mergedMcpServers.some(server => 
      [...(server.server.tools?.list || []), ...(server.server.resources?.list || [])].some(item => 
        getPermissionType(item.reference.permission) !== 'default'
      )
    )

    if (hasPermissionData && hasNoSummary && hasActivePermissions && !generatingSummary && agentName) {
      // Small delay to ensure all data is loaded
      const timer = setTimeout(() => {
        generateAgentSummary()
      }, 1500)
      
      return () => {
        clearTimeout(timer)
      }
    }
  }, [mergedMcpServers, displaySummary, generatingSummary, agentName, tempDisplaySummary, summaryData?.model?.summary?.string_value]) // eslint-disable-line react-hooks/exhaustive-deps

  const loading = agentLoading || rolePermissionsLoading
  const error = agentError || rolePermissionsError

  // Filter servers, tools, and resources based on search term
  const filteredServers = React.useMemo(() => {
    if (!searchTerm.trim()) {
      return mergedMcpServers.map(serverData => ({
        ...serverData,
        hasMatches: true,
        filteredTools: serverData.server.tools?.list || [],
        filteredResources: serverData.server.resources?.list || []
      }))
    }

    const searchLower = searchTerm.toLowerCase()
    
    return mergedMcpServers.map(serverData => {
      const server = serverData.server
      const tools = server.tools?.list || []
      const resources = server.resources?.list || []
      
      const filteredTools = tools.filter((toolData: { reference: Tool }) => 
        toolData.reference.label.toLowerCase().includes(searchLower) ||
        toolData.reference.description?.toLowerCase().includes(searchLower)
      )
      
      const filteredResources = resources.filter((resourceData: { reference: Resource }) => 
        resourceData.reference.label.toLowerCase().includes(searchLower) ||
        resourceData.reference.description?.toLowerCase().includes(searchLower)
      )
      
      const hasMatches = filteredTools.length > 0 || filteredResources.length > 0
      
      return {
        ...serverData,
        hasMatches,
        filteredTools,
        filteredResources
      }
    })
  }, [mergedMcpServers, searchTerm])

  // Get accordion values that should be open (merge user preferences with search results)
  const openAccordions = React.useMemo(() => {
    if (!searchTerm.trim()) {
      // No search - use user preferences
      return userOpenAccordions
    }
    
    // With search - auto-open servers with matches, but preserve user preferences too
    const searchOpenAccordions = filteredServers
      .map((serverData, index) => serverData.hasMatches ? `server-${index}` : null)
      .filter(Boolean) as string[]
    
    // Merge user preferences with search results
    const merged = new Set([...userOpenAccordions, ...searchOpenAccordions])
    return Array.from(merged)
  }, [filteredServers, searchTerm, userOpenAccordions])

  const getPermissionType = (permission: Permission | null): PermissionType => {
    if (!permission || !permission.reference) {
      return "default"
    }

    const prototypes = permission.reference.direct_prototypes || []
    
    // Check the prototype paths to determine permission type
    for (const prototype of prototypes) {
      const path = prototype.path?.toLowerCase()
      if (path === "permission_allowed") return "allowed"
      if (path === "permission_not_allowed") return "unallowed"
      if (path === "permission_if_sure") return "only_if_sure"
      if (path === "permission_ask_validation") return "ask_before"
    }
    
    return "default"
  }

  const handlePermissionChange = async (
    itemPath: string,
    itemType: "resource" | "tool",
    newPermission: PermissionType
  ) => {
    const changeKey = `${itemPath}-${itemType}`
    
    // Prevent concurrent changes to the same item
    if (changingPermissions.has(changeKey)) {
      return
    }

    // Map UI permission types to GraphQL permission types
    const permissionTypeMap: Record<PermissionType, string | null> = {
      "default": null,
      "allowed": "permission_allowed",
      "unallowed": "permission_not_allowed", 
      "only_if_sure": "permission_if_sure",
      "ask_before": "permission_ask_validation"
    }

    const graphqlPermissionType = permissionTypeMap[newPermission]

    try {
      setChangingPermissions(prev => new Set(prev).add(changeKey))

      // Find current permission for this item
      const currentPermission = mergedMcpServers
        .flatMap(serverData => [
          ...(serverData.server.tools?.list || []),
          ...(serverData.server.resources?.list || [])
        ])
        .find(itemData => itemData.reference.path === itemPath)
        ?.reference.permission

      // Step 1: Remove existing permission if it exists
      if (currentPermission?.path && currentPermission.source === "agent") {
        console.log(`Removing existing permission: ${currentPermission.path}`)
        await removePermission({
          variables: { permission_id: currentPermission.path }
        })
      }

      // Step 2 & 3: Create new permission if not default
      if (graphqlPermissionType) {
        console.log(`Creating ${graphqlPermissionType} permission for ${itemType} ${itemPath}`)
        
        // Create permission on agent
        const { data: createData } = await createPermissionOnAgent({
          variables: {
            agent_id: agentId,
            target_id: itemPath,
            permission_type: graphqlPermissionType
          }
        })

        const permissionId = createData?.at?.use_feature?.model?.path
        if (!permissionId) {
          throw new Error("Failed to get permission ID from creation response")
        }

        console.log(`Created permission with ID: ${permissionId}`)

        // Link permission to target
        await createPermissionOnTarget({
          variables: {
            agent_id: agentId,
            target_id: itemPath,
            permission_id: permissionId
          }
        })

        console.log(`Successfully linked permission ${permissionId} to ${itemType} ${itemPath}`)
      }

      // Refetch data to reflect changes
      // For agent permissions
      await refetch()
      
      // For role permissions - refetch the affected role data
      if (currentPermission?.source === "role") {
        // If we modified an inherited permission, we might need to refresh role data
        const affectedRoleId = currentPermission.sourceRoleId
        if (affectedRoleId && rolePermissionsData[affectedRoleId]) {
          // Refetch this specific role's permissions
          const { data } = await getRolePermissions({
            variables: { workspace_id: workspaceId, role_id: affectedRoleId },
          })
          if (data) {
            setRolePermissionsData(prev => ({
              ...prev,
              [affectedRoleId]: data
            }))
          }
        }
      }

      // Generate updated summary after permission changes
      setTimeout(() => {
        generateAgentSummary()
      }, 1000) // Small delay to ensure data is refreshed

    } catch (error) {
      console.error(`Failed to set ${itemType} permission:`, error)
      // TODO: Show user-friendly error message
    } finally {
      setChangingPermissions(prev => {
        const next = new Set(prev)
        next.delete(changeKey)
        return next
      })
    }
  }

  const handleApplyToAll = async (serverIndex: number, permission: PermissionType) => {
    if (permission === "default") return
    
    setApplyingToAllServers(prev => new Set(prev).add(serverIndex))
    
    try {
      const serverData = filteredServers[serverIndex]
      const allItems: Array<{ path: string; type: "resource" | "tool"; permission: Permission | null }> = [
        ...serverData.filteredTools.map((toolData: { reference: Tool }) => ({
          path: toolData.reference.path,
          type: "tool" as const,
          permission: toolData.reference.permission
        })),
        ...serverData.filteredResources.map((resourceData: { reference: Resource }) => ({
          path: resourceData.reference.path,
          type: "resource" as const,
          permission: resourceData.reference.permission
        }))
      ]
      
      // Filter out items that already have inherited permissions
      const itemsToUpdate = allItems.filter(item => {
        const source = getPermissionSource(item.permission)
        return !source.isInherited // Only apply to non-inherited items
      })
      
      // Apply permissions sequentially
      for (const item of itemsToUpdate) {
        await handlePermissionChange(item.path, item.type, permission)
        // Small delay to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 50))
      }

      // Generate updated summary after bulk permission changes
      setTimeout(() => {
        generateAgentSummary()
      }, 2000) // Longer delay for bulk operations
    } catch (error) {
      console.error("Error applying permissions to all items:", error)
    } finally {
      setApplyingToAllServers(prev => {
        const next = new Set(prev)
        next.delete(serverIndex)
        return next
      })
    }
  }

  const getPermissionLabel = (type: PermissionType): string => {
    switch (type) {
      case "default": return "—"
      case "allowed": return "Allowed"
      case "unallowed": return "Unallowed"
      case "only_if_sure": return "Only if sure"
      case "ask_before": return "Ask before"
    }
  }

  const getPermissionVariant = (type: PermissionType) => {
    switch (type) {
      case "allowed": return "secondary"
      case "unallowed": return "destructive"
      case "only_if_sure": return "secondary"
      case "ask_before": return "outline"
      default: return "outline"
    }
  }

  const getPermissionSource = (permission: Permission | null): { isInherited: boolean; roleInfo?: { id: string; name: string } } => {
    if (!permission) return { isInherited: false }
    
    return {
      isInherited: permission.source === "role",
      roleInfo: permission.source === "role" ? { 
        id: permission.sourceRoleId!, 
        name: permission.sourceRoleName! 
      } : undefined
    }
  }

  // Function to generate and update summary
  const generateAgentSummary = async () => {
    // Debounce: prevent rapid successive calls
    const now = Date.now()
    const timeSinceLastGeneration = now - lastSummaryGeneration
    const debounceMs = 5000 // 5 seconds minimum between generations

    if (!agentName || generatingSummary) {
      return
    }

    if (timeSinceLastGeneration < debounceMs) {
      return
    }

    setLastSummaryGeneration(now)
    setGeneratingSummary(true)
    setSummaryError(null)

    try {
      // Collect all permissions from merged servers
      const allPermissions: Array<{
        path: string
        type: 'tool' | 'resource'
        name: string
        description: string
        permission: 'allowed' | 'unallowed' | 'only_if_sure' | 'ask_before' | 'default'
        source: 'agent' | 'role'
        roleInfo?: { id: string; name: string }
      }> = []

      mergedMcpServers.forEach((serverData) => {
        // Add tools
        serverData.server.tools?.list?.forEach((toolData: { reference: Tool }) => {
          const tool = toolData.reference
          const permissionType = getPermissionType(tool.permission)
          const source = getPermissionSource(tool.permission)
          
          allPermissions.push({
            path: tool.path,
            type: 'tool',
            name: tool.label,
            description: tool.description,
            permission: permissionType,
            source: source.isInherited ? 'role' : 'agent',
            roleInfo: source.roleInfo
          })
        })

        // Add resources
        serverData.server.resources?.list?.forEach((resourceData: { reference: Resource }) => {
          const resource = resourceData.reference
          const permissionType = getPermissionType(resource.permission)
          const source = getPermissionSource(resource.permission)
          
          allPermissions.push({
            path: resource.path,
            type: 'resource',
            name: resource.label,
            description: resource.description,
            permission: permissionType,
            source: source.isInherited ? 'role' : 'agent',
            roleInfo: source.roleInfo
          })
        })
      })

      // Call the API to generate summary
      const response = await fetch('/api/generate-summary', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          agentId,
          agentName,
          permissions: allPermissions
        })
      })

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${response.statusText}`)
      }

      const result = await response.json()
      
      if (result.error) {
        throw new Error(result.error)
      }

      // Update the summary in the database
      const saveResult = await setAgentSummary({
        variables: {
          agent_id: agentId,
          value: result.summary
        }
      })

      if (saveResult.errors && saveResult.errors.length > 0) {
        throw new Error(`Database operation failed: ${saveResult.errors.map((e: { message: string }) => e.message).join(', ')}`)
      }

      // IMMEDIATELY display the summary in UI using temp state
      setTempDisplaySummary(result.summary)

      // Small delay to ensure database consistency
      await new Promise(resolve => setTimeout(resolve, 500))

      // Refetch summary to update UI
      const refetchResult = await refetchSummary()
      
      // Check if the refetch was successful
      if (refetchResult.data?.model?.summary?.string_value) {
        // Clear temp display since we have the real data
        setTempDisplaySummary(null)
      }

    } catch (error) {
      setSummaryError(error instanceof Error ? error.message : 'Failed to generate summary')
    } finally {
      setGeneratingSummary(false)
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            MCP Server Permissions
          </CardTitle>
          <CardDescription>Loading permissions...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            MCP Server Permissions
          </CardTitle>
          <CardDescription>Error loading permissions</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-destructive">{error.message}</p>
        </CardContent>
      </Card>
    )
  }

  if (mergedMcpServers.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            MCP Server Permissions
          </CardTitle>
          <CardDescription>
            {agentName ? `Configure MCP server permissions for ${agentName}` : "Configure MCP server permissions"}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">No MCP servers found in this workspace.</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" />
          MCP Server Permissions
        </CardTitle>
        <CardDescription>
          {agentName ? `Configure MCP server permissions for ${agentName}. Inherited permissions from assigned roles are shown but cannot be edited here.` : "Configure MCP server permissions. Inherited permissions from assigned roles are shown but cannot be edited here."}
        </CardDescription>
        
        {/* Agent Summary Section */}
        {displaySummary && (
          <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-dashed">
            <div className="flex items-start gap-2">
              <Shield className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-medium mb-2">Agent Capabilities Summary</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {displaySummary}
                </p>
                {generatingSummary && (
                  <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                    <div className="h-3 w-3 animate-spin rounded-full border border-muted-foreground border-t-transparent" />
                    Updating summary...
                  </div>
                )}
                {summaryError && (
                  <div className="mt-2 text-xs text-destructive">
                    Failed to update summary: {summaryError}
                  </div>
                )}
                {tempDisplaySummary && !summaryData?.model?.summary?.string_value && (
                  <div className="mt-2 text-xs text-blue-600">
                    ⚡ Summary generated (saving to database...)
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Show loading state for initial summary generation */}
        {!displaySummary && generatingSummary && (
          <div className="mt-4 p-4 bg-muted/30 rounded-lg border border-dashed">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <div className="h-4 w-4 animate-spin rounded-full border border-muted-foreground border-t-transparent" />
              Generating capabilities summary...
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {/* Search Field */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input
            placeholder="Search tools and resources..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Accordion 
          type="multiple" 
          className="w-full space-y-2"
          value={openAccordions}
          onValueChange={setUserOpenAccordions}
        >
          {filteredServers.map((serverData, serverIndex) => {
            const server = serverData.server
            const resources = serverData.filteredResources
            const tools = serverData.filteredTools
            const totalItems = resources.length + tools.length
            const hasMatches = serverData.hasMatches

            return (
              <AccordionItem 
                key={serverIndex} 
                value={`server-${serverIndex}`} 
                className={`border rounded-lg ${!hasMatches ? 'opacity-50' : ''}`}
              >
                <AccordionTrigger 
                  className={`px-4 py-3 hover:no-underline ${!hasMatches ? 'cursor-not-allowed' : ''}`}
                  disabled={!hasMatches}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <Server className="h-4 w-4 text-white" />
                    </div>
                    <div className="flex-1 text-left">
                      <div className="font-medium">{highlightText(server.label, searchTerm)}</div>
                      <div className="text-xs text-muted-foreground">
                        {tools.length} tools, {resources.length} resources
                      </div>
                    </div>
                    <Badge variant="secondary">{totalItems} items</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="space-y-6">
                    {/* Apply to All Section */}
                    <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg border border-dashed">
                      <div className="flex items-center gap-2">
                        <Shield className="h-4 w-4 text-muted-foreground" />
                        <span className="text-sm font-medium">Apply to all:</span>
                      </div>
                      <Select
                        value="default"
                        onValueChange={(value) => handleApplyToAll(serverIndex, value as PermissionType)}
                        disabled={applyingToAllServers.has(serverIndex)}
                      >
                        <SelectTrigger className="w-[160px]">
                          <SelectValue placeholder={
                            applyingToAllServers.has(serverIndex) ? "Applying..." : "Select permission"
                          } />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="allowed">Allowed</SelectItem>
                          <SelectItem value="unallowed">Unallowed</SelectItem>
                          <SelectItem value="only_if_sure">Only if sure</SelectItem>
                          <SelectItem value="ask_before">Ask before</SelectItem>
                        </SelectContent>
                      </Select>
                      <div className="text-xs text-muted-foreground">
                        {applyingToAllServers.has(serverIndex) ? (
                          <span className="flex items-center gap-1">
                            <div className="animate-spin h-3 w-3 border border-muted-foreground border-t-transparent rounded-full" />
                            Applying to non-inherited items...
                          </span>
                        ) : (
                          `Will apply to ${
                            [...serverData.filteredTools, ...serverData.filteredResources]
                              .filter(item => !getPermissionSource(item.reference.permission).isInherited)
                              .length
                          } non-inherited items`
                        )}
                      </div>
                    </div>

                    {/* Tools Table */}
                    {tools.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Wrench className="h-4 w-4" />
                          <h4 className="font-medium">Tools</h4>
                          <Badge variant="outline">{tools.length}</Badge>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead className="w-[140px]">Permission</TableHead>
                              <TableHead className="w-[120px]">Source</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {tools.map((toolData: { reference: Tool }) => {
                              const tool = toolData.reference
                              const currentPermission = getPermissionType(tool.permission)
                              const permissionSource = getPermissionSource(tool.permission)
                              const isChanging = changingPermissions.has(`${tool.path}-tool`)
                              
                              return (
                                <TableRow key={tool.path}>
                                  <TableCell className="font-medium">{highlightText(tool.label, searchTerm)}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                                    {highlightText(tool.description, searchTerm)}
                                  </TableCell>
                                  <TableCell>
                                    {permissionSource.isInherited ? (
                                      <Badge variant={getPermissionVariant(currentPermission)} className="opacity-75">
                                        {getPermissionLabel(currentPermission)}
                                      </Badge>
                                    ) : (
                                      <Select
                                        value={currentPermission}
                                        onValueChange={(value: PermissionType) =>
                                          handlePermissionChange(tool.path, "tool", value)
                                        }
                                        disabled={isChanging}
                                      >
                                        <SelectTrigger className={`w-[120px] ${isChanging ? 'opacity-50' : ''}`}>
                                          <SelectValue>
                                            {isChanging ? (
                                              <div className="flex items-center gap-2">
                                                <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                                                <span className="text-xs">Saving...</span>
                                              </div>
                                            ) : (
                                              <Badge variant={getPermissionVariant(currentPermission)}>
                                                {getPermissionLabel(currentPermission)}
                                              </Badge>
                                            )}
                                          </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="default">—</SelectItem>
                                          <SelectItem value="allowed">Allowed</SelectItem>
                                          <SelectItem value="unallowed">Unallowed</SelectItem>
                                          <SelectItem value="only_if_sure">Only if sure</SelectItem>
                                          <SelectItem value="ask_before">Ask before</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {permissionSource.isInherited && permissionSource.roleInfo ? (
                                      <div className="flex items-center gap-1">
                                        <Users className="h-3 w-3 text-muted-foreground" />
                                        <Link 
                                          href={`/workspaces/${workspaceId}/roles/${permissionSource.roleInfo.id}`}
                                          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                                        >
                                          {permissionSource.roleInfo.name}
                                          <ExternalLink className="h-3 w-3" />
                                        </Link>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1">
                                       <Shield className="h-3 w-3 text-muted-foreground" />
                                       <span className="text-xs text-muted-foreground">Self</span>
                                      </div>
                                    )}
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {/* Resources Table */}
                    {resources.length > 0 && (
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Database className="h-4 w-4" />
                          <h4 className="font-medium">Resources</h4>
                          <Badge variant="outline">{resources.length}</Badge>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Name</TableHead>
                              <TableHead>Description</TableHead>
                              <TableHead className="w-[140px]">Permission</TableHead>
                              <TableHead className="w-[120px]">Source</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {resources.map((resourceData: { reference: Resource }) => {
                              const resource = resourceData.reference
                              const currentPermission = getPermissionType(resource.permission)
                              const permissionSource = getPermissionSource(resource.permission)
                              const isChanging = changingPermissions.has(`${resource.path}-resource`)
                              
                              return (
                                <TableRow key={resource.path}>
                                  <TableCell className="font-medium">{highlightText(resource.label, searchTerm)}</TableCell>
                                  <TableCell className="text-sm text-muted-foreground max-w-md truncate">
                                    {highlightText(resource.description, searchTerm)}
                                  </TableCell>
                                  <TableCell>
                                    {permissionSource.isInherited ? (
                                      <Badge variant={getPermissionVariant(currentPermission)} className="opacity-75">
                                        {getPermissionLabel(currentPermission)}
                                      </Badge>
                                    ) : (
                                      <Select
                                        value={currentPermission}
                                        onValueChange={(value: PermissionType) =>
                                          handlePermissionChange(resource.path, "resource", value)
                                        }
                                        disabled={isChanging}
                                      >
                                        <SelectTrigger className={`w-[120px] ${isChanging ? 'opacity-50' : ''}`}>
                                          <SelectValue>
                                            {isChanging ? (
                                              <div className="flex items-center gap-2">
                                                <div className="h-3 w-3 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
                                                <span className="text-xs">Saving...</span>
                                              </div>
                                            ) : (
                                              <Badge variant={getPermissionVariant(currentPermission)}>
                                                {getPermissionLabel(currentPermission)}
                                              </Badge>
                                            )}
                                          </SelectValue>
                                        </SelectTrigger>
                                        <SelectContent>
                                          <SelectItem value="default">—</SelectItem>
                                          <SelectItem value="allowed">Allowed</SelectItem>
                                          <SelectItem value="unallowed">Unallowed</SelectItem>
                                          <SelectItem value="only_if_sure">Only if sure</SelectItem>
                                          <SelectItem value="ask_before">Ask before</SelectItem>
                                        </SelectContent>
                                      </Select>
                                    )}
                                  </TableCell>
                                  <TableCell>
                                    {permissionSource.isInherited && permissionSource.roleInfo ? (
                                      <div className="flex items-center gap-1">
                                        <Users className="h-3 w-3 text-muted-foreground" />
                                        <Link 
                                          href={`/workspaces/${workspaceId}/roles/${permissionSource.roleInfo.id}`}
                                          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1"
                                        >
                                          {permissionSource.roleInfo.name}
                                          <ExternalLink className="h-3 w-3" />
                                        </Link>
                                      </div>
                                    ) : (
                                      <div className="flex items-center gap-1">
                                        <Shield className="h-3 w-3 text-muted-foreground" />
                                        <span className="text-xs text-muted-foreground">Self</span>
                                      </div>
                                    )}
                                  </TableCell>
                                </TableRow>
                              )
                            })}
                          </TableBody>
                        </Table>
                      </div>
                    )}

                    {tools.length === 0 && resources.length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        {searchTerm.trim() 
                          ? <>No tools or resources match &ldquo;<mark className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">{searchTerm}</mark>&rdquo;</>
                          : "No tools or resources found for this MCP server."
                        }
                      </p>
                    )}
                  </div>
                </AccordionContent>
              </AccordionItem>
            )
          })}
        </Accordion>

        {/* No search results message */}
        {searchTerm.trim() && filteredServers.every(server => !server.hasMatches) && (
          <div className="text-center py-8">
            <Search className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No tools or resources match &ldquo;<mark className="bg-yellow-200 dark:bg-yellow-800 rounded px-0.5">{searchTerm}</mark>&rdquo;</p>
            <p className="text-xs text-muted-foreground mt-1">Try a different search term</p>
          </div>
        )}
      </CardContent>
    </Card>
  )
} 