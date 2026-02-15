import { linearGraphQL } from "../api/client";
import { ISSUE_WITH_COMMENTS_QUERY } from "../api/queries";
import type { LinearIssue, LinearApiComment } from "../types";

export type LinearFetchResult = {
  issue: LinearIssue;
  comments: LinearApiComment[];
};

type IssueQueryResponse = {
  issue: LinearIssue;
};

/**
 * Fetches full issue data from the Linear API.
 * The webhook payload is often a summary; this returns the full issue
 * with all comments.
 */
export async function fetchLinearData(
  apiKey: string,
  issueId: string,
): Promise<LinearFetchResult> {
  const data = await linearGraphQL<IssueQueryResponse>(
    apiKey,
    ISSUE_WITH_COMMENTS_QUERY,
    { issueId },
  );

  if (!data.issue) {
    throw new Error(`Linear issue not found: ${issueId}`);
  }

  return {
    issue: data.issue,
    comments: data.issue.comments?.nodes || [],
  };
}
