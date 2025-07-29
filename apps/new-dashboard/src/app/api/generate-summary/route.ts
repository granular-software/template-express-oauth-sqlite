import { NextRequest, NextResponse } from 'next/server'
import { createOpenAIClient, getModelName } from '@/lib/openai-config'

interface Permission {
  path: string
  type: 'tool' | 'resource'
  name: string
  description: string
  permission: 'allowed' | 'unallowed' | 'only_if_sure' | 'ask_before' | 'default'
  source: 'agent' | 'role'
  roleInfo?: {
    id: string
    name: string
  }
}

interface SummaryRequest {
  agentId: string
  agentName: string
  permissions: Permission[]
}

export async function POST(request: NextRequest) {
  console.log('🤖 SUMMARY API: Starting summary generation request')
  
  try {
    const body: SummaryRequest = await request.json()
    const { agentId, agentName, permissions } = body

    console.log('🤖 SUMMARY API: Request data:', {
      agentId,
      agentName,
      permissionsCount: permissions?.length || 0
    })

    if (!agentId || !permissions) {
      console.log('❌ SUMMARY API: Missing required fields')
      return NextResponse.json(
        { error: 'Agent ID and permissions are required' },
        { status: 400 }
      )
    }

    // Filter out default permissions and organize by type
    const activePermissions = permissions.filter(p => p.permission !== 'default')
    
    const allowedTools = activePermissions.filter(p => p.type === 'tool' && p.permission === 'allowed')
    const allowedResources = activePermissions.filter(p => p.type === 'resource' && p.permission === 'allowed')
    const restrictedItems = activePermissions.filter(p => ['unallowed', 'only_if_sure', 'ask_before'].includes(p.permission))
    
    const directPermissions = activePermissions.filter(p => p.source === 'agent')
    const inheritedPermissions = activePermissions.filter(p => p.source === 'role')
    const inheritedRoles = [...new Set(inheritedPermissions.map(p => p.roleInfo?.name).filter(Boolean))]

    console.log('🤖 SUMMARY API: Permission analysis:', {
      totalPermissions: permissions.length,
      activePermissions: activePermissions.length,
      allowedTools: allowedTools.length,
      allowedResources: allowedResources.length,
      restrictedItems: restrictedItems.length,
      directPermissions: directPermissions.length,
      inheritedPermissions: inheritedPermissions.length,
      inheritedRoles: inheritedRoles.length
    })

    if (activePermissions.length === 0) {
      console.log('⚠️ SUMMARY API: No active permissions found, skipping AI call')
      return NextResponse.json({
        summary: `${agentName} currently has no active permissions configured.`,
        success: true,
        fallback: true
      })
    }

    const systemMessage = `You are an expert at creating concise, clear summaries of agent permissions for MCP (Model Context Protocol) servers. 
Your goal is to provide a VERY CLEAR and ACCURATE summary of what an agent is allowed to do.
The summary should be short (max 3-4 sentences), easily understandable, and focused on capabilities rather than technical details.`

    const prompt = `Generate a clear, concise summary of what the agent "${agentName}" is allowed to do based on these MCP server permissions:

ALLOWED TOOLS (${allowedTools.length}):
${allowedTools.map(p => `- ${p.name}: ${p.description} (${p.source === 'role' ? `from role: ${p.roleInfo?.name}` : 'direct'})`).join('\n')}

ALLOWED RESOURCES (${allowedResources.length}):
${allowedResources.map(p => `- ${p.name}: ${p.description} (${p.source === 'role' ? `from role: ${p.roleInfo?.name}` : 'direct'})`).join('\n')}

RESTRICTED ITEMS (${restrictedItems.length}):
${restrictedItems.map(p => `- ${p.name}: ${p.permission} (${p.source === 'role' ? `from role: ${p.roleInfo?.name}` : 'direct'})`).join('\n')}

INHERITED FROM ROLES: ${inheritedRoles.length > 0 ? inheritedRoles.join(', ') : 'None'}
DIRECT PERMISSIONS: ${directPermissions.length} items

Requirements:
- Maximum 3-4 sentences
- Focus on what the agent CAN do, not technical restrictions
- Mention both direct permissions and inherited role permissions if significant
- Use clear, non-technical language
- Be specific about capabilities, avoid generic statements

Respond with a JSON object: {"summary": "your summary here"}`

    try {
      console.log('🤖 SUMMARY API: Calling OpenAI with model:', getModelName())
      const openai = createOpenAIClient()
      
      const response = await openai.chat.completions.create({
        model: getModelName(), // Use configured model (gpt-4.1-mini by default)
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt }
        ],
        temperature: 0.3,
        response_format: { type: "json_object" }
      })

      console.log('🤖 SUMMARY API: OpenAI response received')
      const content = response.choices[0]?.message?.content
      if (!content) {
        throw new Error("No response from OpenAI")
      }

      console.log('🤖 SUMMARY API: Raw OpenAI content:', content)
      const result = JSON.parse(content)
      
      console.log('✅ SUMMARY API: Successfully generated summary:', result.summary?.substring(0, 100) + '...')
      return NextResponse.json({
        summary: result.summary,
        success: true
      })

    } catch (aiError) {
      console.error("❌ SUMMARY API: OpenAI API error:", aiError)
      
      // Fallback summary generation
      const toolCount = allowedTools.length
      const resourceCount = allowedResources.length
      const roleContext = inheritedRoles.length > 0 ? ` and inherits additional capabilities from ${inheritedRoles.join(', ')} role${inheritedRoles.length > 1 ? 's' : ''}` : ''
      
      const fallbackSummary = `${agentName} has access to ${toolCount} tool${toolCount !== 1 ? 's' : ''} and ${resourceCount} resource${resourceCount !== 1 ? 's' : ''} across MCP servers${roleContext}. The agent can perform various operations based on the configured permissions${restrictedItems.length > 0 ? `, with some restrictions on ${restrictedItems.length} item${restrictedItems.length !== 1 ? 's' : ''}` : ''}.`
      
      console.log('⚠️ SUMMARY API: Using fallback summary:', fallbackSummary)
      return NextResponse.json({
        summary: fallbackSummary,
        success: true,
        fallback: true
      })
    }

  } catch (error) {
    console.error("❌ SUMMARY API: Critical error in summary generation:", error)
    return NextResponse.json(
      { error: 'Failed to generate summary' },
      { status: 500 }
    )
  }
} 