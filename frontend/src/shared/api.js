let csrfPromise = null;

async function getCsrf() {
  if (!csrfPromise) {
    csrfPromise = fetch('/api/csrf', { credentials: 'include' })
      .then(r => r.json())
      .then(d => d.token);
  }
  return csrfPromise;
}

export async function apiPost(url, body) {
  const t = await getCsrf();
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-csrf-token': t },
    credentials: 'include',
    body: JSON.stringify(body || {})
  });
  if (!r.ok) throw new Error('Запрос не выполнен.');
  return r.json();
}
