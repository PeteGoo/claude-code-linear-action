/**
 * Types for Linear webhook payloads and API responses.
 *
 * The webhook is relayed via a Cloudflare Worker as a repository_dispatch
 * with event_type "linear-webhook" and client_payload containing the
 * Linear webhook data.
 */

// --- Webhook payload types (from client_payload) ---

export type LinearWebhookPayload = {
  action: "create" | "update" | "remove";
  type: "Issue" | "Comment" | "IssueLabel";
  data: LinearWebhookIssue | LinearWebhookComment;
  /** URL pointing back to the Linear entity */
  url?: string;
  /** Actor who triggered the webhook */
  createdAt: string;
};

export type LinearWebhookIssue = {
  id: string;
  identifier: string; // e.g. "ENG-123"
  title: string;
  description?: string;
  state: { name: string; type: string };
  priority: number;
  team: { key: string; name: string };
  assignee?: { name: string; email: string };
  labels: Array<{ name: string }>;
  url: string;
};

export type LinearWebhookComment = {
  id: string;
  body: string;
  issueId: string;
  issue: {
    id: string;
    identifier: string;
    title: string;
  };
  user: {
    id: string;
    name: string;
    email: string;
  };
  createdAt: string;
  url: string;
};

// --- API response types ---

export type LinearIssue = {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  url: string;
  state: {
    name: string;
    type: string;
  };
  priority: number;
  priorityLabel: string;
  team: {
    key: string;
    name: string;
  };
  assignee?: {
    name: string;
    email: string;
  };
  labels: {
    nodes: Array<{ name: string }>;
  };
  comments: {
    nodes: LinearApiComment[];
  };
};

export type LinearApiComment = {
  id: string;
  body: string;
  createdAt: string;
  user: {
    name: string;
    email: string;
  };
};

export type LinearUser = {
  id: string;
  name: string;
  email: string;
};

// --- Parsed context type ---

export type LinearContext = {
  issueId: string;
  identifier: string; // e.g. "ENG-123"
  title: string;
  description?: string;
  issueUrl: string;
  triggerCommentBody?: string;
  triggerCommentId?: string;
  actorName: string;
  teamKey: string;
};
