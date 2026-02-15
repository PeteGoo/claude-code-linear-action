import type { LinearIssue, LinearApiComment } from "../types";
import { sanitizeContent } from "../../github/utils/sanitizer";

/**
 * Formats Linear issue metadata as a concise context block.
 */
export function formatLinearContext(issue: LinearIssue): string {
  const labels =
    issue.labels?.nodes?.map((l) => l.name).join(", ") || "No labels";

  return `Issue: ${issue.identifier} — ${sanitizeContent(issue.title)}
State: ${issue.state.name} (${issue.state.type})
Priority: ${issue.priorityLabel}
Team: ${issue.team.name} (${issue.team.key})
Assignee: ${issue.assignee?.name || "Unassigned"}
Labels: ${labels}
URL: ${issue.url}`;
}

/**
 * Formats the issue description (body).
 */
export function formatLinearBody(issue: LinearIssue): string {
  if (!issue.description) {
    return "No description provided";
  }
  return sanitizeContent(issue.description);
}

/**
 * Formats Linear comments for the prompt.
 */
export function formatLinearComments(comments: LinearApiComment[]): string {
  if (!comments || comments.length === 0) {
    return "No comments";
  }

  return comments
    .map((comment) => {
      const body = sanitizeContent(comment.body);
      const authorName = comment.user?.name || "Unknown";
      return `[${authorName} at ${comment.createdAt}]: ${body}`;
    })
    .join("\n\n");
}
