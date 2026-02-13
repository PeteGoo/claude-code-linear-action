const LINEAR_API_URL = "https://api.linear.app/graphql";

export type LinearGraphQLResponse<T> = {
  data?: T;
  errors?: Array<{ message: string; extensions?: Record<string, unknown> }>;
};

/**
 * Makes an authenticated GraphQL request to the Linear API.
 * Uses plain fetch (built into Bun) — no additional dependencies needed.
 */
export async function linearGraphQL<T>(
  apiKey: string,
  query: string,
  variables?: Record<string, unknown>,
): Promise<T> {
  const response = await fetch(LINEAR_API_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: apiKey,
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    throw new Error(
      `Linear API request failed: ${response.status} ${response.statusText}`,
    );
  }

  const result = (await response.json()) as LinearGraphQLResponse<T>;

  if (result.errors && result.errors.length > 0) {
    const messages = result.errors.map((e) => e.message).join("; ");
    throw new Error(`Linear GraphQL errors: ${messages}`);
  }

  if (!result.data) {
    throw new Error("Linear API returned no data");
  }

  return result.data;
}
