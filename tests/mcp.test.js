import assert from "node:assert/strict";
import test from "node:test";
import { createXbowClient } from "../src/client.js";
import { invokeTool, toolDefinitions } from "../src/mcp.js";

test("xbow tool catalog includes XBOW-specific endpoints", () => {
  const toolNames = toolDefinitions.map((tool) => tool.name);
  assert.ok(toolNames.includes("xbow_request"));
  assert.ok(toolNames.includes("xbow_get_meta_webhook_signing_keys"));
  assert.ok(toolNames.includes("xbow_update_finding_workflow"));
});

test("finding workflow tool patches the XBOW finding endpoint", async () => {
  const calls = [];
  const client = createXbowClient({
    apiToken: "token-123",
    fetchImpl: async (url, options) => {
      calls.push({ url: url.toString(), options });
      return new Response(JSON.stringify({ id: "finding-1", externalWorkflowState: "triaged" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
    sleep: async () => {},
  });

  const content = await invokeTool(client, "xbow_update_finding_workflow", {
    findingId: "finding-1",
    externalWorkflowState: "triaged",
    externalTicketReference: "JIRA-12",
  });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, "https://console.xbow.com/api/v1/findings/finding-1");
  assert.equal(calls[0].options.method, "PATCH");
  assert.deepEqual(JSON.parse(calls[0].options.body), {
    externalWorkflowState: "triaged",
    externalTicketReference: "JIRA-12",
  });
  assert.deepEqual(content, [{ type: "text", text: JSON.stringify({ id: "finding-1", externalWorkflowState: "triaged" }, null, 2) }]);
});
