# Linear Integration

Use Claude Code Action with [Linear](https://linear.app) as your issue tracker. When someone mentions a trigger phrase on a Linear issue or comment, Claude picks up the work, implements changes in your GitHub repository, and posts progress updates back to the Linear issue.

## How It Works

The integration uses a three-part relay chain:

```
Linear webhook → Cloudflare Worker relay → GitHub repository_dispatch → Action runs
```

1. A user writes a comment on a Linear issue (e.g. `@claude fix the login bug`)
2. Linear fires a webhook to your Cloudflare Worker relay
3. The relay verifies the webhook signature, checks for the trigger phrase, and sends a `repository_dispatch` event to your GitHub repo
4. The action detects the Linear tracker source, fetches full issue data from the Linear API, creates a tracking comment on the Linear issue, and runs Claude
5. Claude implements the requested changes, commits to a new branch, and updates the Linear comment with progress and a PR link

## Prerequisites

- A [Linear](https://linear.app) workspace
- A GitHub repository with the Claude Code Action installed ([setup guide](./setup.md))
- An Anthropic API key (or OAuth token / Bedrock / Vertex)
- A Linear API key (for reading issues and posting comments)
- A Cloudflare Worker (or similar relay) to bridge Linear webhooks to GitHub

## Setup

### Step 1: Create a Linear API Key

1. Go to **Linear Settings** > **API** > **Personal API keys** (or create a workspace-level key)
2. Create a new key with read/write access to issues and comments
3. Save the key — you'll add it to your GitHub secrets

### Step 2: Add Secrets to Your GitHub Repository

Go to your repository's **Settings** > **Secrets and variables** > **Actions** and add:

| Secret                  | Description                                                         |
| ----------------------- | ------------------------------------------------------------------- |
| `LINEAR_API_KEY`        | Your Linear API key                                                 |
| `LINEAR_WEBHOOK_SECRET` | A shared secret you generate (used by the relay to verify webhooks) |
| `ANTHROPIC_API_KEY`     | Your Anthropic API key (if not already configured)                  |

### Step 3: Deploy the Webhook Relay

The relay is a lightweight Cloudflare Worker (or any HTTP endpoint) that receives Linear webhooks and forwards them as GitHub `repository_dispatch` events. You need to deploy this yourself — it is not part of this repository.

Here is a minimal example:

```javascript
// Cloudflare Worker: Linear webhook → GitHub repository_dispatch relay
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    console.log(`Received ${request.method} request to ${url.pathname}`);

    if (request.method !== "POST") {
      console.log("Rejecting non-POST request");
      return new Response("Method not allowed", { status: 405 });
    }

    const body = await request.text();
    const payload = JSON.parse(body);
    console.log(
      `Webhook payload: type=${payload.type}, action=${payload.action}, ` +
        `organizationId=${payload.organizationId}`,
    );

    // Verify the webhook signature (Linear signs with hex-encoded HMAC-SHA256)
    const signature = request.headers.get("linear-signature");
    if (!signature) {
      console.error("Missing linear-signature header");
      return new Response("Missing signature", { status: 401 });
    }
    console.log(`Signature header present (length=${signature.length})`);

    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      "raw",
      encoder.encode(env.LINEAR_WEBHOOK_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["verify"],
    );
    const signatureBytes = new Uint8Array(
      signature.match(/.{1,2}/g).map((byte) => parseInt(byte, 16)),
    );
    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      signatureBytes,
      encoder.encode(body),
    );
    if (!valid) {
      console.error("Webhook signature verification failed");
      return new Response("Invalid signature", { status: 401 });
    }
    console.log("Webhook signature verified successfully");

    // Check for trigger phrase in the comment or issue body
    const triggerPhrase = env.TRIGGER_PHRASE || "@claude";
    const text =
      payload.type === "Comment"
        ? payload.data?.body || ""
        : payload.data?.description || "";

    console.log(
      `Checking for trigger phrase "${triggerPhrase}" in ${payload.type} ` +
        `(text length=${text.length})`,
    );
    if (!text.includes(triggerPhrase)) {
      console.log("No trigger phrase found, skipping");
      return new Response("No trigger phrase found", { status: 200 });
    }
    console.log("Trigger phrase found, dispatching to GitHub");

    // Forward to GitHub as a repository_dispatch event
    const dispatchUrl = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/dispatches`;
    console.log(`Sending repository_dispatch to ${dispatchUrl}`);

    const response = await fetch(dispatchUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.GITHUB_TOKEN}`,
        Accept: "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "linear-webhook-relay",
      },
      body: JSON.stringify({
        event_type: "linear-webhook",
        client_payload: payload,
      }),
    });

    if (!response.ok) {
      const responseBody = await response.text();
      console.error(
        `GitHub dispatch failed: status=${response.status}, body=${responseBody}`,
      );
      return new Response(`GitHub dispatch failed: ${response.status}`, {
        status: 502,
      });
    }

    console.log("GitHub dispatch successful");
    return new Response("OK", { status: 200 });
  },
};
```

**Worker environment variables** (set in your Cloudflare dashboard or `wrangler.toml`):

| Variable                | Description                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------- |
| `LINEAR_WEBHOOK_SECRET` | Same shared secret you added to GitHub                                                  |
| `GITHUB_OWNER`          | GitHub repository owner (e.g. `my-org`)                                                 |
| `GITHUB_REPO`           | GitHub repository name (e.g. `my-app`)                                                  |
| `GITHUB_TOKEN`          | A GitHub personal access token (needed to send `repository_dispatch`). Classic tokens need the `repo` scope. Fine-grained tokens need **Contents: Read and write** permission on the target repository. |
| `TRIGGER_PHRASE`        | The phrase that triggers Claude (default: `@claude`)                                    |

### Step 4: Configure the Linear Webhook

1. Go to **Linear Settings** > **API** > **Webhooks**
2. Create a new webhook:
   - **URL**: Your Cloudflare Worker URL (e.g. `https://linear-relay.your-domain.workers.dev`)
   - **Secret**: The same `LINEAR_WEBHOOK_SECRET` you used above
   - **Events**: Select **Issues** and **Issue comments**
3. Save the webhook

### Step 5: Add the GitHub Actions Workflow

Create `.github/workflows/linear-claude.yml` in your repository:

```yaml
name: Claude (Linear)

on:
  repository_dispatch:
    types: [linear-webhook]

jobs:
  claude:
    runs-on: ubuntu-latest
    permissions:
      contents: write
      pull-requests: write
      issues: write
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 1

      - uses: anthropics/claude-code-action@v1
        with:
          github_token: ${{ secrets.GITHUB_TOKEN }}
          anthropic_api_key: ${{ secrets.ANTHROPIC_API_KEY }}
          linear_api_key: ${{ secrets.LINEAR_API_KEY }}
          linear_webhook_secret: ${{ secrets.LINEAR_WEBHOOK_SECRET }}
```

That's it. When someone writes `@claude` on a Linear issue, Claude will start working.

## Configuration

The Linear integration accepts the same configuration options as the standard action, plus two additional inputs:

| Input                   | Required         | Description                                                          |
| ----------------------- | ---------------- | -------------------------------------------------------------------- |
| `linear_api_key`        | Yes (for Linear) | Linear API key for reading issues and posting comments               |
| `linear_webhook_secret` | No               | Shared secret for verifying relayed webhooks                         |
| `anthropic_api_key`     | Yes              | Anthropic API key (same as standard setup)                           |
| `base_branch`           | No               | Base branch for new branches (defaults to repository default)        |
| `branch_prefix`         | No               | Prefix for created branches (default: `claude/`)                     |
| `trigger_phrase`        | No               | Trigger phrase (default: `@claude`) — configured in the relay worker |

### Branch Naming

When triggered by a Linear issue, branches are created with the format:

```
claude/linear-eng-123-1704067200000
```

Where `eng-123` is the lowercased Linear issue identifier and the number is a timestamp.

## What Claude Does

When triggered from a Linear issue, Claude:

1. **Creates a tracking comment** on the Linear issue showing it is working
2. **Fetches full issue data** from the Linear API (title, description, all comments, labels, state, priority)
3. **Creates a new branch** from the base branch
4. **Implements the requested changes** using the repository's code
5. **Updates the Linear comment** with a checklist of progress
6. **Pushes commits** to the branch
7. **Posts a PR creation link** in the final Linear comment
8. **Writes a GitHub Actions step summary** with the full execution output

### Communication

Claude communicates exclusively through the Linear comment. It uses an MCP tool (`mcp__linear_comment__update_linear_comment`) to update a single tracking comment on the Linear issue with:

- A task checklist (- [ ] / - [x])
- Progress updates as work proceeds
- A PR creation link when done
- A link to the GitHub Actions job run

## Architecture

### Tracker Detection

When a `repository_dispatch` event arrives with action `"linear-webhook"`, the action detects that the tracker source is Linear (via `detectTrackerSource()` in `src/tracker/detect.ts`). This routes the request through the Linear-specific preparation path instead of the standard GitHub tag/agent mode.

### Module Structure

```
src/
├── tracker/
│   ├── types.ts          # TrackerSource type, shared PrepareResult
│   └── detect.ts         # detectTrackerSource()
├── linear/
│   ├── types.ts          # Webhook payload types, API response types, LinearContext
│   ├── api/
│   │   ├── client.ts     # linearGraphQL() — fetch-based GraphQL client
│   │   └── queries.ts    # Issue query, comment create/update mutations
│   ├── context.ts        # parseLinearContext() — extracts data from client_payload
│   ├── data/
│   │   ├── fetcher.ts    # fetchLinearData() — full issue + comments from API
│   │   └── formatter.ts  # Formats issue context, body, comments for the prompt
│   └── operations/
│       └── comments.ts   # Create/update/finalize tracking comments
├── modes/
│   └── linear-tag/
│       └── index.ts      # prepareLinearTagMode() — full lifecycle
└── mcp/
    └── linear-comment-server.ts  # MCP server exposing update_linear_comment tool
```

### No New Dependencies

The Linear API client uses plain `fetch` (built into Bun) with GraphQL query strings. No additional npm packages are required.

### Isolation from GitHub Paths

The existing GitHub issue/PR code paths are completely unaffected. The Linear integration:

- Does not modify `src/github/`, `src/modes/tag/`, `src/modes/agent/`, or `base-action/`
- Uses its own prepare function (`prepareLinearTagMode`) and cleanup path (`finalizeLinearComment`)
- Sets `commentId: undefined` so the GitHub comment update logic is safely skipped

## Limitations

- **No PR review support**: Linear does not have pull requests, so PR review features are not available through the Linear trigger. Claude creates PRs on GitHub and links back to the Linear issue.
- **Webhook relay required**: Linear cannot send `repository_dispatch` events directly to GitHub. You must deploy and maintain the relay worker.
- **Single repository**: Each webhook relay targets a single GitHub repository. For multi-repo setups, configure the relay to route based on the Linear team or project.
- **No image support**: Unlike the GitHub integration, images in Linear comments are not downloaded and embedded in the prompt.

## Troubleshooting

### Claude does not respond to Linear comments

1. **Check the webhook**: Go to Linear Settings > API > Webhooks and verify the webhook is active. Check the recent deliveries for errors.
2. **Check the relay worker logs**: Verify the worker is receiving webhooks, the signature is valid, and the trigger phrase is being matched.
3. **Check GitHub Actions**: Go to your repository's Actions tab and look for `repository_dispatch` events. If you see runs, check the logs for errors.
4. **Verify the API key**: Make sure `LINEAR_API_KEY` is set correctly in your GitHub repository secrets and has permission to read/write issues and comments.

### "LINEAR_API_KEY required" error

The `LINEAR_API_KEY` secret is not set or is empty. Add it to your repository's Actions secrets.

### Webhook signature verification fails

Make sure the `LINEAR_WEBHOOK_SECRET` used in your relay worker matches the secret configured in the Linear webhook settings. Both must be identical.

### Claude creates a branch but doesn't push

Check that the GitHub token has `contents: write` permission in your workflow. The default `GITHUB_TOKEN` should have this if configured in the `permissions` block.
