import fetch from 'node-fetch';

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const ASANA_PAT = process.env.ASANA_PAT;
const ASANA_TAG_NAME = process.env.ASANA_TAG_NAME || "Label PRs";
const LABEL_TO_ADD = process.env.LABEL_TO_ADD || "From Asana";
const REPO = process.env.GITHUB_REPOSITORY;

const headers = {
  "Authorization": `Bearer ${ASANA_PAT}`
};

async function getTagIdByName(name) {
  const res = await fetch('https://app.asana.com/api/1.0/tags', { headers });
  const data = await res.json();
  const tag = data.data.find(tag => tag.name === name);
  return tag ? tag.gid : null;
}

async function getTasksByTagId(tagId) {
  const res = await fetch(`https://app.asana.com/api/1.0/tags/${tagId}/tasks`, { headers });
  const data = await res.json();
  return data.data;
}

async function labelMatchingPRs(tasks) {
  for (const task of tasks) {
    const taskId = task.gid;
    const searchTerm = `asana#${taskId}`;

    const searchRes = await fetch(`https://api.github.com/search/issues?q=repo:${REPO}+${encodeURIComponent(searchTerm)}+type:pr+state:open`, {
      headers: {
        Authorization: `Bearer ${GITHUB_TOKEN}`,
        Accept: "application/vnd.github.v3+json"
      }
    });
    const results = await searchRes.json();
    for (const pr of results.items || []) {
      await fetch(pr.url + '/labels', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${GITHUB_TOKEN}`,
          Accept: "application/vnd.github.v3+json"
        },
        body: JSON.stringify({ labels: [LABEL_TO_ADD] })
      });
      console.log(`✅ Labeled PR #${pr.number} with '${LABEL_TO_ADD}'`);
    }
  }
}

(async () => {
  const tagId = await getTagIdByName(ASANA_TAG_NAME);
  if (!tagId) {
    console.error(`❌ Could not find tag "${ASANA_TAG_NAME}"`);
    return;
  }

  const tasks = await getTasksByTagId(tagId);
  if (tasks.length === 0) {
    console.log("ℹ️ No tasks with the label found");
    return;
  }

  await labelMatchingPRs(tasks);
})();
