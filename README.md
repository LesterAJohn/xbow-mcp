# xbow-mcp

An MCP server for the XBOW API.

This server wraps the public XBOW REST API at `https://console.xbow.com/api/v1/` and injects the required `Authorization` and `X-XBOW-API-Version` headers for every request.

## What it covers

The current tool set focuses on the most useful XBOW flows:

- Meta lookups such as addresses, the OpenAPI document, and webhook signing keys.
- Core organization, asset, assessment, finding, and report reads.
- Finding workflow updates for `externalWorkflowState` and `externalTicketReference`.
- Webhook list, inspect, update, delete, ping, and delivery lookup operations.
- A generic `xbow_request` tool for endpoints that are not wrapped yet.

## Requirements

- Node.js 20 or newer.
- An XBOW personal access token from the XBOW console.

## Setup

1. Install dependencies with `npm install`.
2. Copy [.env.example](.env.example) to `.env` and set `XBOW_API_TOKEN`.
3. Start the server with `npm start`.

## Configuration

- `XBOW_API_TOKEN`: default API token used as `Authorization: Bearer ...` when no per-request token is supplied.
- `XBOW_API_BASE_URL`: defaults to `https://console.xbow.com/api/v1`.
- `XBOW_API_VERSION`: defaults to `2026-07-01`.
- `XBOW_ADMIN_AUTH_KEY`: optional admin authorization key. When configured, mutating tools require an `authorizationKey` argument.

## Multi-user support

The server now exposes explicit runtime tools for credential management:

- `xbow_set_default_api_token` updates the default token used for requests that do not specify a user-specific override.
- `xbow_set_user_api_token` stores a token for a specific `userId`.
- `xbow_clear_user_api_token` removes a stored per-user token.

Each tool call can optionally include an `apiToken` argument or a `userId` to select a stored token. When present, those values override the default `XBOW_API_TOKEN` for that single request, which allows a single MCP server instance to be used by multiple users or tenants with different credentials.

Examples:

```json
{
  "name": "xbow_set_default_api_token",
  "arguments": {
    "apiToken": "default-token"
  }
}
```

```json
{
  "name": "xbow_set_user_api_token",
  "arguments": {
    "userId": "alice",
    "apiToken": "alice-token"
  }
}
```

```json
{
  "method": "GET",
  "path": "/meta/addresses",
  "userId": "alice"
}
```

## Authorization for mutating tools

The MCP server follows the same pattern as the skeleton MCP template:

- read-only tools remain available without extra authorization.
- mutating tools such as token updates, finding workflow updates, webhook updates/deletes, and generic `xbow_request` calls with `POST`, `PATCH`, `PUT`, or `DELETE` require an `authorizationKey` when `XBOW_ADMIN_AUTH_KEY` is configured.

Example:

```json
{
  "name": "xbow_update_finding_workflow",
  "arguments": {
    "findingId": "finding-1",
    "externalWorkflowState": "triaged",
    "authorizationKey": "super-secret-key"
  }
}
```

## Example usage

The server is meant to run over stdio for MCP clients such as VS Code, Claude Desktop, and other MCP-aware tools.

```json
{
  "mcpServers": {
    "xbow-mcp": {
      "command": "npm",
      "args": ["start"],
      "cwd": "/Users/lesterjohn/Documents/GitHub/xbow-mcp"
    }
  }
}
```

## Tool reference

- `xbow_set_default_api_token`
- `xbow_set_user_api_token`
- `xbow_clear_user_api_token`
- `xbow_request`
- `xbow_get_meta_addresses`
- `xbow_get_meta_openapi`
- `xbow_get_meta_webhook_signing_keys`
- `xbow_list_organization_assets`
- `xbow_get_asset`
- `xbow_list_asset_findings`
- `xbow_get_finding`
- `xbow_update_finding_workflow`
- `xbow_list_asset_assessments`
- `xbow_get_assessment`
- `xbow_list_asset_reports`
- `xbow_get_report`
- `xbow_get_report_summary`
- `xbow_list_organization_webhooks`
- `xbow_get_webhook`
- `xbow_update_webhook`
- `xbow_delete_webhook`
- `xbow_ping_webhook`
- `xbow_list_webhook_deliveries`

## Testing

Run the test suite with:

```bash
npm test
```

The tests validate:

- XBOW auth and version header injection.
- Retry behavior for `429 Too Many Requests`.
- The finding workflow update path for `PATCH /api/v1/findings/{findingId}`.
- The XBOW-specific tool catalog.
- Authorization enforcement for mutating tools and generic mutating request methods.
