export type TrackerSource = "github" | "linear";

/**
 * Shared result type returned by both prepareTagMode and prepareLinearTagMode.
 * run.ts uses this shape to orchestrate execution and cleanup.
 */
export type PrepareResult = {
  commentId: number | undefined;
  branchInfo: {
    claudeBranch?: string;
    baseBranch: string;
    currentBranch: string;
  };
  claudeArgs: string;
  /** Linear-specific cleanup context, present when tracker is "linear" */
  linearCleanup?: {
    apiKey: string;
    issueId: string;
    commentId: string; // Linear comment ID (string UUID)
  };
};
