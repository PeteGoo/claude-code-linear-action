#!/usr/bin/env node
// Linear Comment MCP Server - Provides comment update functionality for Linear issues
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { updateLinearTrackingComment } from "../linear/operations/comments";
import { sanitizeContent } from "../github/utils/sanitizer";

const LINEAR_API_KEY = process.env.LINEAR_API_KEY;
const LINEAR_COMMENT_ID = process.env.LINEAR_COMMENT_ID;

if (!LINEAR_API_KEY) {
  console.error("Error: LINEAR_API_KEY environment variable is required");
  process.exit(1);
}

if (!LINEAR_COMMENT_ID) {
  console.error("Error: LINEAR_COMMENT_ID environment variable is required");
  process.exit(1);
}

const server = new McpServer({
  name: "Linear Comment Server",
  version: "0.0.1",
});

server.tool(
  "update_linear_comment",
  "Update the Claude tracking comment on the Linear issue with progress and results",
  {
    body: z.string().describe("The updated comment content (markdown)"),
  },
  async ({ body }) => {
    try {
      const sanitizedBody = sanitizeContent(body);

      await updateLinearTrackingComment(
        LINEAR_API_KEY!,
        LINEAR_COMMENT_ID!,
        sanitizedBody,
      );

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify({ success: true }, null, 2),
          },
        ],
      };
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      return {
        content: [
          {
            type: "text",
            text: `Error: ${errorMessage}`,
          },
        ],
        error: errorMessage,
        isError: true,
      };
    }
  },
);

async function runServer() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  process.on("exit", () => {
    server.close();
  });
}

runServer().catch(console.error);
