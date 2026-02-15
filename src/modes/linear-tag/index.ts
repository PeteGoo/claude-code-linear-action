import { execFileSync } from "child_process";
import type {
  GitHubContext,
  RepositoryDispatchEvent,
} from "../../github/context";
import type { Octokits } from "../../github/api/client";
import type { PrepareResult } from "../../tracker/types";
import { parseLinearContext } from "../../linear/context";
import { fetchLinearData } from "../../linear/data/fetcher";
import { createLinearTrackingComment } from "../../linear/operations/comments";
import { createLinearPrompt } from "../../create-prompt";
import {
  configureGitAuth,
  setupSshSigning,
} from "../../github/operations/git-config";
import { validateBranchName } from "../../github/operations/branch";
import { prepareMcpConfig } from "../../mcp/install-mcp-server";
import { parseAllowedTools } from "../agent/parse-tools";
import { GITHUB_SERVER_URL } from "../../github/api/config";

/**
 * Prepares the Linear tag mode execution context.
 *
 * Triggered when a repository_dispatch with action "linear-webhook" arrives.
 * Creates a tracking comment on Linear, fetches full issue data, sets up a branch,
 * and generates the prompt for Claude.
 */
export async function prepareLinearTagMode({
  context,
  octokit: _octokit,
  githubToken,
}: {
  context: GitHubContext;
  octokit: Octokits;
  githubToken: string;
}): Promise<PrepareResult> {
  const linearApiKey = process.env.LINEAR_API_KEY;
  if (!linearApiKey) {
    throw new Error(
      "LINEAR_API_KEY environment variable is required for Linear integration",
    );
  }

  // 1. Parse Linear context from repository_dispatch client_payload
  const linearContext = parseLinearContext(
    context.payload as RepositoryDispatchEvent,
  );
  console.log(
    `Linear issue: ${linearContext.identifier} — ${linearContext.title}`,
  );

  // 2. Create tracking comment on Linear issue
  const { owner, repo } = context.repository;
  const jobUrl = `${GITHUB_SERVER_URL}/${owner}/${repo}/actions/runs/${process.env.GITHUB_RUN_ID}`;

  const linearCommentId = await createLinearTrackingComment(
    linearApiKey,
    linearContext.issueId,
    jobUrl,
  );
  console.log(`Created Linear tracking comment: ${linearCommentId}`);

  // 3. Fetch full Linear issue data via API
  const linearData = await fetchLinearData(linearApiKey, linearContext.issueId);
  console.log(
    `Fetched Linear issue data: ${linearData.comments.length} comments`,
  );

  // 4. Setup branch
  const baseBranch =
    context.inputs.baseBranch || process.env.GITHUB_REF_NAME || "main";
  const timestamp = Date.now();
  const sanitizedIdentifier = linearContext.identifier
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-");
  const claudeBranch = `${context.inputs.branchPrefix}linear-${sanitizedIdentifier}-${timestamp}`;

  validateBranchName(claudeBranch);
  validateBranchName(baseBranch);

  // Fetch and checkout the source branch, then create the new branch
  execFileSync("git", ["fetch", "origin", baseBranch, "--depth=1"], {
    stdio: "inherit",
  });
  execFileSync("git", ["checkout", baseBranch, "--"], { stdio: "inherit" });
  execFileSync("git", ["checkout", "-b", claudeBranch], { stdio: "inherit" });
  console.log(`Created branch ${claudeBranch} from ${baseBranch}`);

  // 5. Configure git auth
  const useSshSigning = !!context.inputs.sshSigningKey;

  if (useSshSigning) {
    await setupSshSigning(context.inputs.sshSigningKey);
  }

  if (!context.inputs.useCommitSigning || useSshSigning) {
    const user = {
      login: context.inputs.botName,
      id: parseInt(context.inputs.botId),
    };
    try {
      await configureGitAuth(githubToken, context, user);
    } catch (error) {
      console.error("Failed to configure git authentication:", error);
      throw error;
    }
  }

  // 6. Build prompt
  await createLinearPrompt(linearContext, linearData, {
    repository: `${owner}/${repo}`,
    claudeBranch,
    baseBranch,
    linearCommentId,
    jobUrl,
  });

  // 7. Build claude args with MCP config
  const userClaudeArgs = process.env.CLAUDE_ARGS || "";
  const userAllowedMCPTools = parseAllowedTools(userClaudeArgs).filter((tool) =>
    tool.startsWith("mcp__"),
  );

  const tagModeTools = [
    "Edit",
    "MultiEdit",
    "Glob",
    "Grep",
    "LS",
    "Read",
    "Write",
    "mcp__linear_comment__update_linear_comment",
    "Bash(git add *)",
    "Bash(git commit *)",
    "Bash(git push *)",
    "Bash(git status *)",
    "Bash(git diff *)",
    "Bash(git log *)",
    "Bash(git rm *)",
    ...userAllowedMCPTools,
  ];

  // Get MCP config (includes github comment server etc. if needed)
  const ourMcpConfig = await prepareMcpConfig({
    githubToken,
    owner,
    repo,
    branch: claudeBranch,
    baseBranch,
    allowedTools: Array.from(new Set(tagModeTools)),
    mode: "tag",
    context,
    linearConfig: {
      apiKey: linearApiKey,
      issueId: linearContext.issueId,
      commentId: linearCommentId,
    },
  });

  let claudeArgs = "";
  const escapedOurConfig = ourMcpConfig.replace(/'/g, "'\\''");
  claudeArgs = `--mcp-config '${escapedOurConfig}'`;
  claudeArgs += ` --allowedTools "${tagModeTools.join(",")}"`;

  if (userClaudeArgs) {
    claudeArgs += ` ${userClaudeArgs}`;
  }

  return {
    commentId: undefined, // No GitHub comment for Linear-triggered runs
    branchInfo: {
      claudeBranch,
      baseBranch,
      currentBranch: claudeBranch,
    },
    claudeArgs: claudeArgs.trim(),
    linearCleanup: {
      apiKey: linearApiKey,
      issueId: linearContext.issueId,
      commentId: linearCommentId,
    },
  };
}
