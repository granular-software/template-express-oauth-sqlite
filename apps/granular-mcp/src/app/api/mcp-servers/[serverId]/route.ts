import { NextRequest, NextResponse } from 'next/server'
import { Client } from "@modelcontextprotocol/sdk/client/index.js"
import { StreamableHTTPClientTransport } from "@modelcontextprotocol/sdk/client/streamableHttp.js"
import {
  ListToolsResultSchema,
  ListResourcesResultSchema,
  ListResourceTemplatesResultSchema,
  type ListToolsRequest,
  type ListResourcesRequest,
  type ListResourceTemplatesRequest,
} from "@modelcontextprotocol/sdk/types.js"

interface ServerData {
  connectionStatus: 'connected' | 'error'
  tools: Array<{
    name: string
    description: string
    inputSchema?: any
  }>
  resources: Array<{
    uri: string
    name: string
    description: string
    mimeType: string
  }>
  resourceTemplates: Array<{
    uri: string
    name: string
    description: string
    mimeType: string
  }>
  metadata: {
    url: string
    connectedAt: string
    toolsCount?: number
    resourcesCount?: number
    resourceTemplatesCount?: number
    error?: string
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ serverId: string }> }
) {
  try {
    const { serverId } = await params

    // Get the server URL from the query parameter
    const url = request.nextUrl.searchParams.get('url')
    
    if (!url) {
      return NextResponse.json(
        { error: 'Server URL is required' },
        { status: 400 }
      )
    }

    // Validate URL format
    let mcpUrl: URL
    try {
      mcpUrl = new URL(url)
    } catch (urlError) {
      return NextResponse.json(
        { error: 'Invalid URL format' },
        { status: 400 }
      )
    }

    console.log(`Attempting to connect to MCP server at: ${mcpUrl.toString()}`)

    // Create MCP client and connect to the server
    const client = new Client({
      name: "granular-mcp-backend",
      version: "1.0.0",
    })

    const transport = new StreamableHTTPClientTransport(mcpUrl)

    try {
      // Connect to the MCP server
      console.log('Connecting to MCP server...')
      await client.connect(transport)
      console.log('Successfully connected to MCP server')

      const serverData: ServerData = {
        connectionStatus: 'connected',
        tools: [],
        resources: [],
        resourceTemplates: [],
        metadata: {
          url: mcpUrl.toString(),
          connectedAt: new Date().toISOString(),
        }
      }

      // Fetch tools
      try {
        console.log('Fetching tools...')
        const toolsRequest: ListToolsRequest = {
          method: "tools/list",
          params: {},
        }
        const toolsResult = await client.request(toolsRequest, ListToolsResultSchema)
        serverData.tools = toolsResult.tools.map((tool: any) => ({
          name: tool.name,
          description: tool.description,
          inputSchema: tool.inputSchema,
        }))
        console.log(`Found ${serverData.tools.length} tools`)
      } catch (toolsError) {
        console.warn("Could not fetch tools:", toolsError)
        serverData.tools = []
      }

      // Fetch resources
      try {
        console.log('Fetching resources...')
        const resourcesRequest: ListResourcesRequest = {
          method: "resources/list",
          params: {},
        }
        const resourcesResult = await client.request(resourcesRequest, ListResourcesResultSchema)
        serverData.resources = resourcesResult.resources.map((resource: any) => ({
          uri: resource.uri,
          name: resource.name,
          description: resource.description,
          mimeType: resource.mimeType,
        }))
        console.log(`Found ${serverData.resources.length} resources`)
      } catch (resourcesError) {
        console.warn("Could not fetch resources:", resourcesError)
        serverData.resources = []
      }

      // Fetch resource templates
      try {
        console.log('Fetching resource templates...')
        const resourceTemplatesRequest: ListResourceTemplatesRequest = {
          method: "resources/templates/list",
          params: {},
        }
        const resourceTemplatesResult = await client.request(resourceTemplatesRequest, ListResourceTemplatesResultSchema)
        serverData.resourceTemplates = resourceTemplatesResult.resourceTemplates.map((template: any) => ({
          uri: template.uri,
          name: template.name,
          description: template.description,
          mimeType: template.mimeType,
        }))
        console.log(`Found ${serverData.resourceTemplates.length} resource templates`)
      } catch (templatesError) {
        console.warn("Could not fetch resource templates:", templatesError)
        serverData.resourceTemplates = []
      }

      // Update metadata with counts
      serverData.metadata = {
        ...serverData.metadata,
        toolsCount: serverData.tools.length,
        resourcesCount: serverData.resources.length,
        resourceTemplatesCount: serverData.resourceTemplates.length,
      }

      // Close the connection
      await transport.close()
      console.log('MCP connection closed')

      return NextResponse.json(serverData)

    } catch (connectionError) {
      console.warn("Could not connect to MCP server:", connectionError)
      
      const errorData: ServerData = {
        connectionStatus: 'error',
        tools: [],
        resources: [],
        resourceTemplates: [],
        metadata: {
          url: mcpUrl.toString(),
          error: connectionError instanceof Error ? connectionError.message : "Connection failed",
          connectedAt: new Date().toISOString(),
        }
      }
      
      return NextResponse.json(errorData)
    }

  } catch (error) {
    console.error("Error in MCP server API route:", error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
} 