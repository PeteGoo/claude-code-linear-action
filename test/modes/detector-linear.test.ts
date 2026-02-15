import { describe, expect, it } from "bun:test";
import { detectMode } from "../../src/modes/detector";
import type { GitHubContext } from "../../src/github/context";

describe("detectMode with Linear tracker source", () => {
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

  it("should return tag mode for Linear tracker source without prompt", () => {
    const context: GitHubContext = {
      ...baseContext,
      eventName: "repository_dispatch",
      payload: {
        action: "linear-webhook",
        client_payload: {},
        repository: { name: "test-repo", owner: { login: "test-owner" } },
        sender: { login: "test-user" },
      },
    };

    expect(detectMode(context, "linear")).toBe("tag");
  });

  it("should return agent mode for Linear tracker source with prompt", () => {
    const context: GitHubContext = {
      ...baseContext,
      eventName: "repository_dispatch",
      payload: {
        action: "linear-webhook",
        client_payload: {},
        repository: { name: "test-repo", owner: { login: "test-owner" } },
        sender: { login: "test-user" },
      },
      inputs: { ...baseContext.inputs, prompt: "Review the code" },
    };

    expect(detectMode(context, "linear")).toBe("agent");
  });

  it("should default to github tracker source if not specified", () => {
    const context: GitHubContext = {
      ...baseContext,
      eventName: "workflow_dispatch",
      payload: {} as any,
      inputs: { ...baseContext.inputs, prompt: "Run workflow" },
    };

    // Without specifying tracker source, should use default (github)
    expect(detectMode(context)).toBe("agent");
  });

  it("should not affect existing github behavior when tracker is github", () => {
    const context: GitHubContext = {
      ...baseContext,
      eventName: "issue_comment",
      payload: {
        issue: { number: 1, body: "Test" },
        comment: { body: "@claude help" },
      } as any,
      entityNumber: 1,
      isPR: false,
    };

    expect(detectMode(context, "github")).toBe("tag");
  });
});
