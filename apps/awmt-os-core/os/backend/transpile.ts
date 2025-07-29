import { JsElement } from "./common_types";
import { jsx_factory } from "./jsx_factory";
import * as path from "path";
import * as fs from "fs";

/* one hot Bun.Transpiler instance is *very* fast */
const transpiler = new Bun.Transpiler({
  loader: "tsx",
});

// Cache for component modules
const componentCache = new Map<string, any>();

export async function transpile_file(entry_path: string): Promise<JsElement> {
  const tsx_code = await Bun.file(entry_path).text();

  const js_code = transpiler.transformSync(
    "/** @jsx jsx_factory */\n" + tsx_code
  );

  // Extract the jsxDEV function name from the transpiled code
  const jsxDevMatch = js_code.match(/jsxDEV_[a-zA-Z0-9]+/);
  const jsxDevFnName = jsxDevMatch ? jsxDevMatch[0] : "jsx_factory";

  // Replace the jsxDEV function with jsx_factory
  let modified_code = js_code.replace(new RegExp(jsxDevFnName, "g"), "jsx_factory");

  // Extract import statements
  const importRegex = /import\s+(?:{[^}]+}|\*\s+as\s+\w+|\w+)\s+from\s+["']([^"']+)["'];?/g;
  const imports: { varName: string, path: string }[] = [];
  let match;
  
  // Find all imports
  while ((match = importRegex.exec(modified_code)) !== null) {
    const importPath = match[1];
    const importStatement = match[0];
    const varNameMatch = importStatement.match(/import\s+{?\s*(\w+)/);
    if (varNameMatch) {
      imports.push({ varName: varNameMatch[1], path: importPath });
    }
  }
  
  // Remove all import statements
  modified_code = modified_code.replace(/import\s+[^;]+;/g, '');
  
  // Find all function declarations within the file
  const internalFunctions: string[] = [];
  const functionDeclarations = modified_code.match(/function\s+(\w+)\s*\([^)]*\)\s*{/g) || [];
  
  // Extract the function names
  functionDeclarations.forEach(decl => {
    const nameMatch = decl.match(/function\s+(\w+)/);
    if (nameMatch && nameMatch[1]) {
      internalFunctions.push(nameMatch[1]);
    }
  });
  
  // Handle export default statements
  const exportDefaultRegex = /export\s+default\s+function\s+(\w+)/;
  const exportMatch = modified_code.match(exportDefaultRegex);
  
  if (exportMatch) {
    const functionName = exportMatch[1];
    // Replace export default function Name() with function Name()
    modified_code = modified_code.replace(exportDefaultRegex, 'function $1');
    
    // Preserve all internal functions in the scope
    let functionAssignments = '';
    internalFunctions.forEach(fn => {
      if (fn !== functionName) {
        functionAssignments += `\nconst ${fn}_instance = ${fn};\n`;
      }
    });
    
    // Add assignments to the context before executing the main function
    modified_code += functionAssignments;
    
    // Add assignment to exports.default at the end with all internal functions available
    modified_code += `\nexports.default = ${functionName}();`;
  } else {
    // Handle other export default patterns by executing the result
    modified_code = modified_code.replace(/export\s+default\s+/, 'exports.default = ');
    
    // If it's an expression that needs to be executed, make sure it gets executed
    if (!modified_code.includes('exports.default = function')) {
      modified_code = modified_code.replace(/exports\.default\s*=\s*([^;]+);/, 'exports.default = ($1)();');
    }
  }
  
  // console.log("Modified code:", modified_code);

  /* evaluate in isolated module scope */
  const mod = { exports: {} as { default: unknown } };
  
  // Create context with imported components
  const context: Record<string, any> = {};
  
  for (const imp of imports) {
    try {
      // For simplicity, we're assuming these are local component imports
      // In a real implementation, you might want to handle different types of imports differently
      const componentPath = path.resolve(path.dirname(entry_path), imp.path);
      
      if (!componentCache.has(componentPath)) {
        // This is a simplified approach - in a real app, you'd need to properly load the module
        const componentModule = await import(componentPath);
        componentCache.set(componentPath, componentModule);
      }
      
      const module = componentCache.get(componentPath);
      
      // Get the exported component function - it could be a named export
      // or the default export depending on the import statement
      context[imp.varName] = module[imp.varName] || module.default;
    } catch (error) {
      console.error(`Error importing component ${imp.varName}:`, error);
      throw error;
    }
  }

  try {
    /* eslint-disable-next-line @typescript-eslint/no-implied-eval */
    new Function(
      ...Object.keys(context), 
      "exports", 
      "require", 
      "jsx_factory", 
      modified_code
    )(
      ...Object.values(context),
      mod.exports,
      require,
      jsx_factory,
    );
  } catch (error) {
    console.error("Error evaluating code:", error);
    console.error("Modified code was:", modified_code);
    throw error;
  }

  const root = mod.exports.default;
  if (!root || typeof root !== "object")
    throw new Error(`file ${entry_path} did not export a JSX tree`);
  return root as JsElement;
}
