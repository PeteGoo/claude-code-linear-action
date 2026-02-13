import type { RepositoryDispatchEvent } from "../github/context";
import type {
  LinearContext,
  LinearWebhookComment,
  LinearWebhookIssue,
  LinearWebhookPayload,
} from "./types";

/**
 * Parses a Linear context from a repository_dispatch client_payload.
 * The payload is the Linear webhook body relayed by the Cloudflare Worker.
 */
export function parseLinearContext(
  payload: RepositoryDispatchEvent,
): LinearContext {
  const clientPayload = payload.client_payload as
    | LinearWebhookPayload
    | undefined;

  if (!clientPayload) {
    throw new Error(
      "Missing client_payload in repository_dispatch event for Linear webhook",
    );
  }

  // Determine if this was triggered by a comment or an issue event
  if (clientPayload.type === "Comment") {
    const comment = clientPayload.data as LinearWebhookComment;
    // Linear puts the URL on the top-level payload, not inside data
    const commentUrl = comment.url || clientPayload.url || "";
    return {
      issueId: comment.issue.id,
      identifier: comment.issue.identifier,
      title: comment.issue.title,
      issueUrl: commentUrl.replace(/#.*$/, ""), // Remove comment anchor
      triggerCommentBody: comment.body,
      triggerCommentId: comment.id,
      actorName: comment.user.name,
      teamKey: comment.issue.identifier.split("-")[0] || "",
    };
  }

  // Issue event (create, update, etc.)
  const issue = clientPayload.data as LinearWebhookIssue;
  return {
    issueId: issue.id,
    identifier: issue.identifier,
    title: issue.title,
    description: issue.description,
    issueUrl: issue.url || clientPayload.url || "",
    actorName: payload.sender?.login || "unknown",
    teamKey: issue.team.key,
  };
}
