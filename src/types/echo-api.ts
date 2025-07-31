// Proper TypeScript interfaces for Echo API responses
// Eliminates need for 'as any' type assertions

export interface EchoAPIResponse {
	id: string;
	output: EchoAPIOutputItem[];
}

export type EchoAPIOutputItem = EchoAPIMessageItem | EchoAPIFunctionCallItem;

export interface EchoAPIMessageItem {
	type: 'message';
	role?: string;
	content?: EchoAPIContentItem[];
}

export interface EchoAPIFunctionCallItem {
	type: 'function_call';
	call_id: string;
	name: string;
	arguments: string;
}

export interface EchoAPIContentItem {
	type: 'output_text';
	text: string;
}

export interface EchoAPIFunctionResult {
	type: 'function_call_output';
	call_id: string;
	output: string;
}

// Type guards for runtime type checking
export const isMessageItem = (
	item: EchoAPIOutputItem,
): item is EchoAPIMessageItem => {
	return item.type === 'message';
};

export const isFunctionCallItem = (
	item: EchoAPIOutputItem,
): item is EchoAPIFunctionCallItem => {
	return item.type === 'function_call';
};

export const isOutputTextContent = (
	content: EchoAPIContentItem,
): content is EchoAPIContentItem => {
	return content.type === 'output_text';
};
