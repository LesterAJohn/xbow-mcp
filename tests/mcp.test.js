import assert from "node:assert/strict";
import test from "node:test";
import { createXbowClient } from "../src/client.js";
import { invokeTool, toolDefinitions } from "../src/mcp.js";

test("xbow tool catalog includes XBOW-specific endpoints", () => {
  const toolNames = toolDefinitions.map((tool) => tool.name);
  assert.ok(toolNames.includes("xbow_request"));
  assert.ok(toolNames.includes("xbow_get_meta_webhook_signing_keys"));
  assert.ok(toolNames.includes("xbow_update_finding_workflow"));
  assert.ok(toolNames.includes("xbow_query_suggestion_schema_discovery"));
});

test("query suggestion tool returns schema-aware recommendations for other tools", async () => {
  const client = createXbowClient({
    apiToken: "token-123",
    fetchImpl: async () => new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
    sleep: async () => {},
  });

  const content = await invokeTool(client, "xbow_query_suggestion_schema_discovery", {
    goal: "triage findings",
    includeSchemas: true,
    includeExamples: true,
  });

  const payload = JSON.parse(content[0].text);
  assert.equal(payload.purpose, "Recommend which XBOW MCP tools to call and expose their input schemas.");
  assert.ok(Array.isArray(payload.recommendations));
  assert.ok(payload.recommendations.length > 0);
  assert.ok(payload.recommendations.every((entry) => entry.tool !== "xbow_query_suggestion_schema_discovery"));

  const findingRecommendation = payload.recommendations.find((entry) => entry.tool === "xbow_update_finding_workflow");
  assert.ok(findingRecommendation);
  assert.ok(Array.isArray(findingRecommendation.requiredFields));
  assert.ok(Array.isArray(findingRecommendation.schema.fields));
  assert.equal(findingRecommendation.example.name, "xbow_update_finding_workflow");
});

test("query suggestion tool can filter by operation type", async () => {
  const client = createXbowClient({
    apiToken: "token-123",
    fetchImpl: async () => new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
    sleep: async () => {},
  });

  const content = await invokeTool(client, "xbow_query_suggestion_schema_discovery", {
    operationType: "mutating",
    includeSchemas: false,
    includeExamples: false,
  });

  const payload = JSON.parse(content[0].text);
  assert.ok(payload.recommendations.length > 0);
  assert.ok(payload.recommendations.every((entry) => entry.operationType === "mutating"));
  assert.ok(payload.recommendations.every((entry) => entry.schema === undefined));
  assert.ok(payload.recommendations.every((entry) => entry.example === undefined));
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

test("tool invocations can override the auth token per request", async () => {
  const calls = [];
  const client = createXbowClient({
    apiToken: "default-token",
    fetchImpl: async (url, options) => {
      calls.push({ url: url.toString(), options });
      return new Response(JSON.stringify({ id: "asset-1" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
    sleep: async () => {},
  });

  await invokeTool(client, "xbow_get_asset", { assetId: "asset-1", apiToken: "user-token" });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.headers.get("authorization"), "Bearer user-token");
});

test("MCP tools can update default and user tokens at runtime", async () => {
  const calls = [];
  const client = createXbowClient({
    apiToken: "initial-token",
    fetchImpl: async (url, options) => {
      calls.push({ url: url.toString(), options });
      return new Response(JSON.stringify({ id: "asset-1" }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
    sleep: async () => {},
  });

  await invokeTool(client, "xbow_set_default_api_token", { apiToken: "default-2" });
  await invokeTool(client, "xbow_set_user_api_token", { userId: "alice", apiToken: "alice-2" });
  await invokeTool(client, "xbow_get_asset", { assetId: "asset-1" });
  await invokeTool(client, "xbow_get_asset", { assetId: "asset-2", userId: "alice" });

  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.headers.get("authorization"), "Bearer default-2");
  assert.equal(calls[1].options.headers.get("authorization"), "Bearer alice-2");
});

test("mutating tools require the configured admin authorization key", async () => {
  const client = createXbowClient({
    apiToken: "default-token",
    adminAuthKey: "test-key",
    fetchImpl: async () => new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
    sleep: async () => {},
  });

  await assert.rejects(
    () => invokeTool(client, "xbow_update_finding_workflow", {
      findingId: "finding-1",
      externalWorkflowState: "triaged",
      authorizationKey: "",
    }),
    /authorizationKey/,
  );
});

test("token-management tools are treated as mutating operations", async () => {
  const client = createXbowClient({
    apiToken: "default-token",
    adminAuthKey: "test-key",
    fetchImpl: async () => new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
    sleep: async () => {},
  });

  await assert.rejects(
    () => invokeTool(client, "xbow_set_default_api_token", {
      apiToken: "new-token",
      authorizationKey: "",
    }),
    /authorizationKey/,
  );

  await assert.rejects(
    () => invokeTool(client, "xbow_clear_user_api_token", {
      userId: "alice",
      authorizationKey: "",
    }),
    /authorizationKey/,
  );
});

test("generic request tools require authorization for mutating methods", async () => {
  const client = createXbowClient({
    apiToken: "default-token",
    adminAuthKey: "test-key",
    fetchImpl: async () => new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
    sleep: async () => {},
  });

  await assert.rejects(
    () => invokeTool(client, "xbow_request", {
      method: "PATCH",
      path: "/findings/finding-1",
      authorizationKey: "",
    }),
    /authorizationKey/,
  );
});
