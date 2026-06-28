export const GITHUB_REPO_OWNER =
  process.env.NEXT_PUBLIC_REPO_OWNER || "hugodemenez"; // pragma: allowlist secret

export const GITHUB_REPO_NAME =
  process.env.NEXT_PUBLIC_REPO_NAME || "deltalytix";

export const GITHUB_REPO_URL = `https://github.com/${GITHUB_REPO_OWNER}/${GITHUB_REPO_NAME}`;
