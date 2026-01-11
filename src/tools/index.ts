// Tools are moved to services
// This file is kept for backward compatibility but is no longer used for MCP

export const ALL_TOOLS = [];

export async function executeTool(
  name: string,
  args: Record<string, any>,
  userEmail: string
): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  return { 
    content: [{ type: "text", text: `Tool system has been removed. Use REST APIs instead.` }], 
    isError: true 
  };
}
