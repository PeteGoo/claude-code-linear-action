import { describe, expect, it } from "bun:test";
import { parseLinearContext } from "../../src/linear/context";
import type { RepositoryDispatchEvent } from "../../src/github/context";

describe("parseLinearContext", () => {
  it("should parse a comment-triggered webhook", () => {
    const payload: RepositoryDispatchEvent = {
      action: "linear-webhook",
      client_payload: {
        action: "create",
        type: "Comment",
        data: {
          id: "comment-uuid-123",
          body: "@claude please fix this bug",
          issueId: "issue-uuid-456",
          issue: {
            id: "issue-uuid-456",
            identifier: "ENG-123",
            title: "Fix the login flow",
          },
          user: {
            id: "user-uuid-789",
            name: "Alice",
            email: "alice@example.com",
          },
          createdAt: "2024-01-01T00:00:00.000Z",
          url: "https://linear.app/eng/issue/ENG-123#comment-uuid-123",
        },
        createdAt: "2024-01-01T00:00:00.000Z",
      },
      repository: { name: "test-repo", owner: { login: "test-owner" } },
      sender: { login: "test-user" },
    };

    const result = parseLinearContext(payload);

    expect(result.issueId).toBe("issue-uuid-456");
    expect(result.identifier).toBe("ENG-123");
    expect(result.title).toBe("Fix the login flow");
    expect(result.triggerCommentBody).toBe("@claude please fix this bug");
    expect(result.triggerCommentId).toBe("comment-uuid-123");
    expect(result.actorName).toBe("Alice");
    expect(result.teamKey).toBe("ENG");
  });

  it("should parse an issue-triggered webhook", () => {
    const payload: RepositoryDispatchEvent = {
      action: "linear-webhook",
      client_payload: {
        action: "create",
        type: "Issue",
        data: {
          id: "issue-uuid-456",
          identifier: "PROJ-42",
          title: "Add dark mode support",
          description: "We need dark mode for accessibility",
          state: { name: "Todo", type: "unstarted" },
          priority: 2,
          team: { key: "PROJ", name: "Project Team" },
          assignee: { name: "Bob", email: "bob@example.com" },
          labels: [{ name: "feature" }],
          url: "https://linear.app/proj/issue/PROJ-42",
        },
        createdAt: "2024-01-01T00:00:00.000Z",
      },
      repository: { name: "test-repo", owner: { login: "bob-user" } },
      sender: { login: "bob-user" },
    };

    const result = parseLinearContext(payload);

    expect(result.issueId).toBe("issue-uuid-456");
    expect(result.identifier).toBe("PROJ-42");
    expect(result.title).toBe("Add dark mode support");
    expect(result.description).toBe("We need dark mode for accessibility");
    expect(result.triggerCommentBody).toBeUndefined();
    expect(result.triggerCommentId).toBeUndefined();
    expect(result.actorName).toBe("bob-user");
    expect(result.teamKey).toBe("PROJ");
  });

  it("should throw when client_payload is missing", () => {
    const payload: RepositoryDispatchEvent = {
      action: "linear-webhook",
      repository: { name: "test-repo", owner: { login: "test-owner" } },
      sender: { login: "test-user" },
    };

    expect(() => parseLinearContext(payload)).toThrow("Missing client_payload");
  });

  it("should extract team key from identifier", () => {
    const payload: RepositoryDispatchEvent = {
      action: "linear-webhook",
      client_payload: {
        action: "create",
        type: "Comment",
        data: {
          id: "c-1",
          body: "test",
          issueId: "i-1",
          issue: {
            id: "i-1",
            identifier: "TEAM-999",
            title: "Test",
          },
          user: { id: "u-1", name: "Test User", email: "test@example.com" },
          createdAt: "2024-01-01T00:00:00.000Z",
          url: "https://linear.app/team/issue/TEAM-999#c-1",
        },
        createdAt: "2024-01-01T00:00:00.000Z",
      },
      repository: { name: "test-repo", owner: { login: "test-owner" } },
      sender: { login: "test-user" },
    };

    const result = parseLinearContext(payload);
    expect(result.teamKey).toBe("TEAM");
  });
});
