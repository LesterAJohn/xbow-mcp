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

- `XBOW_API_TOKEN`: required API token used as `Authorization: Bearer ...`.
- `XBOW_API_BASE_URL`: defaults to `https://console.xbow.com/api/v1`.
- `XBOW_API_VERSION`: defaults to `2026-07-01`.

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
