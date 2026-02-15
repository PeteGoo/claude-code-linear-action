import { describe, expect, it } from "bun:test";
import { detectTrackerSource } from "../../src/tracker/detect";
import type { GitHubContext } from "../../src/github/context";

describe("detectTrackerSource", () => {
  const baseContext = {
    runId: "test-run",
    repository: {
      owner: "test-owner",
      repo: "test-repo",
      full_name: "test-owner/test-repo",
    },
    actor: "test-user",
    inputs: {
      prompt: "",
      triggerPhrase: "@claude",
      assigneeTrigger: "",
      labelTrigger: "",
      branchPrefix: "claude/",
      useStickyComment: false,
      useCommitSigning: false,
      sshSigningKey: "",
      botId: "123456",
      botName: "claude-bot",
      allowedBots: "",
      allowedNonWriteUsers: "",
      trackProgress: false,
      includeFixLinks: true,
      includeCommentsByActor: "",
      excludeCommentsByActor: "",
    },
  };

  it('should return "linear" for repository_dispatch with action "linear-webhook"', () => {
    const context: GitHubContext = {
      ...baseContext,
      eventName: "repository_dispatch",
      payload: {
        action: "linear-webhook",
        client_payload: { type: "Comment", data: {} },
        repository: { name: "test-repo", owner: { login: "test-owner" } },
        sender: { login: "test-user" },
      },
    };

    expect(detectTrackerSource(context)).toBe("linear");
  });

  it('should return "github" for repository_dispatch with a different action', () => {
    const context: GitHubContext = {
      ...baseContext,
      eventName: "repository_dispatch",
      payload: {
        action: "deploy",
        repository: { name: "test-repo", owner: { login: "test-owner" } },
        sender: { login: "test-user" },
      },
    };

    expect(detectTrackerSource(context)).toBe("github");
  });

  it('should return "github" for non-repository_dispatch events', () => {
    const context: GitHubContext = {
      ...baseContext,
      eventName: "issues",
      eventAction: "opened",
      payload: { issue: { number: 1, body: "Test" } } as any,
      entityNumber: 1,
      isPR: false,
    };

    expect(detectTrackerSource(context)).toBe("github");
  });

  it('should return "github" for workflow_dispatch', () => {
    const context: GitHubContext = {
      ...baseContext,
      eventName: "workflow_dispatch",
      payload: {} as any,
    };

    expect(detectTrackerSource(context)).toBe("github");
  });
});
