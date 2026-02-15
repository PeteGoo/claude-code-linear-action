/**
 * GraphQL queries and mutations for the Linear API.
 */

export const ISSUE_WITH_COMMENTS_QUERY = `
  query IssueWithComments($issueId: String!) {
    issue(id: $issueId) {
      id
      identifier
      title
      description
      url
      state {
        name
        type
      }
      priority
      priorityLabel
      team {
        key
        name
      }
      assignee {
        name
        email
      }
      labels {
        nodes {
          name
        }
      }
      comments {
        nodes {
          id
          body
          createdAt
          user {
            name
            email
          }
        }
      }
    }
  }
`;

export const CREATE_COMMENT_MUTATION = `
  mutation CreateComment($issueId: String!, $body: String!) {
    commentCreate(input: { issueId: $issueId, body: $body }) {
      success
      comment {
        id
        body
        createdAt
      }
    }
  }
`;

export const UPDATE_COMMENT_MUTATION = `
  mutation UpdateComment($commentId: String!, $body: String!) {
    commentUpdate(id: $commentId, input: { body: $body }) {
      success
      comment {
        id
        body
      }
    }
  }
`;
