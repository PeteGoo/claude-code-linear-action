import type { GitHubContext, RepositoryDispatchEvent } from "../github/context";
import type { TrackerSource } from "./types";

/**
 * Detects the tracker source from the GitHub Actions context.
 * Returns "linear" for repository_dispatch events with action "linear-webhook",
 * otherwise returns "github".
 */
export function detectTrackerSource(context: GitHubContext): TrackerSource {
  if (
    context.eventName === "repository_dispatch" &&
    (context.payload as RepositoryDispatchEvent).action === "linear-webhook"
  ) {
    return "linear";
  }
  return "github";
}
