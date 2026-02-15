import { describe, expect, it, mock, afterEach } from "bun:test";
import { linearGraphQL } from "../../src/linear/api/client";

describe("linearGraphQL", () => {
  const originalFetch = globalThis.fetch;

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("should make a successful GraphQL request", async () => {
    const mockData = { issue: { id: "123", title: "Test" } };

    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ data: mockData }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    ) as any;

    const result = await linearGraphQL<typeof mockData>(
      "test-api-key",
      "query { issue { id title } }",
    );

    expect(result).toEqual(mockData);

    // Verify the request was made correctly
    const fetchCall = (globalThis.fetch as any).mock.calls[0];
    expect(fetchCall[0]).toBe("https://api.linear.app/graphql");
    expect(fetchCall[1].method).toBe("POST");
    expect(fetchCall[1].headers.Authorization).toBe("test-api-key");
  });

  it("should throw on HTTP error", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response("Internal Server Error", {
          status: 500,
          statusText: "Internal Server Error",
        }),
      ),
    ) as any;

    await expect(
      linearGraphQL("test-api-key", "query { test }"),
    ).rejects.toThrow("Linear API request failed: 500");
  });

  it("should throw on GraphQL errors", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            errors: [{ message: "Issue not found" }],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } },
        ),
      ),
    ) as any;

    await expect(
      linearGraphQL("test-api-key", "query { test }"),
    ).rejects.toThrow("Linear GraphQL errors: Issue not found");
  });

  it("should throw when data is null", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ data: null }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    ) as any;

    await expect(
      linearGraphQL("test-api-key", "query { test }"),
    ).rejects.toThrow("Linear API returned no data");
  });

  it("should pass variables in the request body", async () => {
    globalThis.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ data: { issue: {} } }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    ) as any;

    await linearGraphQL(
      "test-api-key",
      "query Test($id: String!) { issue(id: $id) { id } }",
      {
        id: "test-id",
      },
    );

    const fetchCall = (globalThis.fetch as any).mock.calls[0];
    const body = JSON.parse(fetchCall[1].body);
    expect(body.variables).toEqual({ id: "test-id" });
  });
});
