import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { createXbowClient, defaultXbowClientConfigFromEnv } from "./client.js";
import { createXbowServer } from "./mcp.js";

async function main() {
  const client = createXbowClient(defaultXbowClientConfigFromEnv());
  const server = createXbowServer(client);
  const transport = new StdioServerTransport();

  await server.connect(transport);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
