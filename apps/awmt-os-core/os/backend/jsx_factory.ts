import { JsElement } from "./common_types";

/* minimal factory – Bun's TSX transpiler will call this */
export function jsx_factory(type: JsElement["type"], props: Record<string, unknown> | null, ...children: unknown[]): JsElement {
	// Filter out undefined, false, and null values from children
	const validChildren = children.filter(child => 
		child !== undefined && child !== false && child !== null && child !== true
	);
	
	// Create the element with the filtered children
	return {
		type,
		props: props ?? {},
		children: validChildren as JsElement[],
	};
}
