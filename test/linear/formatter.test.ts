import { describe, expect, it } from "bun:test";
import {
  formatLinearContext,
  formatLinearBody,
  formatLinearComments,
} from "../../src/linear/data/formatter";
import type { LinearIssue, LinearApiComment } from "../../src/linear/types";

describe("formatLinearContext", () => {
  const baseIssue: LinearIssue = {
    id: "issue-1",
    identifier: "ENG-123",
    title: "Fix the login bug",
    description: "Login fails on Safari",
    url: "https://linear.app/eng/issue/ENG-123",
    state: { name: "In Progress", type: "started" },
    priority: 2,
    priorityLabel: "High",
    team: { key: "ENG", name: "Engineering" },
    assignee: { name: "Alice", email: "alice@example.com" },
    labels: { nodes: [{ name: "bug" }, { name: "urgent" }] },
    comments: { nodes: [] },
  };

  it("should format issue context with all fields", () => {
    const result = formatLinearContext(baseIssue);

    expect(result).toContain("ENG-123");
    expect(result).toContain("Fix the login bug");
    expect(result).toContain("In Progress (started)");
    expect(result).toContain("High");
    expect(result).toContain("Engineering (ENG)");
    expect(result).toContain("Alice");
    expect(result).toContain("bug, urgent");
    expect(result).toContain("https://linear.app/eng/issue/ENG-123");
  });

  it("should handle missing assignee", () => {
    const issue = { ...baseIssue, assignee: undefined };
    const result = formatLinearContext(issue);

    expect(result).toContain("Unassigned");
  });

  it("should handle no labels", () => {
    const issue = { ...baseIssue, labels: { nodes: [] } };
    const result = formatLinearContext(issue);

    expect(result).toContain("No labels");
  });
});

describe("formatLinearBody", () => {
  it("should format the issue description", () => {
    const issue: LinearIssue = {
      id: "issue-1",
      identifier: "ENG-1",
      title: "Test",
      description: "This is the **description** with markdown",
      url: "https://linear.app/eng/issue/ENG-1",
      state: { name: "Todo", type: "unstarted" },
      priority: 1,
      priorityLabel: "Urgent",
      team: { key: "ENG", name: "Engineering" },
      labels: { nodes: [] },
      comments: { nodes: [] },
    };

    const result = formatLinearBody(issue);
    expect(result).toContain("description");
    expect(result).toContain("markdown");
  });

  it("should return placeholder for missing description", () => {
    const issue: LinearIssue = {
      id: "issue-1",
      identifier: "ENG-1",
      title: "Test",
      url: "https://linear.app/eng/issue/ENG-1",
      state: { name: "Todo", type: "unstarted" },
      priority: 1,
      priorityLabel: "Urgent",
      team: { key: "ENG", name: "Engineering" },
      labels: { nodes: [] },
      comments: { nodes: [] },
    };

    const result = formatLinearBody(issue);
    expect(result).toBe("No description provided");
  });
});

describe("formatLinearComments", () => {
  it("should format multiple comments", () => {
    const comments: LinearApiComment[] = [
      {
        id: "c-1",
        body: "First comment here",
        createdAt: "2024-01-01T00:00:00.000Z",
        user: { name: "Alice", email: "alice@example.com" },
      },
      {
        id: "c-2",
        body: "Second comment here",
        createdAt: "2024-01-02T00:00:00.000Z",
        user: { name: "Bob", email: "bob@example.com" },
      },
    ];

    const result = formatLinearComments(comments);
    expect(result).toContain("Alice");
    expect(result).toContain("First comment here");
    expect(result).toContain("Bob");
    expect(result).toContain("Second comment here");
  });

  it("should return 'No comments' for empty array", () => {
    expect(formatLinearComments([])).toBe("No comments");
  });
});
