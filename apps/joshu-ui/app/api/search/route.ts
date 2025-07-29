import { getGroupConfig } from '@/app/actions';
import { serverEnv } from '@/env/server';
// import { xai } from '@ai-sdk/xai';
// import E from '@/data_stream/';
// import Ram from '@/os';
import { cohere } from '@ai-sdk/cohere';
import { mistral } from '@ai-sdk/mistral';
import { openai } from '@ai-sdk/openai';
import { tavily } from '@tavily/core';
import { convertToCoreMessages, createDataStreamResponse, customProvider, generateObject, NoSuchToolError, smoothStream, streamText, tool } from 'ai';
import MemoryClient from 'mem0ai';
import { z } from 'zod';
import { getModelName } from '@/config/modelConfig';

const scira = customProvider({
	languageModels: {
		'scira-default': openai('gpt-4o-mini'),
		'scira-vision': openai('gpt-4o-mini'),
		'scira-cmd-a': cohere('command-a-03-2025'),
		'scira-mistral': mistral('mistral-small-latest'),
		'deepseek-chat': openai(getModelName()),
	},
});

// Modify the POST function to use the new handler
export async function POST(req: Request) {
	const { messages, model, group, user_id, timezone } = await req.json();
	const { tools: activeTools, systemPrompt, toolInstructions, responseGuidelines } = await getGroupConfig(group);

	const last_message = messages[messages.length - 1];
	const last_message_content = last_message.content;

	console.log('Last message content: ', last_message_content);

	if (group !== 'chat' && group !== 'buddy') {
		return createDataStreamResponse({
			execute: async (dataStream) => {
				dataStream.writeData({ value: 'Hello' });

				// const feedback = new FeedbackStream(dataStream);

				// feedback.thought('Thinking...');

				// const ram = new Ram(feedback);

				// await ram.start(last_message_content);

				// const { message } = await req.json()

				// if (!message) {
				// 	return NextResponse.json({ error: 'Message is required' }, { status: 400 })
				// }

				// const osClient = new OsClient()
				// const sessionId = await osClient.connect()

				// // Connect to OS server if not already connected
				// const sessionId = await osClient.connect()

				// // Send the message to the OS
				// await osClient.sendMessage(message)

				// // Return the session ID so the client can use it for WebSocket updates
				// return NextResponse.json({
				// 	success: true,
				// 	sessionId
				// })

				const response = streamText({
					model: scira.languageModel(getModelName()),
					system: responseGuidelines,
					experimental_transform: smoothStream({
						chunking: 'word',
						delayInMs: 15,
					}),
					messages: convertToCoreMessages(messages),
					onFinish(event) {
						// console.log('Fin reason[2]: ', event.finishReason);
					},
					onError(event) {
						console.log('Error: ', event.error);
					},
				});
				return response.mergeIntoDataStream(dataStream, {
					experimental_sendStart: true,
				});
			},
		});
	} else {
		console.log('Running inside part 2');
		return createDataStreamResponse({
			execute: async (dataStream) => {
				const result = streamText({
					model: scira.languageModel(model),
					maxSteps: 5,
					providerOptions: {
						groq: {
							reasoning_format: group === 'chat' ? 'raw' : 'parsed',
						},
						anthropic: {
							thinking: {
								type: group === 'chat' ? 'enabled' : 'disabled',
								budgetTokens: 12000,
							},
						},
					},
					messages: convertToCoreMessages(messages),
					temperature: 0,
					experimental_transform: smoothStream({
						chunking: 'word',
						delayInMs: 15,
					}),
					experimental_activeTools: group === 'chat' ? [] : ['memory_manager'],
					system: systemPrompt,
					tools: {
						memory_manager: tool({
							description: 'Manage personal memories with add and search operations.',
							parameters: z.object({
								action: z.enum(['add', 'search']).describe('The memory operation to perform'),
								content: z.string().optional().describe('The memory content for add operation'),
								query: z.string().optional().describe('The search query for search operations'),
							}),
							execute: async ({ action, content, query }: { action: 'add' | 'search'; content?: string; query?: string }) => {
								const client = new MemoryClient({ apiKey: serverEnv.MEM0_API_KEY });

								console.log('action', action);
								console.log('content', content);
								console.log('query', query);

								try {
									switch (action) {
										case 'add': {
											if (!content) {
												return {
													success: false,
													action: 'add',
													message: 'Content is required for add operation',
												};
											}
											const result = await client.add(content, {
												user_id,
												org_id: serverEnv.MEM0_ORG_ID,
												project_id: serverEnv.MEM0_PROJECT_ID,
											});
											if (result.length === 0) {
												return {
													success: false,
													action: 'add',
													message: 'No memory added',
												};
											}
											console.log('result', result);
											return {
												success: true,
												action: 'add',
												memory: result[0],
											};
										}
										case 'search': {
											if (!query) {
												return {
													success: false,
													action: 'search',
													message: 'Query is required for search operation',
												};
											}
											const searchFilters = {
												AND: [{ user_id }],
											};
											const result = await client.search(query, {
												filters: searchFilters,
												api_version: 'v2',
											});
											if (!result || !result[0]) {
												return {
													success: false,
													action: 'search',
													message: 'No results found for the search query',
												};
											}
											return {
												success: true,
												action: 'search',
												results: result[0],
											};
										}
									}
								} catch (error) {
									console.error('Memory operation error:', error);
									throw error;
								}
							},
						}),
					},
					experimental_repairToolCall: async ({ toolCall, tools, parameterSchema, error }) => {
						if (NoSuchToolError.isInstance(error)) {
							return null; // do not attempt to fix invalid tool names
						}

						console.log('Fixing tool call================================');
						console.log('toolCall', toolCall);
						console.log('tools', tools);
						console.log('parameterSchema', parameterSchema);
						console.log('error', error);

						const tool = tools[toolCall.toolName as keyof typeof tools];

						const { object: repairedArgs } = await generateObject({
							model: scira.languageModel('scira-default'),
							schema: tool.parameters,
							prompt: [
								`The model tried to call the tool "${toolCall.toolName}"` + ` with the following arguments:`,
								JSON.stringify(toolCall.args),
								`The tool accepts the following schema:`,
								JSON.stringify(parameterSchema(toolCall)),
								'Please fix the arguments.',
								'Do not use print statements stock chart tool.',
								`For the stock chart tool you have to generate a python code with matplotlib and yfinance to plot the stock chart.`,
								`For the web search make multiple queries to get the best results.`,
								`Today's date is ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`,
							].join('\n'),
						});

						console.log('repairedArgs', repairedArgs);

						return { ...toolCall, args: JSON.stringify(repairedArgs) };
					},
					onChunk(event) {
						if (event.chunk.type === 'tool-call') {
							console.log('Called Tool: ', event.chunk.toolName);
						}
					},
					onStepFinish(event) {
						if (event.warnings) {
							console.log('Warnings: ', event.warnings);
						}
					},
					onFinish(event) {
						console.log('Fin reason: ', event.finishReason);
						console.log('Reasoning: ', event.reasoning);
						console.log('reasoning details: ', event.reasoningDetails);
						console.log('Steps ', event.steps);
						console.log('Messages: ', event.response.messages);
					},
					onError(event) {
						console.log('Error: ', event.error);
					},
				});

				result.mergeIntoDataStream(dataStream, {
					sendReasoning: true,
				});
			},
		});
	}
}
