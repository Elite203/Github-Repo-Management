 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }const GITHUB_API = "https://api.github.com";































async function gh(token, path, init = {}) {
  const res = await fetch(`${GITHUB_API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      Authorization: `Bearer ${token}`,
      ...(init.body ? { "Content-Type": "application/json" } : {}),
      ...(init.headers || {}),
    },
  });
  if (!res.ok) {
    let msg = `GitHub API ${res.status}`;
    try {
      const body = await res.json();
      if (_optionalChain([body, 'optionalAccess', _ => _.message])) msg = body.message;
    } catch (e) {}
    throw new Error(msg);
  }
  if (res.status === 204) return undefined ;
  return res.json() ;
}

export async function fetchUser(token) {
  return gh(token, "/user");
}

export async function fetchAllRepos(token) {
  const all = [];
  for (let page = 1; page <= 10; page++) {
    const batch = await gh(
      token,
      `/user/repos?per_page=100&page=${page}&affiliation=owner&sort=updated`,
    );
    all.push(...batch);
    if (batch.length < 100) break;
  }
  return all;
}

export async function setRepoVisibility(token, fullName, makePrivate) {
  return gh(token, `/repos/${fullName}`, {
    method: "PATCH",
    body: JSON.stringify({ private: makePrivate }),
  });
}

/** Encodes a repo-content path correctly: each segment encoded, slashes preserved. */
function encodePath(p) {
  return p.split("/").map(encodeURIComponent).join("/");
}

/** Returns the blob SHA of an existing file, or null if it doesn't exist. */
export async function getFileSha(token, fullName, path) {
  try {
    const data = await gh(token, `/repos/${fullName}/contents/${encodePath(path)}`);
    return data?.sha ?? null;
  } catch {
    return null;
  }
}

/**
 * Creates or updates a single file in a repo via the Contents API.
 * @param {string} token  - GitHub token
 * @param {string} fullName - "owner/repo"
 * @param {string} path   - file path inside the repo (e.g. "src/index.js")
 * @param {string} base64Content - base64-encoded file contents
 * @param {string} message - commit message
 * @param {string|null} sha - existing file SHA (required for updates, null for creates)
 */
export async function uploadFile(token, fullName, path, base64Content, message, sha) {
  return gh(token, `/repos/${fullName}/contents/${encodePath(path)}`, {
    method: "PUT",
    body: JSON.stringify({
      message,
      content: base64Content,
      ...(sha ? { sha } : {}),
    }),
  });
}