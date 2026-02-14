import { linearGraphQL } from "../api/client";
import {
  CREATE_COMMENT_MUTATION,
  UPDATE_COMMENT_MUTATION,
} from "../api/queries";

type CreateCommentResponse = {
  commentCreate: {
    success: boolean;
    comment: { id: string; body: string; createdAt: string };
  };
};

type UpdateCommentResponse = {
  commentUpdate: {
    success: boolean;
    comment: { id: string; body: string };
  };
};

/**
 * Creates an initial "Claude is working..." tracking comment on a Linear issue.
 * Returns the Linear comment ID (string UUID).
 */
export async function createLinearTrackingComment(
  apiKey: string,
  issueId: string,
  jobUrl: string,
): Promise<string> {
  const body = `**Claude is working…** :hourglass_flowing_sand:\n\n[View job run](${jobUrl})`;

  const data = await linearGraphQL<CreateCommentResponse>(
    apiKey,
    CREATE_COMMENT_MUTATION,
    { issueId, body },
  );

  if (!data.commentCreate.success) {
    throw new Error("Failed to create Linear tracking comment");
  }

  return data.commentCreate.comment.id;
}

/**
 * Updates an existing comment on a Linear issue.
 */
export async function updateLinearTrackingComment(
  apiKey: string,
  commentId: string,
  body: string,
): Promise<void> {
  const data = await linearGraphQL<UpdateCommentResponse>(
    apiKey,
    UPDATE_COMMENT_MUTATION,
    { commentId, body },
  );

  if (!data.commentUpdate.success) {
    throw new Error("Failed to update Linear tracking comment");
  }
}

/**
 * Finalizes the Linear tracking comment with completion status and links.
 */
export async function finalizeLinearComment(
  apiKey: string,
  commentId: string,
  opts: {
    success: boolean;
    claudeBranch?: string;
    repository: string;
    jobUrl: string;
    githubServerUrl: string;
  },
): Promise<void> {
  let body: string;

  if (opts.success) {
    const branchLink = opts.claudeBranch
      ? `\n\nBranch: [\`${opts.claudeBranch}\`](${opts.githubServerUrl}/${opts.repository}/tree/${opts.claudeBranch})`
      : "";
    const prLink = opts.claudeBranch
      ? `\n[Create a PR](${opts.githubServerUrl}/${opts.repository}/compare/main...${opts.claudeBranch}?quick_pull=1)`
      : "";
    body = `**Claude finished the task.**${branchLink}${prLink}\n\n[View job run](${opts.jobUrl})`;
  } else {
    body = `**Claude encountered an error.** Check the [job run](${opts.jobUrl}) for details.`;
  }

  await updateLinearTrackingComment(apiKey, commentId, body);
}
