import assert from "node:assert/strict";
import test from "node:test";
import { createXbowClient, XbowApiError } from "../src/client.js";

test("xbow client attaches auth and version headers and retries 429s", async () => {
  const calls = [];
  let attempt = 0;

  const fetchImpl = async (url, options) => {
    calls.push({ url: url.toString(), options });
    attempt += 1;

    if (attempt === 1) {
      return new Response(JSON.stringify({ code: "ERR_RATE_LIMIT", error: "Too Many Requests", message: "slow down" }), {
        status: 429,
        headers: { "content-type": "application/json" },
      });
    }

    return new Response(JSON.stringify({ items: [{ id: "asset-1" }], nextCursor: null }), {
      status: 200,
      headers: { "content-type": "application/json" },
    });
  };

  const sleepCalls = [];
  const client = createXbowClient({
    apiToken: "token-123",
    apiVersion: "2026-07-01",
    baseUrl: "https://console.xbow.com/api/v1",
    fetchImpl,
    sleep: async (ms) => {
      sleepCalls.push(ms);
    },
  });

  const payload = await client.request("/organizations/org-1/assets", {
    query: { limit: 50, after: "cursor-1" },
  });

  assert.deepEqual(payload, { items: [{ id: "asset-1" }], nextCursor: null });
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, "https://console.xbow.com/api/v1/organizations/org-1/assets?limit=50&after=cursor-1");
  assert.equal(calls[0].options.method, "GET");
  assert.equal(calls[0].options.headers.get("authorization"), "Bearer token-123");
  assert.equal(calls[0].options.headers.get("x-xbow-api-version"), "2026-07-01");
  assert.deepEqual(sleepCalls, [250]);
});

test("xbow client uses a per-request token override when provided", async () => {
  const calls = [];
  const client = createXbowClient({
    apiToken: "default-token",
    fetchImpl: async (url, options) => {
      calls.push({ url: url.toString(), options });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
    sleep: async () => {},
  });

  await client.request("/assets/asset-1", { apiToken: "user-token" });

  assert.equal(calls.length, 1);
  assert.equal(calls[0].options.headers.get("authorization"), "Bearer user-token");
});

test("xbow client can update default and user tokens at runtime", async () => {
  const calls = [];
  const client = createXbowClient({
    apiToken: "default-token",
    fetchImpl: async (url, options) => {
      calls.push({ url: url.toString(), options });
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    },
    sleep: async () => {},
  });

  await client.setDefaultApiToken("updated-default-token");
  await client.setUserApiToken("alice", "alice-token");

  await client.request("/assets/asset-1");
  await client.request("/assets/asset-2", { userId: "alice" });

  assert.equal(calls.length, 2);
  assert.equal(calls[0].options.headers.get("authorization"), "Bearer updated-default-token");
  assert.equal(calls[1].options.headers.get("authorization"), "Bearer alice-token");
});

test("xbow client can persist user tokens through a vault-backed token store", async () => {
  const writes = [];
  const vaultClient = {
    async readSecret() {
      return null;
    },
    async writeSecret(path, payload) {
      writes.push({ path, payload });
    },
  };

  const client = createXbowClient({
    apiToken: "default-token",
    tokenStore: {
      type: "vault",
      vaultClient,
      appName: "xbow",
      userId: "default",
    },
    fetchImpl: async () => new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { "content-type": "application/json" },
    }),
    sleep: async () => {},
  });

  await client.setUserApiToken("alice", "alice-token");

  assert.equal(writes.length, 1);
  assert.equal(writes[0].path, "xbow/users/alice/xbow/token");
  assert.equal(writes[0].payload.token, "alice-token");
});

test("xbow client surfaces API errors with body details", async () => {
  const client = createXbowClient({
    apiToken: "token-123",
    fetchImpl: async () => new Response(JSON.stringify({ code: "ERR_FORBIDDEN", error: "Forbidden", message: "no access" }), {
      status: 403,
      headers: { "content-type": "application/json" },
    }),
    sleep: async () => {},
  });

  await assert.rejects(
    () => client.request("/assets/asset-1"),
    (error) => {
      assert.ok(error instanceof XbowApiError);
      assert.equal(error.status, 403);
      assert.equal(error.code, "ERR_FORBIDDEN");
      assert.match(error.message, /Forbidden: no access/);
      return true;
    },
  );
});
