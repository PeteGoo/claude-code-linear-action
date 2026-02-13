import { describe, expect, it } from "bun:test";
import { generateLinearPrompt } from "../../src/create-prompt";
import type { LinearContext } from "../../src/linear/types";
import type { LinearFetchResult } from "../../src/linear/data/fetcher";

describe("generateLinearPrompt", () => {
  const linearContext: LinearContext = {
    issueId: "issue-uuid-1",
    identifier: "ENG-123",
    title: "Fix the login flow",
    description: "Login fails on Safari",
    issueUrl: "https://linear.app/eng/issue/ENG-123",
    triggerCommentBody: "@claude please fix the Safari login issue",
    triggerCommentId: "comment-uuid-1",
    actorName: "Alice",
    teamKey: "ENG",
  };

  const linearData: LinearFetchResult = {
    issue: {
      id: "issue-uuid-1",
      identifier: "ENG-123",
      title: "Fix the login flow",
      description: "Login fails on Safari",
      url: "https://linear.app/eng/issue/ENG-123",
      state: { name: "In Progress", type: "started" },
      priority: 2,
      priorityLabel: "High",
      team: { key: "ENG", name: "Engineering" },
      assignee: { name: "Alice", email: "alice@example.com" },
      labels: { nodes: [{ name: "bug" }] },
      comments: {
        nodes: [
          {
            id: "c-1",
            body: "This is a blocker for the release",
            createdAt: "2024-01-01T00:00:00.000Z",
            user: { name: "Bob", email: "bob@example.com" },
          },
        ],
      },
    },
    comments: [
      {
        id: "c-1",
        body: "This is a blocker for the release",
        createdAt: "2024-01-01T00:00:00.000Z",
        user: { name: "Bob", email: "bob@example.com" },
      },
    ],
  };

  const opts = {
    repository: "test-owner/test-repo",
    claudeBranch: "claude/linear-eng-123-1234567890",
    baseBranch: "main",
    linearCommentId: "lc-uuid-1",
    jobUrl: "https://github.com/test-owner/test-repo/actions/runs/12345",
  };

  it("should include Linear issue context", () => {
    const prompt = generateLinearPrompt(linearContext, linearData, opts);

    expect(prompt).toContain("ENG-123");
    expect(prompt).toContain("Fix the login flow");
    expect(prompt).toContain("In Progress");
    expect(prompt).toContain("Engineering");
  });

  it("should include trigger comment", () => {
    const prompt = generateLinearPrompt(linearContext, linearData, opts);

    expect(prompt).toContain("<trigger_comment>");
    expect(prompt).toContain("please fix the Safari login issue");
  });

  it("should include Linear comment update tool info", () => {
    const prompt = generateLinearPrompt(linearContext, linearData, opts);

    expect(prompt).toContain("mcp__linear_comment__update_linear_comment");
  });

  it("should include PR creation link", () => {
    const prompt = generateLinearPrompt(linearContext, linearData, opts);

    expect(prompt).toContain("Create a PR");
    expect(prompt).toContain("compare/main...claude/linear-eng-123-1234567890");
  });

  it("should include job run link", () => {
    const prompt = generateLinearPrompt(linearContext, linearData, opts);

    expect(prompt).toContain("View job run");
    expect(prompt).toContain(opts.jobUrl);
  });

  it("should include comments from Linear issue", () => {
    const prompt = generateLinearPrompt(linearContext, linearData, opts);

    expect(prompt).toContain("Bob");
    expect(prompt).toContain("blocker for the release");
  });

  it("should include Linear metadata", () => {
    const prompt = generateLinearPrompt(linearContext, linearData, opts);

    expect(prompt).toContain("issue_identifier: ENG-123");
    expect(prompt).toContain("triggered_by: Alice");
    expect(prompt).toContain("team: ENG");
    expect(prompt).toContain("linear_comment_id: lc-uuid-1");
  });

  it("should include branch info in instructions", () => {
    const prompt = generateLinearPrompt(linearContext, linearData, opts);

    expect(prompt).toContain("claude/linear-eng-123-1234567890");
  });

  it("should handle missing trigger comment", () => {
    const contextWithoutComment = {
      ...linearContext,
      triggerCommentBody: undefined,
    };

    const prompt = generateLinearPrompt(
      contextWithoutComment,
      linearData,
      opts,
    );

    expect(prompt).not.toContain("<trigger_comment>");
    expect(prompt).toContain("issue body");
  });

  it("should reference Linear issue in PR body instructions", () => {
    const prompt = generateLinearPrompt(linearContext, linearData, opts);

    expect(prompt).toContain("ENG-123");
    expect(prompt).toContain("linear.app");
  });
});
