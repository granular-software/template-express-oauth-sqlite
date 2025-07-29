/* ---------- generic AST & view contracts ------------------------------ */

import { TriggerableAction as OriginalTriggerableAction } from "@joshu/os-types";
import { ClickableLink } from "../types";

// Re-export TriggerableAction so other local modules can import it from here
export type { OriginalTriggerableAction as TriggerableAction };



export interface BaseAstNode {
  uuid: string;
  node_type: string;
  children?: BaseAstNode[];
}

export interface ViewNode {
  uuid: string;
  ast_node_uuid: string;
  kind: string;                         /* "div", "span", … */
  props: Record<string, unknown>;
  children?: ViewNode[];


  triggerable_actions: OriginalTriggerableAction[];
  links: ClickableLink[];
}

export interface RenderParams {
  text_scale?: number;
  api?: any;
  router_path?: string;
  route_params?: Record<string, string>;
}

/* ---------- utility types for props derivation ----------------------- */

// Type to preserve function signatures
type PreserveFunctionType<T> = T extends (...args: infer Args) => infer Return
  ? (...args: Args) => Return
  : never;

// Generic type transformation for converting AST node types to React prop types
export type GetReactProps<T extends BaseAstNode> = {
  // Make all properties optional in props except node_type and children
  [K in keyof Omit<T, 'node_type' | 'children'>]?: T[K];
} & {
  // Add React children prop
  children?: React.ReactNode;
};

/* ---------- bundle contract (one per component file) ------------------ */

export interface ComponentBundle<N extends BaseAstNode = BaseAstNode> {
  component_name: string;          /* must match JSX tag or function name */

  build_ast: (
    element: JsElement,
    recurse: (e: JsElement) => BaseAstNode
  ) => Omit<N, "uuid">;

  render_view: (
    node: N,
    params: RenderParams,
    recurse: (n: BaseAstNode) => Promise<ViewNode>
  ) => Promise<Omit<ViewNode, "uuid" | "ast_node_uuid"> & { children?: ViewNode[] }>;
}

/* ---------- internal type: output of jsx_factory ---------------------- */

export interface JsElement<PropsType extends Record<string, unknown> = Record<string, unknown>> {
  type: string | ((props: unknown) => unknown);
  props: PropsType;
  children: JsElement[];
}
