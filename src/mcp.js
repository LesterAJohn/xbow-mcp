import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";

function tool(name, description, inputSchema) {
  const schema = inputSchema.type === "object"
    ? {
        ...inputSchema,
        properties: {
          ...inputSchema.properties,
          apiToken: {
            type: "string",
            description: "Optional XBOW token for this request. Use this to support per-user credentials.",
          },
          userId: {
            type: "string",
            description: "Optional user identifier used to select a stored per-user token.",
          },
        },
      }
    : inputSchema;

  return {
    name,
    description,
    inputSchema: schema,
  };
}

function jsonContent(value) {
  return [{ type: "text", text: JSON.stringify(value, null, 2) }];
}

function ensureString(value, fieldName) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`${fieldName} is required`);
  }
  return value.trim();
}

function ensureAuthorized(client, input, toolName) {
  if (typeof client?.adminAuthKey === "string" && client.adminAuthKey.trim() !== "") {
    if (typeof input?.authorizationKey !== "string" || input.authorizationKey.trim() === "") {
      throw new Error(`authorizationKey is required for ${toolName}`);
    }

    if (input.authorizationKey !== client.adminAuthKey) {
      throw new Error(`authorizationKey is invalid for ${toolName}`);
    }
  }
}

export const toolDefinitions = [
  tool(
    "xbow_set_default_api_token",
    "Update the default XBOW token used for requests that do not specify a user-specific override.",
    {
      type: "object",
      properties: {
        apiToken: { type: "string" },
      },
      required: ["apiToken"],
      additionalProperties: false,
    },
  ),
  tool(
    "xbow_set_user_api_token",
    "Store or update the XBOW token for a specific user identifier.",
    {
      type: "object",
      properties: {
        userId: { type: "string" },
        apiToken: { type: "string" },
      },
      required: ["userId", "apiToken"],
      additionalProperties: false,
    },
  ),
  tool(
    "xbow_clear_user_api_token",
    "Remove a stored per-user XBOW token for the given user identifier.",
    {
      type: "object",
      properties: {
        userId: { type: "string" },
      },
      required: ["userId"],
      additionalProperties: false,
    },
  ),
  tool(
    "xbow_request",
    "Call any XBOW REST endpoint with the required auth and version headers already applied.",
    {
      type: "object",
      properties: {
        method: { type: "string", description: "HTTP method such as GET, POST, PATCH, PUT, or DELETE." },
        path: { type: "string", description: "Path relative to /api/v1, for example /assets/asset-123/findings." },
        query: { type: "object", additionalProperties: true },
        body: { description: "JSON body for mutating endpoints.", additionalProperties: true },
      },
      required: ["method", "path"],
      additionalProperties: false,
    },
  ),
  tool(
    "xbow_get_meta_addresses",
    "Fetch XBOW instance addresses from GET /meta/addresses.",
    {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  ),
  tool(
    "xbow_get_meta_openapi",
    "Fetch the current XBOW OpenAPI document from GET /meta/openapi.json.",
    {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  ),
  tool(
    "xbow_get_meta_webhook_signing_keys",
    "Fetch Ed25519 signing keys for XBOW webhook verification.",
    {
      type: "object",
      properties: {},
      additionalProperties: false,
    },
  ),
  tool(
    "xbow_list_organization_assets",
    "List assets within an organization.",
    {
      type: "object",
      properties: {
        organizationId: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 100 },
        after: { type: "string" },
      },
      required: ["organizationId"],
      additionalProperties: false,
    },
  ),
  tool(
    "xbow_get_asset",
    "Fetch a single asset by ID.",
    {
      type: "object",
      properties: {
        assetId: { type: "string" },
      },
      required: ["assetId"],
      additionalProperties: false,
    },
  ),
  tool(
    "xbow_list_asset_findings",
    "List findings for an asset.",
    {
      type: "object",
      properties: {
        assetId: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 100 },
        after: { type: "string" },
      },
      required: ["assetId"],
      additionalProperties: false,
    },
  ),
  tool(
    "xbow_get_finding",
    "Fetch a single finding by ID.",
    {
      type: "object",
      properties: {
        findingId: { type: "string" },
      },
      required: ["findingId"],
      additionalProperties: false,
    },
  ),
  tool(
    "xbow_update_finding_workflow",
    "Update finding workflow metadata with PATCH /findings/{findingId}.",
    {
      type: "object",
      properties: {
        findingId: { type: "string" },
        externalWorkflowState: {
          anyOf: [{ type: "string" }, { type: "null" }],
          description: "Customer-controlled workflow state; use null to clear it.",
        },
        externalTicketReference: {
          anyOf: [{ type: "string" }, { type: "null" }],
          description: "Customer ticket reference; use null to clear it.",
        },
      },
      required: ["findingId"],
      additionalProperties: false,
    },
  ),
  tool(
    "xbow_list_asset_assessments",
    "List assessments attached to an asset.",
    {
      type: "object",
      properties: {
        assetId: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 100 },
        after: { type: "string" },
      },
      required: ["assetId"],
      additionalProperties: false,
    },
  ),
  tool(
    "xbow_get_assessment",
    "Fetch a single assessment by ID.",
    {
      type: "object",
      properties: {
        assessmentId: { type: "string" },
      },
      required: ["assessmentId"],
      additionalProperties: false,
    },
  ),
  tool(
    "xbow_list_asset_reports",
    "List reports attached to an asset.",
    {
      type: "object",
      properties: {
        assetId: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 100 },
        after: { type: "string" },
      },
      required: ["assetId"],
      additionalProperties: false,
    },
  ),
  tool(
    "xbow_get_report",
    "Fetch a report by ID.",
    {
      type: "object",
      properties: {
        reportId: { type: "string" },
      },
      required: ["reportId"],
      additionalProperties: false,
    },
  ),
  tool(
    "xbow_get_report_summary",
    "Fetch the summary for a report.",
    {
      type: "object",
      properties: {
        reportId: { type: "string" },
      },
      required: ["reportId"],
      additionalProperties: false,
    },
  ),
  tool(
    "xbow_list_organization_webhooks",
    "List webhook subscriptions for an organization.",
    {
      type: "object",
      properties: {
        organizationId: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 100 },
        after: { type: "string" },
      },
      required: ["organizationId"],
      additionalProperties: false,
    },
  ),
  tool(
    "xbow_get_webhook",
    "Fetch a webhook subscription by ID.",
    {
      type: "object",
      properties: {
        webhookId: { type: "string" },
      },
      required: ["webhookId"],
      additionalProperties: false,
    },
  ),
  tool(
    "xbow_update_webhook",
    "Update a webhook subscription by ID.",
    {
      type: "object",
      properties: {
        webhookId: { type: "string" },
        apiVersion: { type: "string" },
        targetUrl: { type: "string" },
      },
      required: ["webhookId"],
      additionalProperties: false,
    },
  ),
  tool(
    "xbow_delete_webhook",
    "Delete a webhook subscription by ID.",
    {
      type: "object",
      properties: {
        webhookId: { type: "string" },
      },
      required: ["webhookId"],
      additionalProperties: false,
    },
  ),
  tool(
    "xbow_ping_webhook",
    "Send a webhook connectivity ping.",
    {
      type: "object",
      properties: {
        webhookId: { type: "string" },
      },
      required: ["webhookId"],
      additionalProperties: false,
    },
  ),
  tool(
    "xbow_list_webhook_deliveries",
    "List delivery attempts for a webhook subscription.",
    {
      type: "object",
      properties: {
        webhookId: { type: "string" },
        limit: { type: "integer", minimum: 1, maximum: 100 },
        after: { type: "string" },
      },
      required: ["webhookId"],
      additionalProperties: false,
    },
  ),
];

export async function invokeTool(client, name, input = {}) {
  const requestOptions = {
    apiToken: input.apiToken,
  };

  switch (name) {
    case "xbow_set_default_api_token": {
      const apiToken = ensureString(input.apiToken, "apiToken");
      const value = await client.setDefaultApiToken(apiToken);
      return jsonContent({ ok: true, apiToken: value });
    }
    case "xbow_set_user_api_token": {
      const userId = ensureString(input.userId, "userId");
      const apiToken = ensureString(input.apiToken, "apiToken");
      const value = await client.setUserApiToken(userId, apiToken);
      return jsonContent({ ok: true, userId, apiToken: value });
    }
    case "xbow_clear_user_api_token": {
      const userId = ensureString(input.userId, "userId");
      client.clearUserApiToken(userId);
      return jsonContent({ ok: true, userId });
    }
    case "xbow_request": {
      const method = ensureString(input.method, "method");
      const path = ensureString(input.path, "path");
      const payload = await client.request(path, {
        ...requestOptions,
        userId: input.userId,
        method,
        query: input.query ?? {},
        body: input.body,
      });
      return jsonContent(payload);
    }
    case "xbow_get_meta_addresses":
      return jsonContent(await client.request("/meta/addresses", { ...requestOptions, userId: input.userId }));
    case "xbow_get_meta_openapi":
      return jsonContent(await client.request("/meta/openapi.json", { ...requestOptions, userId: input.userId }));
    case "xbow_get_meta_webhook_signing_keys":
      return jsonContent(await client.request("/meta/webhooks-signing-keys", { ...requestOptions, userId: input.userId }));
    case "xbow_list_organization_assets": {
      const organizationId = ensureString(input.organizationId, "organizationId");
      return jsonContent(await client.request(`/organizations/${organizationId}/assets`, {
        ...requestOptions,
        userId: input.userId,
        query: { limit: input.limit, after: input.after },
      }));
    }
    case "xbow_get_asset": {
      const assetId = ensureString(input.assetId, "assetId");
      return jsonContent(await client.request(`/assets/${assetId}`, { ...requestOptions, userId: input.userId }));
    }
    case "xbow_list_asset_findings": {
      const assetId = ensureString(input.assetId, "assetId");
      return jsonContent(await client.request(`/assets/${assetId}/findings`, {
        ...requestOptions,
        userId: input.userId,
        query: { limit: input.limit, after: input.after },
      }));
    }
    case "xbow_get_finding": {
      const findingId = ensureString(input.findingId, "findingId");
      return jsonContent(await client.request(`/findings/${findingId}`, { ...requestOptions, userId: input.userId }));
    }
    case "xbow_update_finding_workflow": {
      ensureAuthorized(client, input, "xbow_update_finding_workflow");
      const findingId = ensureString(input.findingId, "findingId");
      const body = {};

      if (Object.hasOwn(input, "externalWorkflowState")) {
        body.externalWorkflowState = input.externalWorkflowState;
      }

      if (Object.hasOwn(input, "externalTicketReference")) {
        body.externalTicketReference = input.externalTicketReference;
      }

      if (Object.hasOwn(body, "externalTicketReference") && !Object.hasOwn(body, "externalWorkflowState")) {
        throw new Error("externalWorkflowState must be provided when externalTicketReference is set");
      }

      return jsonContent(await client.request(`/findings/${findingId}`, {
        ...requestOptions,
        userId: input.userId,
        method: "PATCH",
        body,
      }));
    }
    case "xbow_list_asset_assessments": {
      const assetId = ensureString(input.assetId, "assetId");
      return jsonContent(await client.request(`/assets/${assetId}/assessments`, {
        ...requestOptions,
        userId: input.userId,
        query: { limit: input.limit, after: input.after },
      }));
    }
    case "xbow_get_assessment": {
      const assessmentId = ensureString(input.assessmentId, "assessmentId");
      return jsonContent(await client.request(`/assessments/${assessmentId}`, { ...requestOptions, userId: input.userId }));
    }
    case "xbow_list_asset_reports": {
      const assetId = ensureString(input.assetId, "assetId");
      return jsonContent(await client.request(`/assets/${assetId}/reports`, {
        ...requestOptions,
        userId: input.userId,
        query: { limit: input.limit, after: input.after },
      }));
    }
    case "xbow_get_report": {
      const reportId = ensureString(input.reportId, "reportId");
      return jsonContent(await client.request(`/reports/${reportId}`, { ...requestOptions, userId: input.userId }));
    }
    case "xbow_get_report_summary": {
      const reportId = ensureString(input.reportId, "reportId");
      return jsonContent(await client.request(`/reports/${reportId}/summary`, { ...requestOptions, userId: input.userId }));
    }
    case "xbow_list_organization_webhooks": {
      const organizationId = ensureString(input.organizationId, "organizationId");
      return jsonContent(await client.request(`/organizations/${organizationId}/webhooks`, {
        ...requestOptions,
        userId: input.userId,
        query: { limit: input.limit, after: input.after },
      }));
    }
    case "xbow_get_webhook": {
      const webhookId = ensureString(input.webhookId, "webhookId");
      return jsonContent(await client.request(`/webhooks/${webhookId}`, { ...requestOptions, userId: input.userId }));
    }
    case "xbow_update_webhook": {
      ensureAuthorized(client, input, "xbow_update_webhook");
      const webhookId = ensureString(input.webhookId, "webhookId");
      const body = {};

      if (Object.hasOwn(input, "apiVersion")) {
        body.apiVersion = input.apiVersion;
      }

      if (Object.hasOwn(input, "targetUrl")) {
        body.targetUrl = input.targetUrl;
      }

      return jsonContent(await client.request(`/webhooks/${webhookId}`, {
        ...requestOptions,
        userId: input.userId,
        method: "PATCH",
        body,
      }));
    }
    case "xbow_delete_webhook": {
      ensureAuthorized(client, input, "xbow_delete_webhook");
      const webhookId = ensureString(input.webhookId, "webhookId");
      return jsonContent(await client.request(`/webhooks/${webhookId}`, {
        ...requestOptions,
        userId: input.userId,
        method: "DELETE",
      }));
    }
    case "xbow_ping_webhook": {
      ensureAuthorized(client, input, "xbow_ping_webhook");
      const webhookId = ensureString(input.webhookId, "webhookId");
      return jsonContent(await client.request(`/webhooks/${webhookId}/ping`, {
        ...requestOptions,
        userId: input.userId,
        method: "POST",
      }));
    }
    case "xbow_list_webhook_deliveries": {
      const webhookId = ensureString(input.webhookId, "webhookId");
      return jsonContent(await client.request(`/webhooks/${webhookId}/deliveries`, {
        ...requestOptions,
        userId: input.userId,
        query: { limit: input.limit, after: input.after },
      }));
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

export function createXbowServer(client) {
  const server = new Server(
    {
      name: "xbow-mcp",
      version: "0.1.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: toolDefinitions,
  }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
      const result = await invokeTool(client, request.params.name, request.params.arguments ?? {});
      return {
        content: result,
      };
    } catch (error) {
      return {
        isError: true,
        content: jsonContent({
          message: error instanceof Error ? error.message : String(error),
          name: error?.name,
        }),
      };
    }
  });

  return server;
}
