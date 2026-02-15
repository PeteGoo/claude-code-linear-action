# Claude Code Linear Action

A fork of [anthropics/claude-code-action](https://github.com/anthropics/claude-code-action) that adds [Linear](https://linear.app) as a full issue tracker integration. Claude can respond to Linear issue comments, implement code changes, and post progress updates back to Linear — all through GitHub Actions.

## How It Works

1. A comment or update is made on a Linear issue
2. A Linear webhook sends the event to a Cloudflare Worker
3. The Cloudflare Worker triggers a GitHub Actions workflow via `workflow_dispatch`
4. Claude Code runs in the action, reads the Linear context, does the work, and posts results back to Linear

## Features

- **Linear Issue Tracking**: Claude responds to Linear issue comments and implements requested changes
- **Bidirectional Updates**: Progress and results are posted back to Linear as comments
- **Code Implementation**: Claude can implement fixes, refactoring, and new features from Linear issues
- **Code Review**: Analyzes PR changes and suggests improvements
- **Progress Tracking**: Visual progress indicators that update as Claude works
- **Runs on Your Infrastructure**: Executes entirely on your GitHub runner with your chosen AI provider (Anthropic API, AWS Bedrock, Google Vertex AI, Microsoft Foundry)

## Setup

For detailed setup instructions covering Linear webhooks, the Cloudflare Worker, and the GitHub Actions workflow, see the [Linear Integration Guide](./docs/linear-integration.md).

## Upstream Documentation

This fork builds on top of `claude-code-action`. For general documentation on configuration, permissions, cloud providers, and capabilities, see the [upstream repository](https://github.com/anthropics/claude-code-action).

Key upstream docs:

- [Setup Guide](https://github.com/anthropics/claude-code-action/blob/main/docs/setup.md) — Manual setup, custom GitHub apps, and security best practices
- [Configuration](https://github.com/anthropics/claude-code-action/blob/main/docs/configuration.md) — MCP servers, permissions, environment variables
- [Cloud Providers](https://github.com/anthropics/claude-code-action/blob/main/docs/cloud-providers.md) — AWS Bedrock, Google Vertex AI, Microsoft Foundry
- [Security](https://github.com/anthropics/claude-code-action/blob/main/docs/security.md) — Access control, permissions, commit signing

## Maintaining This Fork

This fork tracks upstream via the `upstream-main` branch. See [docs/upstream-sync.md](./docs/upstream-sync.md) for instructions on pulling in upstream changes.

## License

This project is licensed under the MIT License — see the LICENSE file for details.
