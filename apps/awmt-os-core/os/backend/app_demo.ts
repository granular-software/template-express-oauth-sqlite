import { BaseAstNode, RenderParams, ViewNode } from "./common_types";
// Import other necessary types and functions from your existing OS structure
// For example, if you have specific AST node types for Page, ObjectType, etc.,
// you might import them here.
// For now, we'll define some basic ones for the demo.

// --- 📐 0. System & Brief-specific Types ---
import { createOpenAIClient, getModelName } from "../config/modelConfig"; // Added
import { jsonrepair } from "jsonrepair"; // Added
import * as fs from "fs"; // Added for LLM call logging
import * as path from "path"; // Added for path handling

// Utility function to save LLM calls to files
function saveLlmCall(promptKey: string, input: any, output: any) {
  try {
    // Create @llm_calls directory if it doesn't exist
    const llmCallsDir = path.join(process.cwd(), '@llm_calls');
    if (!fs.existsSync(llmCallsDir)) {
      fs.mkdirSync(llmCallsDir, { recursive: true });
    }

    // Generate a unique filename based on timestamp and prompt key
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = path.join(llmCallsDir, `${timestamp}_${promptKey.replace(/\s+/g, '_')}.json`);

    // Create content object
    const content = {
      timestamp: new Date().toISOString(),
      promptKey,
      input,
      output
    };

    // Write to file
    fs.writeFileSync(filename, JSON.stringify(content, null, 2));
    console.log(`   LLM call saved to ${filename}`);
  } catch (error) {
    console.error(`   Error saving LLM call to file: ${error}`);
  }
}

// Helper function to generate UUID v4
function uuidv4(): string {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0,
          v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Enhance BaseAstNode for the demo to include status and potentially props if not inherent
interface AppBuilderAstNode extends BaseAstNode {
  status: "new" | "pending" | "done" | "error"; // Status from the brief
  props?: Record<string, any>; // Explicit props field as per the brief
  // Potentially add 'name' for ObjectType, 'route'/'layout' for Page, etc.
  // or handle these within the props object.
  name?: string; // For ObjectType
  fields?: string[]; // For ObjectType
  route?: string; // For Page
  layout?: string; // For Page
  children?: AppBuilderAstNode[]; // Ensure children are of AppBuilderAstNode type
}

interface AgentState {
  ast: AppBuilderAstNode; // The root of our application's AST
  registry: Record<string, any>; // e.g., component registry, type definitions
  logs: string[];
  openQuestions: string[];
}

// Define a simplified LLM interface for the demo
interface LlmInterface {
  call: (fixedPrompt: string, dynamicContext: Record<string, any>) => Promise<any>;
}

// --- Initial Data & Prompts (as per brief) ---
// This needs to be defined before gpt4MiniLlm if it's used by it.
const USER_INTENT = "Organiser mon voyage au Japon";
const AVAILABLE_BLOCKS = ["ObjectType", "Page", "Tabs", "SplitView", "ListView", "FormView", "CalendarView", "BoardView"];

// Define short keys for LLM prompts (translated to English)
const LLM_PROMPT_KEY_SKELETON = "Macro Skeleton";
const LLM_PROMPT_KEY_STRUCTURE_PAGE = "Structure Page X";
const LLM_PROMPT_KEY_COMPLETE_NODE = "Complete Node Y";

const DYNAMIC_CONTEXT_PHASE_1 = { user_intent: USER_INTENT, blocks: AVAILABLE_BLOCKS };

// Real LLM (GPT-4.1 Mini as requested)
const gpt4MiniLlm: LlmInterface = {
  call: async (fixedPromptKey: string, dynamicContext: Record<string, any>): Promise<any> => {
    const openai = createOpenAIClient();
    const model = getModelName() || "gpt-4.1-mini"; // Fallback if getModelName is not configured

    console.log(`\n🤖 Calling Real LLM (${model})...`);
    console.log("   Fixed Prompt Key (maps to internal prompt):", fixedPromptKey);
    console.log("   Dynamic Context:", JSON.stringify(dynamicContext));
    
    let systemMessage = "";
    let userPrompt = "";
    let expectJsonArray = false; // Flag for phase 1

    // Determine messages based on the old fixedPrompt logic
    if (fixedPromptKey.includes("Macro Skeleton")) { // PHASE 1
      expectJsonArray = true;
      systemMessage = "You are an expert application generator. Based on a user intent and a catalog of available building blocks, you must provide a summary AST (Abstract Syntax Tree). This AST should list the main business entities and pages of the application with a basic structure (layout). Return the response as a JSON array of node objects. Each object must have a 'type' property, 'name', and other relevant properties such as 'fields' for an ObjectType or 'route', 'layout' for a Page. Make sure that 'props' is an empty object if no specific properties are defined. The JSON must be a direct array, without a wrapping root key.";
      userPrompt = `
User Intent: "${dynamicContext.user_intent}"
Available Blocks: ${JSON.stringify(dynamicContext.blocks)}

Generate the initial AST skeleton.
Produce a direct JSON array of objects. For example:
[
  { "type":"ObjectType","name":"Activity","fields":["name","date","location"], "props": {} },
  { "type":"ObjectType","name":"Place","fields":["name","city","category"], "props": {} },
  { "type":"Page","name":"ActivitiesPage", "route":"/activities","layout":"SplitView", "props": {"layout":"SplitViewInitial"} }
]`;
    } else if (fixedPromptKey.includes("Structure Page X")) { // PHASE 2
      const focusNode = dynamicContext.focus as AppBuilderAstNode;
      systemMessage = "You are an expert UI/UX designer specialized in structuring application pages. Given a Page node of an AST, its current context in the application, and the available UI blocks, your task is to refine its layout and add appropriate child components. Return a single JSON object representing the *updated* Page node. The object must include 'uuid' (from the original page), 'node_type' ('Page'), 'props' (updated layout, etc.), 'children' (new child nodes created), and 'status' ('done'). Child nodes must also have 'status':'done'.";
      userPrompt = `
Focus Page Node to Structure:
${JSON.stringify(focusNode)}

Current Complete AST (for context):
${JSON.stringify(dynamicContext.ast)}

Available UI Blocks:
${JSON.stringify(dynamicContext.blocks)}

Based on the focus page name ("${focusNode.name}"), the current number of children (${focusNode.children?.length || 0}), and the global application context, decide on an appropriate layout (e.g., 'SplitView_Refined', 'Tabs_Refined') and add relevant child components (e.g., 'ListView', 'DetailView' for SplitView; 'TabItem' for Tabs).

For example, to structure a page named 'ActivitiesPage' that resembles a list-detail view:
{
  "uuid": "${focusNode.uuid}",
  "node_type": "Page",
  "props": { "layout": "SplitView_Refined", "detail": "Layout structured by LLM for Activities." },
  "children": [
    { "uuid": "llm-child-uuid-1", "node_type": "ListView", "props": {"itemName":"ActivitiesList", "source":"activities"}, "children": [], "status":"done" },
    { "uuid": "llm-child-uuid-2", "node_type": "DetailView", "props": {"itemName":"SelectedActivity", "source":"selected_activity"}, "children": [], "status":"done" }
  ],
  "status": "done"
}

Make sure that the child nodes you create also have a unique 'uuid' (you can generate a simple one like 'llm-child-[random_string]'), 'node_type', 'props', 'children': [], and 'status': 'done'.
Return only the JSON object for the updated Page node.`;
    } else if (fixedPromptKey.includes("Complete Node Y")) { // PHASE 3
      const focusNode = dynamicContext.focus as AppBuilderAstNode;
      systemMessage = "You are an AI assistant that completes and refines nodes in an application's Abstract Syntax Tree (AST). Given a specific leaf node, add relevant details such as fields (for ObjectTypes), properties (for UI components), or content. Return a single JSON object representing the *updates* to apply to the node. This object must include the 'uuid' of the focus node and all properties that should be modified or added (e.g., 'fields', 'props'). Also include 'status': 'done'.";
      userPrompt = `
Leaf Node to Complete:
${JSON.stringify(focusNode)}

Current Complete AST (for context, if needed):
${JSON.stringify(dynamicContext.ast)}

Available UI Blocks (if relevant for creation/configuration):
${JSON.stringify(dynamicContext.blocks)}

Complete the details for the focus node ("${focusNode.name || focusNode.uuid}", type: "${focusNode.node_type}").
- If it's an ObjectType, suggest additional relevant 'fields'.
- If it's a UI component like ListView or TextView, suggest relevant 'props' (e.g., displayColumns, content, styling).

For example, to complete a "User" ObjectType with the fields ["username"]:
{
  "uuid": "${focusNode.uuid}",
  "fields": ["username", "email", "firstName", "lastName"],
  "props": { "details_completed_by_llm": true },
  "status": "done"
}

Or, to complete a ListView:
{
  "uuid": "${focusNode.uuid}",
  "props": { "displayColumns": ["name", "date"], "sortable": true, "filterable": true, "completed_by_llm": true },
  "status": "done"
}
Return only the JSON object with the updates.`;
    } else {
      console.warn(`   LLM Prompt key not recognized: ${fixedPromptKey}`);
      return { uuid: dynamicContext.focus?.uuid, message: "LLM prompt key not recognized.", status: "error" };
    }

    // Prepare input object for logging
    const inputForLogging = {
      model,
      messages: [
        { role: "system", content: systemMessage },
        { role: "user", content: userPrompt },
      ],
      temperature: 0.7,
      response_format: { type: "json_object" }
    };

    try {
      const response = await openai.chat.completions.create({
        model: model,
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7, // Common temperature from app_builder_agent
        response_format: { type: "json_object" }, // Expect JSON
        // stream: false, // app_builder_agent sometimes streams, but demo expects direct result.
      });

      let content = response.choices[0]?.message?.content || "";
      console.log("   Raw LLM Response:", content);

      if (!content) {
        throw new Error("LLM returned empty content.");
      }
      
      // Attempt to repair and parse
      try {
        content = jsonrepair(content);
      } catch (repairError) {
        console.error("   JSONRepair failed:", repairError);
        // Proceed with original content if repair fails
      }

      const jsonData = JSON.parse(content);

      // Save LLM call to file
      saveLlmCall(fixedPromptKey, inputForLogging, {
        raw_response: content,
        parsed_response: jsonData
      });

      // If phase 1 expects an array, but json_object type might wrap it.
      // E.g. { "nodes": [...] } or { "result": [...] }
      // The prompt for phase 1 now requests a direct array.
      // If it's still wrapped, we might need to adjust this part or the prompt.
      if (expectJsonArray) {
        if (Array.isArray(jsonData)) {
          console.log("   Parsed LLM Response (Array):", JSON.stringify(jsonData));
          return jsonData;
        } else if (typeof jsonData === 'object' && jsonData !== null) {
            // Check if it's a single object that should have been an array (e.g. a single root node for skeleton)
            // A common case might be if the LLM returns one primary object when asked for a list.
            if (jsonData.type && jsonData.name) { // Heuristic: if it looks like one of our AST nodes
                console.log("   LLM Response for Phase 1 was a single object, wrapping in an array:", JSON.stringify([jsonData]));
                return [jsonData]; // Wrap the single object in an array
            }
            // Attempt to find an array in the first value of the object if it's not directly an array
            const keys = Object.keys(jsonData);
            if (keys.length === 1 && Array.isArray(jsonData[keys[0]])) {
                 console.log(`   Parsed LLM Response (Wrapped Array under key '${keys[0]}'):`, JSON.stringify(jsonData[keys[0]]));
                 return jsonData[keys[0]];
            }
        }
        console.error("   LLM Response for Phase 1 was not a direct array, a recognized single object, or a recognized wrapped array:", jsonData);
        throw new Error("Phase 1 LLM response was not in the expected array format and could not be automatically corrected.");
      }
      
      console.log("   Parsed LLM Response (Object):", JSON.stringify(jsonData));
      return jsonData;

    } catch (error) {
      console.error("   Error calling LLM or parsing response:", error);
      
      // Save error to file
      saveLlmCall(fixedPromptKey, inputForLogging, {
        error: (error as Error).message
      });
      
      // Return an error structure compatible with how the demo handles failed steps
      return { 
        uuid: dynamicContext.focus?.uuid || `error-node-${Date.now()}`, 
        message: `LLM call failed: ${(error as Error).message}`, 
        status: "error" 
      };
    }
  }
};

// --- ⚙️ AST Engine (Simplified) ---
const astEngine = {
  createNode: (type: string, props: Record<string, any> = {}, children: AppBuilderAstNode[] = []): AppBuilderAstNode => {
    // Ensure children are also AppBuilderAstNodes and properly initialized
    const initializedChildren = children.map(child => (
        // Use existing child.uuid if present during recursive creation, otherwise generate new
        // This part seems to handle re-creation. The main UUID is for brand new nodes.
        ({
          ...astEngine.createNode(child.node_type, child.props, child.children),
          uuid: child.uuid || uuidv4(),
          status: child.status || "new"
        })
    ));
    return {
      uuid: uuidv4(), // Use new uuidv4 function here
      node_type: type,
      props,
      children: initializedChildren,
      status: "new",
    };
  },

  applySkeleton: (currentAst: AppBuilderAstNode, skeletonNodes: Partial<AppBuilderAstNode>[]): AppBuilderAstNode => {
    console.log("   Applying skeleton to AST...");
    const newChildren: AppBuilderAstNode[] = skeletonNodes.map(nodeInfo => ({
      uuid: uuidv4(), // Use new uuidv4 function here
      node_type: nodeInfo.node_type!,
      props: nodeInfo.props || {},
      name: nodeInfo.name, // For ObjectType
      fields: nodeInfo.fields, // For ObjectType
      route: nodeInfo.route, // For Page
      layout: nodeInfo.layout, // For Page
      children: (nodeInfo.children || []).map(child => astEngine.createNode(child.node_type, child.props, child.children)), // Recursively create children if any
      status: "pending" // Skeleton nodes start as pending for refinement
    }));
    currentAst.children = [...(currentAst.children || []), ...newChildren];
    console.log("   Skeleton applied. AST updated.");
    return currentAst;
  },

  findNodeById: (ast: AppBuilderAstNode, uuid: string): AppBuilderAstNode | null => {
    if (ast.uuid === uuid) return ast;
    if (ast.children) {
      for (const child of ast.children) { // Iterating over AppBuilderAstNode children
        const found = astEngine.findNodeById(child, uuid); // Recursive call with AppBuilderAstNode
        if (found) return found;
      }
    }
    return null;
  },
  
  updateNode: (ast: AppBuilderAstNode, uuid: string, updates: Partial<AppBuilderAstNode>): AppBuilderAstNode => {
    const node = astEngine.findNodeById(ast, uuid);
    if (node) {
      for (const key in updates) {
        if (Object.prototype.hasOwnProperty.call(updates, key)) {
          if (key === "children" && Array.isArray((updates as any)[key])){
             // When updating children, map them to ensure they are full AppBuilderAstNode instances if they are partial
             (node as any)[key] = ((updates as any)[key] as Partial<AppBuilderAstNode>[]).map(
                (childUpdate) => {
                    // If childUpdate has a UUID and exists, update it. Otherwise, create new.
                    const existingChild = childUpdate.uuid ? node.children?.find(c => c.uuid === childUpdate.uuid) : undefined;
                    if (existingChild) {
                        // This is a shallow merge for existing children, deep merge might be needed
                        return {...existingChild, ...childUpdate, status: childUpdate.status || existingChild.status };
                    }
                    return astEngine.createNode(childUpdate.node_type!, childUpdate.props, childUpdate.children as AppBuilderAstNode[]);
                }
             );
          } else {
            (node as any)[key] = (updates as any)[key];
          }
        }
      }
      // Ensure status is explicitly set if provided in updates
      if (updates.status) node.status = updates.status;

      console.log(`   Node ${uuid} updated with ${Object.keys(updates).join(', ')}. New status: ${node.status}`);
    } else {
      console.warn(`   Node ${uuid} not found for update.`);
    }
    return ast;
  },

  // Refined selectMacroFocus
  selectMacroFocus: (ast: AppBuilderAstNode): AppBuilderAstNode | null => {
    if (!ast.children) return null;
    
    // Priority 1: Pending Pages with initial/generic layout or no children
    for (const child of ast.children) {
      if (child.node_type === "Page" && child.status === "pending") {
        if ((child.layout?.endsWith("Initial") || child.layout === "generic" || !child.layout) || (!child.children || child.children.length === 0)) {
          console.log(`   Macro Focus: Selected Page "${child.name || child.uuid}" for layout refinement.`);
          return child;
        }
      }
    }

    // Priority 2: Pending ObjectTypes with minimal fields (e.g., < 3)
    for (const child of ast.children) {
      if (child.node_type === "ObjectType" && child.status === "pending") {
        if (!child.fields || child.fields.length < 3) {
          console.log(`   Macro Focus: Selected ObjectType "${child.name || child.uuid}" for field completion.`);
          return child;
        }
      }
    }
    // console.log("   Macro Focus: No specific macro target found.");
    return null;
  },

  // Refined selectNextLeaf (DFS for pending nodes)
  selectNextLeaf: (ast: AppBuilderAstNode): AppBuilderAstNode | null => {
    function findPendingDFS(node: AppBuilderAstNode): AppBuilderAstNode | null {
        if (node.status === "pending") return node;
        if (node.children) {
            for (const child of node.children) {
                // Continue traversal if the parent node is not in a blocking error state for its children.
                // A node with status "error" might still have valid pending children if the error was specific to the node itself.
                // However, for simplicity in this demo, we only traverse if parent is not 'error'.
                if (node.status !== "error") { // Changed condition here
                    const found = findPendingDFS(child);
                    if (found) return found;
                }
            }
        }
        return null;
    }
    const leaf = findPendingDFS(ast);
    return leaf;
  },

  // New helper function
  inferMacroGoal: (focusNode: AppBuilderAstNode, ast: AppBuilderAstNode): { action: string; details?: any; needsLLM: boolean; targetUuid: string } => {
    let goal: { action: string; details?: any; needsLLM: boolean; targetUuid: string } = 
        { action: "unknown", needsLLM: true, targetUuid: focusNode.uuid, details: {} };

    if (focusNode.node_type === "Page") {
      const childCount = focusNode.children?.length || 0;
      // Rule-based: Convert to Tabs if too many direct children and not already Tabs-like
      if (childCount > 2 && focusNode.layout && !focusNode.layout.startsWith("Tabs") && focusNode.children?.every(c => c.node_type !== "TabItem")) {
        goal.action = "convert_to_tabs_layout";
        goal.details = { reason: `Page has ${childCount} children, suggesting Tabs.`, currentLayout: focusNode.layout };
        goal.needsLLM = false; // This can be a rule-based action
      } else if (!focusNode.children || childCount === 0 || focusNode.layout?.endsWith("Initial") || focusNode.layout === "generic") {
        goal.action = "refine_page_layout_llm"; // LLM to decide specifics like SplitView vs Tabs based on page name/context
        goal.details = { currentLayout: focusNode.layout, childCount };
        goal.needsLLM = true;
      } else {
        goal.action = "review_page_structure"; // Generic review if no obvious rule/initial state
        goal.details = { currentLayout: focusNode.layout, childCount };
        goal.needsLLM = true;
      }
    } else if (focusNode.node_type === "ObjectType") {
      goal.action = "complete_object_fields";
      goal.details = { currentFieldCount: focusNode.fields?.length || 0 };
      goal.needsLLM = true; 
    }
    console.log(`   Inferred Macro Goal for ${focusNode.uuid} (${focusNode.node_type}): ${goal.action}, Needs LLM: ${goal.needsLLM}, Details: ${JSON.stringify(goal.details)}`);
    return goal;
  },

  // New helper function
  inferMicroGoal: (leafNode: AppBuilderAstNode, ast: AppBuilderAstNode): { action: string; details?: any; needsLLM: boolean; targetUuid: string } => {
    let goal: { action: string; details?: any; needsLLM: boolean; targetUuid: string } = 
        { action: "unknown", needsLLM: true, targetUuid: leafNode.uuid, details: {} };

    if (leafNode.node_type === "ObjectType") {
      goal.details = { currentFieldCount: leafNode.fields?.length || 0 };
      // Check if a form might be needed for this ObjectType (if no Page seems to be using it in a FormView yet)
      const isUsedInForm = astEngine.findNodeByTypeAndProps(ast, "FormView", { entity: leafNode.name }) !== null;
      if (!isUsedInForm && (leafNode.fields?.length || 0) > 1) { // Only suggest form if it has some fields and no existing form
        goal.action = "generate_form_for_object";
        goal.needsLLM = false; // This can be a rule-based action to create a basic form structure
      } else {
        goal.action = "add_object_fields"; // Default to adding fields if form not suitable or already exists
        goal.needsLLM = (leafNode.fields?.length || 0) < 3; // Rule for basic fields (id, ts), LLM for more
      }
    } else if (leafNode.node_type === "Page") {
      goal.action = "refine_page_content"; 
      goal.needsLLM = true;
    } else if (["ListView", "DetailView", "TextView", "TabItem"].includes(leafNode.node_type)) {
      goal.action = `configure_${leafNode.node_type.toLowerCase()}`;
      goal.needsLLM = true; 
    } else {
      goal.action = "generic_complete_node";
      goal.needsLLM = true;
    }
    console.log(`   Inferred Micro Goal for ${leafNode.uuid} (${leafNode.node_type}): ${goal.action}, Needs LLM: ${goal.needsLLM}`);
    return goal;
  },

  findNodeByTypeAndProps: (astNode: AppBuilderAstNode, type: string, propsToMatch: Record<string, any>): AppBuilderAstNode | null => {
    if (astNode.node_type === type) {
        let allMatch = true;
        for (const key in propsToMatch) {
            if (astNode.props?.[key] !== propsToMatch[key]) {
                allMatch = false;
                break;
            }
        }
        if (allMatch) return astNode;
    }
    if (astNode.children) {
        for (const child of astNode.children) {
            const found = astEngine.findNodeByTypeAndProps(child, type, propsToMatch);
            if (found) return found;
        }
    }
    return null;
  },

  isComplete: (ast: AppBuilderAstNode): boolean => {
    function checkCompletion(node: AppBuilderAstNode): boolean {
        if (node.status === "pending" || node.status === "new") return false;
        if (node.children) {
            for (const child of node.children) { // child is AppBuilderAstNode
                if (!checkCompletion(child)) return false;
            }
        }
        return true;
    }
    const complete = checkCompletion(ast);
    // if(complete) console.log("AST isComplete: true"); else console.log("AST isComplete: false");
    return complete;
  },

  removeNode: (rootNode: AppBuilderAstNode, uuidToRemove: string): boolean => {
    if (!rootNode.children) return false;
    const childIndex = rootNode.children.findIndex(child => child.uuid === uuidToRemove);
    if (childIndex !== -1) {
        rootNode.children.splice(childIndex, 1);
        console.log(`   AST Engine: Removed node ${uuidToRemove} from parent ${rootNode.uuid}`);
        return true;
    }
    for (const child of rootNode.children) {
        if (astEngine.removeNode(child, uuidToRemove)) {
            return true;
        }
    }
    return false;
  }
};

// --- Rules Engine (Enhanced) ---
const rulesEngine = {
  applyRuleBasedMacro: (goal: {action: string, details?: any, needsLLM?: boolean, targetUuid: string}, ast: AppBuilderAstNode): Partial<AppBuilderAstNode> | null => {
    const focusNode = astEngine.findNodeById(ast, goal.targetUuid);
    if (!focusNode) return null;

    console.log(`   Attempting Rule-Based Macro for goal: "${goal.action}" on node ${focusNode.uuid} (${focusNode.node_type})`);

    if (goal.action === "convert_to_tabs_layout" && focusNode.node_type === "Page" && focusNode.children) {
        console.log(`   Rule Applied: Converting Page "${focusNode.name || focusNode.uuid}" to Tabs layout due to ${focusNode.children.length} children.`);
        const newTabItems = focusNode.children.map((child, index) => 
            astEngine.createNode("TabItem", {label: child.name || child.props?.title || `Tab ${index + 1}`}, [child])
        );
        newTabItems.forEach(ti => ti.status = "done"); // Children moved into tabs are considered structured.
        return {
          uuid: focusNode.uuid,
          props: { ...focusNode.props, layout: "Tabs_Converted_Rule" },
          children: newTabItems,
          status: "done" as const
        };
    }
    // Removed the old suggest_tabs_for_many_items rule as it's now covered by convert_to_tabs_layout logic in inferMacroGoal + this rule

    console.log(`   Rule-Based Macro: No specific rule matched for goal "${goal.action}" or conditions not met.`);
    return null;
  },

  applyRuleBasedMicro: (goal: {action: string, details?: any, needsLLM?: boolean, targetUuid: string}, ast: AppBuilderAstNode): Partial<AppBuilderAstNode> | null => {
    const leafNode = astEngine.findNodeById(ast, goal.targetUuid);
    if (!leafNode) return null;
    
    console.log(`   Attempting Rule-Based Micro for goal: "${goal.action}" on leaf ${leafNode.uuid} (${leafNode.node_type})`);

    if (goal.action === "add_object_fields" && leafNode.node_type === "ObjectType") {
      let currentFields = leafNode.fields ? [...leafNode.fields] : [];
      let changed = false;
      if (!currentFields.includes("id")) { currentFields.unshift("id"); changed = true; }
      if (!currentFields.includes("createdAt")) { currentFields.push("createdAt"); changed = true; }
      if (!currentFields.includes("updatedAt")) { currentFields.push("updatedAt"); changed = true; }

      if (changed) {
        console.log(`   Rule Applied: Added default fields (id, createdAt, updatedAt) to ObjectType "${leafNode.name}".`);
        return { uuid: leafNode.uuid, fields: currentFields, status: "done" as const };
      } else {
        console.log(`   Rule Condition: Default fields already exist on ObjectType "${leafNode.name}". No changes made by rule.`);
        if (goal.needsLLM === false) return { uuid: leafNode.uuid, status: "done" as const }; 
      }
    } else if (goal.action === "generate_form_for_object" && leafNode.node_type === "ObjectType" && leafNode.name) {
        // This rule creates a new Page node with a FormView for the ObjectType.
        // It doesn't modify the ObjectType node itself, but adds a new Page to the root of the AST.
        console.log(`   Rule Applied: Generating a new Page with FormView for ObjectType "${leafNode.name}".`);
        const formViewNode = astEngine.createNode("FormView", { entity: leafNode.name, fields: leafNode.fields || [] });
        formViewNode.status = "done";
        const newPageNode = astEngine.createNode(
            `Page_${leafNode.name}Form`,
            { layout: "SingleView", name: `${leafNode.name} Form Page`, route: `/${leafNode.name.toLowerCase()}/new` },
            [formViewNode]
        );
        newPageNode.status = "done";

        // We need to add this new page to the main AST (e.g., as a child of AppRoot)
        // For simplicity, this rule returns an object that signals this intent to the main loop.
        // The main loop would then have to handle adding this as a new top-level page.
        // This is a bit more complex than typical micro-refinements that modify the leaf itself.
        // Alternative: The rule could return a special instruction or the main loop checks for such results.
        // For this demo, we'll make it a NO-OP that logs, as adding to root from here is tricky without modifying astEngine.updateNode or the main loop significantly.
        // To make it truly work, we'd probably have the rule return a more complex 'effect' object.
        console.log("   (SIMULATED) Rule would create a new Page with FormView. Actual AST addition needs main loop support.");
        // Mark the ObjectType as done for this specific goal to avoid looping if needsLLM was false.
        if (goal.needsLLM === false) return { uuid: leafNode.uuid, status: "done" as const, props: {...leafNode.props, form_generation_attempted: true } }; 
        return null; // No direct modification to the leafNode itself by this log-only version.
    }
    console.log(`   Rule-Based Micro: No specific rule matched for goal "${goal.action}" or conditions not met.`);
    return null;
  }
};

// --- Evaluator (Enhanced) ---
const evaluator = {
  evaluateStep: (stepResult: Partial<AppBuilderAstNode> | null, goalAction?: string): number => {
    console.log(`   Evaluating step result for action "${goalAction || 'unknown'}":`, JSON.stringify(stepResult));
    if (!stepResult || !stepResult.uuid) return 0.1; // No result or no target UUID
    if (stepResult.status === "error") return 0.0;

    let score = 0.4; // Base score for a valid step that isn't an error

    if (stepResult.props && Object.keys(stepResult.props).length > 0) {
      score += 0.1;
      // Specific prop checks based on goal
      if (goalAction === "refine_page_layout_llm" && stepResult.props.layout && !stepResult.props.layout.endsWith("Initial")) {
        score += 0.15; // Good layout change
      }
      if (goalAction === "generate_form_for_object" && stepResult.props.form_generation_attempted === true) {
        score += 0.2; // Rule for form generation was correctly marked
      }
    }

    if (stepResult.children && stepResult.children.length > 0) {
      score += 0.2;
      if (goalAction === "refine_page_layout_llm" && stepResult.children.length >= 2) {
        score += 0.15; // Bonus for adding multiple relevant children for a layout
      }
    } else {
      // Penalty if LLM was supposed to add children but didn't
      if (goalAction === "refine_page_layout_llm" && (!stepResult.children || stepResult.children.length === 0)) {
        score -= 0.2;
      }
    }

    if (stepResult.fields && Array.isArray(stepResult.fields)) {
      score += Math.min(0.3, stepResult.fields.length * 0.05); // Bonus for adding fields, capped
      if (goalAction === "add_object_fields" && stepResult.fields.length > 2) {
        score += 0.1; // Good number of fields added
      }
       if (goalAction === "complete_object_fields" && (stepResult.fields?.length || 0) > 2) score = Math.max(score, 0.8);
    }

    if (stepResult.status === "done") {
      score += 0.2; // Bonus if the step marks the node as done
    }
    
    // Specific adjustments based on goalAction (some might be redundant now with above)
    // if (goalAction?.includes("refine_page_layout") && stepResult.children && stepResult.children.length > 1) score = Math.max(score, 0.85);
    // if (goalAction?.includes("add_object_fields") && (stepResult.fields?.length || 0) > 2) score = Math.max(score, 0.8);

    const finalScore = Math.max(0, Math.min(1, score)); // Clamp score between 0 and 1
    console.log(`   Evaluated score for step on ${stepResult.uuid}: ${finalScore}`);
    return finalScore;
  },

  globalQuality: (ast: AppBuilderAstNode): number => {
    let doneNodes = 0;
    let pendingNodes = 0;
    let errorNodes = 0;
    let totalNodes = 0;
    let pageCompletenessScore = 0;
    let objectTypeCompletenessScore = 0;
    let numPages = 0;
    let numObjectTypes = 0;
    let connectedObjectTypes = 0;
    const objectTypeNames = new Set<string>();

    function countAndAssess(node: AppBuilderAstNode, parent?: AppBuilderAstNode) {
        totalNodes++;
        if (node.status === 'done') doneNodes++;
        else if (node.status === 'pending') pendingNodes++;
        else if (node.status === 'error') errorNodes++;

        if (node.node_type === "ObjectType" && node.name) {
            numObjectTypes++;
            objectTypeNames.add(node.name);
            if (node.fields && node.fields.length >= 3) { // Arbitrary definition of "complete"
                objectTypeCompletenessScore += 1;
            }
        }
        if (node.node_type === "Page" && node.name) {
            numPages++;
            if (node.children && node.children.length > 0) {
                 pageCompletenessScore += 0.7; // Has some children
                 if (node.layout && !node.layout.endsWith("Initial") && node.layout !== "generic") {
                    pageCompletenessScore += 0.3; // Has a refined layout
                 }
            }
            // Check if this page uses an ObjectType (simple check)
            if (node.children) {
                for (const child of node.children) {
                    if ((child.node_type === "ListView" || child.node_type === "FormView") && child.props?.source && objectTypeNames.has(child.props.source as string)) {
                        connectedObjectTypes++;
                        break; // Count once per page
                    }
                     if ((child.node_type === "ListView" || child.node_type === "FormView") && child.props?.entity && objectTypeNames.has(child.props.entity as string)) {
                        connectedObjectTypes++;
                        break; // Count once per page
                    }
                }
            }
        }

        if (node.children) node.children.forEach(child => countAndAssess(child, node));
    }
    countAndAssess(ast);
    
    if (totalNodes === 0) return 0;
    
    let quality = (doneNodes / totalNodes) * 0.5; // Base on general completion status
    
    if (numPages > 0) {
        quality += (pageCompletenessScore / numPages) * 0.15; // Max 0.15 from page completeness
    }
    if (numObjectTypes > 0) {
        quality += (objectTypeCompletenessScore / numObjectTypes) * 0.15; // Max 0.15 from OT completeness
        quality += (Math.min(numObjectTypes, connectedObjectTypes) / numObjectTypes) * 0.10; // Max 0.10 for OT connectivity
    }
    
    // Penalty for error nodes
    if (errorNodes > 0) {
      quality -= (errorNodes / totalNodes) * 0.2; // Smaller penalty as some errors might be part of process
    }
    // Small penalty for pending nodes if not yet complete and not all are errors
    if (pendingNodes > 0 && (doneNodes + errorNodes) < totalNodes) {
        quality -= (pendingNodes / totalNodes) * 0.05;
    }

    const finalQuality = Math.max(0, Math.min(1, quality)); // Clamp quality
    console.log(`   Calculating global AST quality: ${finalQuality.toFixed(3)} (Done: ${doneNodes}, Pending: ${pendingNodes}, Error: ${errorNodes}, Total: ${totalNodes}, PageComp: ${(pageCompletenessScore/(numPages || 1)).toFixed(2)}, OTComp: ${(objectTypeCompletenessScore/(numObjectTypes || 1)).toFixed(2)}, OTConn: ${(Math.min(numObjectTypes, connectedObjectTypes)/(numObjectTypes || 1)).toFixed(2)})`);
    return finalQuality;
  }
};

// --- Main Demo Orchestration ---
async function runHybridConstructionDemo(): Promise<void> {
  console.log("🚀 Starting Hybrid Application Construction Demo...");

  // --- Initial State ---
  let agentState: AgentState = {
    ast: { // AppRoot
      uuid: `app-root-${Date.now()}`,
      node_type: "AppRoot",
      children: [],
      status: "new", // Root node status
      props: {}
    },
    registry: {},
    logs: ["Demo initialized"],
    openQuestions: []
  };
  console.log("Initial Agent State:", JSON.stringify(agentState, null, 2));

  // Définition des constantes globales
  const GLOBAL_QUALITY_THRESHOLD = 0.85; // High threshold for "good enough" application
  const MAX_TOTAL_ITERATIONS = 100; // Safety limit to prevent infinite loops
  let totalIterations = 0;
  let globalCycles = 0;
  const MAX_GLOBAL_CYCLES = 3; // Maximum number of complete cycles through all phases

  // Boucle principale qui continue jusqu'à ce que la qualité soit suffisante ou qu'on atteigne une limite
  while (evaluator.globalQuality(agentState.ast) < GLOBAL_QUALITY_THRESHOLD 
         && totalIterations < MAX_TOTAL_ITERATIONS
         && globalCycles < MAX_GLOBAL_CYCLES) {
    
    globalCycles++;
    console.log(`\n======= Starting Global Cycle ${globalCycles} =======`);
    console.log(`Current Quality: ${evaluator.globalQuality(agentState.ast).toFixed(4)}, Target: ${GLOBAL_QUALITY_THRESHOLD}`);
    agentState.logs.push(`Starting global cycle ${globalCycles}. Current quality: ${evaluator.globalQuality(agentState.ast).toFixed(4)}`);
    
    // --- ⚙️ Phase 1: Génération du Squelette Macro ---
    // Seulement exécuté au premier cycle
    if (globalCycles === 1) {
      console.log("\n--- Phase 1: Squelette Macro ---");
      agentState.logs.push("Phase 1 started: Generating macro skeleton.");
      
      const skeletonLlmResponse = await gpt4MiniLlm.call(LLM_PROMPT_KEY_SKELETON, DYNAMIC_CONTEXT_PHASE_1);
      
      if (Array.isArray(skeletonLlmResponse)) {
        // Map LLM response to Partial<AppBuilderAstNode>[] before passing to applySkeleton
        const skeletonNodes: Partial<AppBuilderAstNode>[] = skeletonLlmResponse.map(llmNode => ({
            node_type: llmNode.type,
            name: llmNode.name,
            fields: llmNode.fields,
            route: llmNode.route,
            layout: llmNode.layout,
            props: llmNode.props,
            status: "pending"
        }));
        agentState.ast = astEngine.applySkeleton(agentState.ast, skeletonNodes);
        
        agentState.ast.children?.forEach(child => {
            const cNode = child as AppBuilderAstNode;
            cNode.status = "pending";
        });

      } else {
        agentState.logs.push("Phase 1 Error: LLM did not return an array for skeleton.");
        console.error("Phase 1 Error: Expected array from LLM, got:", skeletonLlmResponse);
        // Potentially add to openQuestions
      }
      agentState.logs.push("Phase 1 complete: Skeleton applied.");
      console.log("AST after Phase 1:", JSON.stringify(agentState.ast, null, 2));
    }


    // --- ⚙️ Phase 2: Raffinements Macro ---
    console.log("\n--- Phase 2: Raffinements Macro ---");
    agentState.logs.push("Phase 2 started: Macro refinements.");
    const THRESHOLD_MACRO = 0.7; // Used for step evaluation but not as a strict exit condition
    let macroIterations = 0;
    let stuckCounter = 0; // To detect if we're stuck in a loop without progress
    let lastQuality = evaluator.globalQuality(agentState.ast); // Track quality improvements

    // Suppression de la limite d'itérations pour la Phase 2
    while (evaluator.globalQuality(agentState.ast) < GLOBAL_QUALITY_THRESHOLD && totalIterations < MAX_TOTAL_ITERATIONS) {
      macroIterations++;
      totalIterations++;
      const currentQuality = evaluator.globalQuality(agentState.ast);
      console.log(`   Macro Iteration: ${macroIterations}, Current Quality: ${currentQuality.toFixed(4)} (Target: ${GLOBAL_QUALITY_THRESHOLD})`);
      
      if (totalIterations >= MAX_TOTAL_ITERATIONS) {
        agentState.logs.push(`Reached maximum total iterations (${MAX_TOTAL_ITERATIONS}). Proceeding with current state.`);
        console.log(`   Reached maximum total iterations (${MAX_TOTAL_ITERATIONS}). Proceeding with current state.`);
        break;
      }

      // Check for stuck (no quality improvement)
      if (Math.abs(currentQuality - lastQuality) < 0.001) {
        stuckCounter++;
        if (stuckCounter >= 3) {
          console.log("   No significant quality improvement for several iterations. Moving to next phase.");
          break;
        }
      } else {
        stuckCounter = 0; // Reset if quality improved
      }
      lastQuality = currentQuality;

      let focusNode = astEngine.selectMacroFocus(agentState.ast);
      
      if (!focusNode) {
        agentState.logs.push("Phase 2: No macro focus found. Moving to micro refinements.");
        console.log("   No macro focus found. Transitioning to Phase 3 for micro refinements.");
        break;
      }

      console.log(`   Selected Macro Focus: ${focusNode.node_type} (${focusNode.uuid})`);
      
      // Infer goal (simplified for demo)
      const macroGoal = astEngine.inferMacroGoal(focusNode, agentState.ast);
      agentState.logs.push(`Macro goal: ${macroGoal.action} for node ${focusNode.uuid}, Needs LLM: ${macroGoal.needsLLM}`);

      let stepResult: Partial<AppBuilderAstNode> | null = null;
      if (macroGoal.needsLLM) {
        const macroPromptDynamic = { focus: focusNode, ast: agentState.ast, blocks: AVAILABLE_BLOCKS }; 
        stepResult = await gpt4MiniLlm.call(LLM_PROMPT_KEY_STRUCTURE_PAGE, macroPromptDynamic);
      } else {
        // Call rule-based macro refinement
        stepResult = rulesEngine.applyRuleBasedMacro(macroGoal, agentState.ast);
      }

      const stepScore = evaluator.evaluateStep(stepResult, macroGoal.action);
      
      if (stepResult && stepResult.uuid && stepScore >= THRESHOLD_MACRO) {
        // Ensure stepResult aligns with AppBuilderAstNode structure for update
        const updatePayload: Partial<AppBuilderAstNode> = { ...stepResult, status: "done" };
        agentState.ast = astEngine.updateNode(agentState.ast, stepResult.uuid, updatePayload);
        agentState.logs.push(`Macro step applied: ${stepResult.node_type || 'unknown'} on ${stepResult.uuid} refined.`);
        stuckCounter = 0; // Reset stuck counter since we made progress
      } else {
        const focusUuid = focusNode.uuid; // Store before focusNode might become null
        agentState.logs.push(`Macro step for ${focusUuid} not applied or failed evaluation. Result: ${JSON.stringify(stepResult)}`);
        const nodeToUpdate = astEngine.findNodeById(agentState.ast, focusUuid);
        if(nodeToUpdate) nodeToUpdate.status = "error"; 
        stuckCounter++; // Increment stuck counter since no progress was made
        
        // Add to openQuestions if LLM was involved and failed, or rule failed critically
        if (macroGoal.needsLLM && (!stepResult || !stepResult.uuid || stepResult.status === "error")){
            agentState.openQuestions.push(`Q: Macro LLM task for ${focusUuid} (action: ${macroGoal.action}) failed or produced invalid result. Review needed. Data: ${JSON.stringify(stepResult)}`);
        } else if (!macroGoal.needsLLM && !stepResult) {
            agentState.openQuestions.push(`Q: Macro Rule task for ${focusUuid} (action: ${macroGoal.action}) failed to produce a result. Review rule logic.`);
        }
      }
      
      // Check if we're making progress - if we're stuck for too many iterations, consider moving on
      if (stuckCounter >= 5) {
        console.log("   Stuck in macro refinements for too many iterations without progress. Moving to next phase.");
        agentState.logs.push("Phase 2: Stuck for too many iterations without progress. Moving to next phase.");
        break;
      }
      
      // Check if we've reached the global quality threshold for an excellent app
      if (evaluator.globalQuality(agentState.ast) >= GLOBAL_QUALITY_THRESHOLD) {
        console.log(`   Global quality threshold reached (${GLOBAL_QUALITY_THRESHOLD}). Application is considered excellent!`);
        agentState.logs.push(`Global quality threshold reached (${GLOBAL_QUALITY_THRESHOLD}). Application is considered excellent!`);
        break;
      }
      
      console.log("AST after Macro Iteration:", JSON.stringify(agentState.ast, null, 2));
    }
    agentState.logs.push(`Phase 2 complete after ${macroIterations} iterations. Quality: ${evaluator.globalQuality(agentState.ast).toFixed(4)}`);


    // --- ⚙️ Phase 3: Raffinements Micro ---
    console.log("\n--- Phase 3: Raffinements Micro ---");
    agentState.logs.push("Phase 3 started: Micro refinements.");
    const THRESHOLD_MICRO = 0.6;
    let microIterations = 0;
    stuckCounter = 0; // Reset stuck counter for Phase 3
    lastQuality = evaluator.globalQuality(agentState.ast);

    // Initial pass to set relevant nodes to 'pending' if they aren't 'done' or 'error'
    function ensurePending(node: AppBuilderAstNode) {
      if (node.status !== "done" && node.status !== "error" && node.status !== "pending") {
          // Heuristic: if it's an ObjectType without many fields, or a Page without children, it's likely pending.
          if (node.node_type === "ObjectType" && (!node.fields || node.fields.length < 2)) node.status = "pending";
          else if (node.node_type === "Page" && (!node.children || node.children.length === 0)) node.status = "pending";
          // Add more heuristic cases to mark as pending
          else if (node.node_type === "ObjectType" && node.status === "new") node.status = "pending";
          else if (node.node_type === "Page" && node.status === "new") node.status = "pending";
      }
      if (node.children) node.children.forEach(ensurePending);
    }
    ensurePending(agentState.ast);

    // Suppression de la limite d'itérations pour la Phase 3
    while(evaluator.globalQuality(agentState.ast) < GLOBAL_QUALITY_THRESHOLD 
          && !astEngine.isComplete(agentState.ast)
          && totalIterations < MAX_TOTAL_ITERATIONS) {
        microIterations++;
        totalIterations++;
        const currentQuality = evaluator.globalQuality(agentState.ast);
        console.log(`   Micro Iteration: ${microIterations}, Total: ${totalIterations}, Current Quality: ${currentQuality.toFixed(4)} (Target: ${GLOBAL_QUALITY_THRESHOLD})`);
        
        if (totalIterations >= MAX_TOTAL_ITERATIONS) {
          agentState.logs.push(`Reached maximum total iterations (${MAX_TOTAL_ITERATIONS}). Proceeding with current state.`);
          console.log(`   Reached maximum total iterations (${MAX_TOTAL_ITERATIONS}). Proceeding with current state.`);
          break;
        }

        // Check for stuck (no quality improvement)
        if (Math.abs(currentQuality - lastQuality) < 0.001) {
          stuckCounter++;
          if (stuckCounter >= 3) {
            console.log("   No significant quality improvement for several iterations. Moving to next phase.");
            break;
          }
        } else {
          stuckCounter = 0; // Reset if quality improved
        }
        lastQuality = currentQuality;

        let leafNode = astEngine.selectNextLeaf(agentState.ast);

        if (!leafNode) {
            // No pending leaf found - try to mark more nodes as pending to continue
            console.log("   No obvious pending leaves found. Attempting to mark more nodes as pending...");
            
            // Function to mark some completed nodes as pending to continue refinement
            function markSomeNodesAsPending(node: AppBuilderAstNode): void {
              if (node.status === "done") {
                // Mark nodes that could benefit from further refinement
                if (node.node_type === "ObjectType" && (!node.fields || node.fields.length < 4)) {
                  node.status = "pending";
                  console.log(`   Re-marking ObjectType "${node.name || node.uuid}" as pending for further refinement.`);
                }
                else if (node.node_type === "Page" && (!node.children || node.children.length < 2)) {
                  node.status = "pending";
                  console.log(`   Re-marking Page "${node.name || node.uuid}" as pending for further refinement.`);
                }
              }
              if (node.children) {
                node.children.forEach(markSomeNodesAsPending);
              }
            }
            
            // Try re-marking some nodes as pending
            markSomeNodesAsPending(agentState.ast);
            
            // Try again to find a leaf
            leafNode = astEngine.selectNextLeaf(agentState.ast);
            
            if (!leafNode) {
                agentState.logs.push("Phase 3: No pending leaves found even after re-marking. AST might be complete or stuck.");
                console.log("   No pending leaves found even after re-marking. Ending Phase 3.");
                break;
            }
        }
        
        console.log(`   Selected Micro Leaf: ${leafNode.node_type} (${leafNode.uuid}) with status ${leafNode.status}`);
        
        // Infer micro goal
        const microGoal = astEngine.inferMicroGoal(leafNode, agentState.ast);
        agentState.logs.push(`Micro goal: ${microGoal.action} for node ${leafNode.uuid}, Needs LLM: ${microGoal.needsLLM}`);

        let stepResult: Partial<AppBuilderAstNode> | null = null;
        
        if (microGoal.needsLLM) {
            const microPromptDynamic = { focus: leafNode, ast: agentState.ast, blocks: AVAILABLE_BLOCKS };
            stepResult = await gpt4MiniLlm.call(LLM_PROMPT_KEY_COMPLETE_NODE, microPromptDynamic);
        } else {
            // Call rule-based micro refinement
            stepResult = rulesEngine.applyRuleBasedMicro(microGoal, agentState.ast);
        }

        const stepScore = evaluator.evaluateStep(stepResult, microGoal.action);
        
        if (stepResult && stepResult.uuid && stepScore >= THRESHOLD_MICRO) {
            const updatePayload: Partial<AppBuilderAstNode> = { ...stepResult, status: "done" };
            agentState.ast = astEngine.updateNode(agentState.ast, stepResult.uuid, updatePayload);
            agentState.logs.push(`Micro step applied: Node ${stepResult.uuid} (${stepResult.node_type || 'unknown'}) completed.`);
            stuckCounter = 0; // Reset stuck counter since we made progress
        } else {
            const leafUuid = leafNode.uuid; // Store before leafNode might become null
            agentState.logs.push(`Micro step for ${leafUuid} rejected or failed evaluation. Result: ${JSON.stringify(stepResult)}`);
            const nodeToUpdate = astEngine.findNodeById(agentState.ast, leafUuid);
            if(nodeToUpdate) nodeToUpdate.status = "error"; 
            stuckCounter++; // Increment stuck counter since no progress was made
            
            // Add to openQuestions
            if (microGoal.needsLLM && (!stepResult || !stepResult.uuid || stepResult.status === "error")){
              agentState.openQuestions.push(`Q: Micro LLM task for ${leafUuid} (action: ${microGoal.action}) failed or produced invalid result. Review needed. Data: ${JSON.stringify(stepResult)}`);
            } else if (!microGoal.needsLLM && !stepResult) {
              agentState.openQuestions.push(`Q: Micro Rule task for ${leafUuid} (action: ${microGoal.action}) failed to produce a result. Review rule logic.`);
            }
        }
        
        // Check if we're making progress - if we're stuck for too many iterations, consider the AST as good as it will get
        if (stuckCounter >= 5) {
          console.log("   Stuck in micro refinements for too many iterations without progress. Moving to next phase.");
          agentState.logs.push("Phase 3: Stuck for too many iterations without progress. Moving to next phase.");
          break;
        }
        
        // Check if we've reached the global quality threshold
        if (evaluator.globalQuality(agentState.ast) >= GLOBAL_QUALITY_THRESHOLD) {
          console.log(`   Global quality threshold reached (${GLOBAL_QUALITY_THRESHOLD}). Application is considered excellent!`);
          agentState.logs.push(`Global quality threshold reached (${GLOBAL_QUALITY_THRESHOLD}). Application is considered excellent!`);
          break;
        }
        
        console.log("AST after Micro Iteration:", JSON.stringify(agentState.ast, null, 2));
    }
    agentState.logs.push(`Phase 3 complete after ${microIterations} iterations. Quality: ${evaluator.globalQuality(agentState.ast).toFixed(4)}`);


    // --- ⚙️ Phase 4: Consolidation & Élagage ---
    console.log("\n--- Phase 4: Consolidation & Élagage ---");
    agentState.logs.push("Phase 4 started: Consolidation and pruning.");

    // Helper to collect all nodes
    function collectAllNodes(node: AppBuilderAstNode, allNodes: AppBuilderAstNode[] = []): AppBuilderAstNode[] {
      allNodes.push(node);
      if (node.children) {
        for (const child of node.children) {
          collectAllNodes(child, allNodes);
        }
      }
      return allNodes;
    }

    // 1. Detect Redundancies (Simplified)
    console.log("   Phase 4.1: Detecting redundancies...");
    const allCurrentNodes = collectAllNodes(agentState.ast);
    const potentialRedundancies: { nodeA: AppBuilderAstNode, nodeB: AppBuilderAstNode }[] = [];
    const processedForRedundancy = new Set<string>(); // To avoid processing a node multiple times if it's part of multiple pairs

    for (let i = 0; i < allCurrentNodes.length; i++) {
      if (processedForRedundancy.has(allCurrentNodes[i].uuid)) continue;
      for (let j = i + 1; j < allCurrentNodes.length; j++) {
        if (processedForRedundancy.has(allCurrentNodes[j].uuid)) continue;

        const nodeA = allCurrentNodes[i];
        const nodeB = allCurrentNodes[j];
        if (nodeA.node_type === "ObjectType" && nodeB.node_type === "ObjectType") {
          if (nodeA.name && nodeB.name && nodeA.name.toLowerCase() === nodeB.name.toLowerCase() && nodeA.uuid !== nodeB.uuid) {
            console.log(`   Potential Redundancy Found: ObjectType "${nodeA.name}" (ID: ${nodeA.uuid}) and "${nodeB.name}" (ID: ${nodeB.uuid})`);
            agentState.logs.push(`Phase 4: Potential redundancy: ObjectType "${nodeA.name}" (ID: ${nodeA.uuid}) and "${nodeB.name}" (ID: ${nodeB.uuid})`);
            potentialRedundancies.push({ nodeA, nodeB });
          }
        }
      }
    }
    
    // Simplified Merge Group: For demo, if redundancy found, mark one as 'merged_duplicate' and keep the other.
    // A real merge would be more complex, transferring children/props or choosing the best.
    if (potentialRedundancies.length > 0) {
      console.log("   Attempting to merge/handle potential ObjectType redundancies...");
      for (const pair of potentialRedundancies) {
          // Ensure both nodes still exist in the AST (might have been removed if part of a previous merge in the same pass)
          const nodeA = astEngine.findNodeById(agentState.ast, pair.nodeA.uuid);
          const nodeB = astEngine.findNodeById(agentState.ast, pair.nodeB.uuid);

          if (!nodeA || !nodeB || processedForRedundancy.has(nodeA.uuid) || processedForRedundancy.has(nodeB.uuid)) {
              continue; // Skip if one node is already processed or no longer exists
          }

          console.log(`   Merging ObjectType "${nodeB.name}" (ID: ${nodeB.uuid}) into "${nodeA.name}" (ID: ${nodeA.uuid}).`);
          agentState.logs.push(`Phase 4 Merge: Attempting to merge ${nodeB.name} (${nodeB.uuid}) into ${nodeA.name} (${nodeA.uuid})`);

          // 1. Merge Fields (case-insensitive for field names)
          const nodeAFieldNamesLower = (nodeA.fields || []).map(f => f.toLowerCase());
          if (nodeB.fields) {
              nodeB.fields.forEach(fieldB => {
                  if (!nodeAFieldNamesLower.includes(fieldB.toLowerCase())) {
                      if (!nodeA.fields) nodeA.fields = [];
                      nodeA.fields.push(fieldB);
                      console.log(`     Added field "${fieldB}" from ${nodeB.name} to ${nodeA.name}`);
                  }
              });
          }

          // 2. Merge Props (simple merge, nodeA's props take precedence)
          if (nodeB.props) {
              for (const key in nodeB.props) {
                  if (!Object.prototype.hasOwnProperty.call(nodeA.props, key)) {
                      if (!nodeA.props) nodeA.props = {};
                      nodeA.props[key] = nodeB.props[key];
                      console.log(`     Added prop "${key}" from ${nodeB.name} to ${nodeA.name}`);
                  }
              }
          }
          
          // 3. Update References (Conceptual - Logged only)
          console.log(`     CONCEPTUAL: References to ${nodeB.uuid} should be updated to ${nodeA.uuid} throughout the AST.`);
          agentState.logs.push(`Phase 4 Merge: References to ${nodeB.uuid} should be updated to ${nodeA.uuid}.`);

          // 4. Remove Source Node (nodeB)
          // Need a robust way to find the parent of nodeB to remove it from children array.
          // For this demo, we'll add a simpler astEngine.removeNode that finds and removes.
          const removalSuccess = astEngine.removeNode(agentState.ast, nodeB.uuid);
          if (removalSuccess) {
              console.log(`     Successfully removed merged node ${nodeB.name} (${nodeB.uuid}) from AST.`);
              agentState.logs.push(`Phase 4 Merge: Removed merged node ${nodeB.name} (${nodeB.uuid}).`);
          } else {
              console.warn(`     Could not remove node ${nodeB.name} (${nodeB.uuid}) after merge attempt. It might be the root or already removed.`);
               agentState.logs.push(`Phase 4 Merge: WARN - Could not remove ${nodeB.name} (${nodeB.uuid}).`);
               // If removal failed, mark it as error to prevent re-processing.
               nodeB.status = "error";
               nodeB.props = {...nodeB.props, merge_failed_to_remove: true};
          }

          processedForRedundancy.add(nodeB.uuid); // Mark nodeB as processed
           // nodeA remains and might be a target for another merge, so don't mark it yet.
      }
      // After all merges in this pass, update the main AST reference if it was modified
      // agentState.ast = astEngine.findNodeById(agentState.ast, agentState.ast.uuid); // This is not quite right for re-assigning root
    } else {
      console.log("   No obvious redundancies handled in ObjectTypes.");
    }

    // 2. Apply Consolidation Rules (Simplified)
    console.log("\n   Phase 4.2: Applying consolidation rules...");
    function applyConsolidationRules(rootNode: AppBuilderAstNode): AppBuilderAstNode {
      const nodesToVisit = [rootNode];
      while(nodesToVisit.length > 0) {
          const currentNode = nodesToVisit.shift()!;
          // Rule: If a Page has > 2 simple TextView children and is not using Tabs, convert to Tabs
          if (currentNode.node_type === "Page" && 
              (currentNode.layout !== "Tabs_Refined" && currentNode.layout !== "Tabs_Refined_Rule" && currentNode.layout !== "Tabs") && 
              currentNode.children && currentNode.children.length > 2) {
              
              const allChildrenAreSimpleViews = currentNode.children.every(c => c.node_type === "TextView" || c.node_type === "SimpleView"); // Add more types if needed
              if (allChildrenAreSimpleViews) {
                  console.log(`   Consolidation Rule: Converting Page "${currentNode.name || currentNode.uuid}" with ${currentNode.children.length} simple views to Tabs layout.`);
                  const newTabItems = currentNode.children.map((child, index) => 
                      astEngine.createNode("TabItem", {label: child.props?.title || `Tab ${index + 1}`}, [child])
                  );
                  newTabItems.forEach(ti => ti.status = "done");
                  currentNode.props = {...currentNode.props, layout: "Tabs_Consolidated"};
                  currentNode.children = newTabItems;
                  agentState.logs.push(`Consolidated Page "${currentNode.name || currentNode.uuid}" to Tabs layout.`);
              }
          }
          if (currentNode.children) {
              nodesToVisit.push(...currentNode.children);
          }
      }
      return rootNode;
    }
    agentState.ast = applyConsolidationRules(agentState.ast);
    console.log("   Consolidation rules applied.");

    // 3. Normalize Props (Simplified)
    console.log("\n   Phase 4.3: Normalizing props...");
    function normalizeProps(node: AppBuilderAstNode): AppBuilderAstNode {
      if (node.name && (node.node_type === "Page" || node.node_type === "ObjectType")) {
          const originalName = node.name;
          // Capitalize first letter, ensure rest is sensible (very basic normalization)
          node.name = originalName.charAt(0).toUpperCase() + originalName.slice(1).toLowerCase().replace(/\s+/g, '');
          if (node.name !== originalName) {
              console.log(`   Normalized name: "${originalName}" -> "${node.name}" for node ${node.uuid}`);
              agentState.logs.push(`Normalized name "${originalName}" to "${node.name}" for ${node.uuid}`);
          }
      }
      if (node.props?.label && typeof node.props.label === 'string') {
          const originalLabel = node.props.label;
          node.props.label = originalLabel.charAt(0).toUpperCase() + originalLabel.slice(1);
           if (node.props.label !== originalLabel) {
              console.log(`   Normalized label: "${originalLabel}" -> "${node.props.label}" for node ${node.uuid}`);
              agentState.logs.push(`Normalized label "${originalLabel}" to "${node.props.label}" for ${node.uuid}`);
          }
      }

      if (node.children) {
          node.children.forEach(normalizeProps);
      }
      return node;
    }
    agentState.ast = normalizeProps(agentState.ast);
    console.log("   Props normalization applied.");

    agentState.logs.push("Phase 4 consolidation sub-steps complete.");
    console.log("AST after Phase 4 (Consolidation):", JSON.stringify(agentState));

    // Vérification si la qualité est suffisante pour terminer la boucle globale
    const finalQualityThisCycle = evaluator.globalQuality(agentState.ast);
    console.log(`\n=== Cycle ${globalCycles} Complete ===`);
    console.log(`Final Quality for Cycle ${globalCycles}: ${finalQualityThisCycle.toFixed(4)} (Target: ${GLOBAL_QUALITY_THRESHOLD})`);
    
    if (finalQualityThisCycle >= GLOBAL_QUALITY_THRESHOLD) {
      console.log(`Global quality threshold reached (${GLOBAL_QUALITY_THRESHOLD}). Application is excellent!`);
      agentState.logs.push(`Global quality threshold reached (${GLOBAL_QUALITY_THRESHOLD}). Stopping refinement cycles.`);
      break; // Exit the global cycle
    }
    
    // Réinitialiser certains nœuds pour le prochain cycle
    if (globalCycles < MAX_GLOBAL_CYCLES) {
      console.log("Preparing for next global cycle by marking some nodes as pending...");
      // Mark some completed nodes as pending to allow further refinement in the next cycle
      function resetSomeNodes(node: AppBuilderAstNode): void {
        if (node.status === "done" || node.status === "error") {
          if (node.node_type === "ObjectType" || node.node_type === "Page") {
            node.status = "pending";
            console.log(`   Resetting ${node.node_type} "${node.name || node.uuid}" for next cycle.`);
          }
        }
        if (node.children) {
          node.children.forEach(resetSomeNodes);
        }
      }
      
      resetSomeNodes(agentState.ast);
    }
  }

  // --- ✅ Final Output ---
  console.log("\n--- Demo Complete ---");
  console.log(`Final Application Quality: ${evaluator.globalQuality(agentState.ast).toFixed(4)} (Target: ${GLOBAL_QUALITY_THRESHOLD})`);
  console.log(`Total Iterations: ${totalIterations} across ${globalCycles} global cycles`);
  console.log("Final Logs:");
  agentState.logs.forEach(log => console.log(`- ${log}`));
  // console.log("\nFinal AST:", JSON.stringify(agentState.ast, null, 2));

  if (agentState.openQuestions.length > 0) {
    console.log("\nOpen Questions for Developer:");
    agentState.openQuestions.forEach(q => console.log(`- ${q}`));
  }
}

// Helper function to add to astEngine
function addRemoveNodeToAstEngine() {
    (astEngine as any).removeNode = function(rootNode: AppBuilderAstNode, uuidToRemove: string): boolean {
        if (!rootNode.children) return false;
        const childIndex = rootNode.children.findIndex(child => child.uuid === uuidToRemove);
        if (childIndex !== -1) {
            rootNode.children.splice(childIndex, 1);
            console.log(`   AST Engine: Removed node ${uuidToRemove} from parent ${rootNode.uuid}`);
            return true;
        }
        for (const child of rootNode.children) {
            if (astEngine.removeNode(child, uuidToRemove)) {
                return true;
            }
        }
        return false;
    };
}

// Run the demo
main().catch((err) => {
  console.error("Error in app_demo:", err);
  process.exit(1);
});

// Helper function to mimic main structure from demo_compile.ts if needed,
// or just call runHybridConstructionDemo directly.
async function main(): Promise<void> {
    // If load_all_components or similar setup is needed from demo_compile, add here.
    // For this brief, it seems self-contained around the AST construction loop.
    addRemoveNodeToAstEngine(); // Add the removeNode utility to the astEngine
    await runHybridConstructionDemo();
}