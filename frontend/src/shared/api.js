let csrfPromise = null;

async function getCsrf() {
  if (!csrfPromise) {
    csrfPromise = fetch("/api/csrf", { credentials: "include" })
      .then((r) => r.json())
      .then((d) => d.token);
  }
  return csrfPromise;
}

export async function apiPost(url, body) {
  const t = await getCsrf();
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-csrf-token": t },
    credentials: "include",
    body: JSON.stringify(body || {}),
  });
  if (!r.ok) {
    let details = null;
    try {
      details = await r.json();
    } catch (_error) {

    }
    const message =
      typeof details?.message === "string" && details.message.length
        ? details.message
        : "Запрос не выполнен.";
    const err = new Error(message);
    err.status = r.status;
    err.details = details;
    if (details && typeof details.error === "string") {
      err.code = details.error;
    }
    throw err;
  }
  return r.json();
}

export async function apiPut(url, body) {
  const t = await getCsrf();
  const r = await fetch(url, {
    method: "PUT",
    headers: { "Content-Type": "application/json", "x-csrf-token": t },
    credentials: "include",
    body: JSON.stringify(body || {}),
  });
  if (!r.ok) {
    let details = null;
    try {
      details = await r.json();
    } catch (_error) {

    }
    const message =
      typeof details?.message === "string" && details.message.length
        ? details.message
        : "�-�����?�?�? �?�� �?�<���?�>�?��?.";
    const err = new Error(message);
    err.status = r.status;
    err.details = details;
    if (details && typeof details.error === "string") {
      err.code = details.error;
    }
    throw err;
  }
  if (r.status === 204) {
    return null;
  }
  return r.json();
}

export async function apiDelete(url) {
  const t = await getCsrf();
  const r = await fetch(url, {
    method: "DELETE",
    headers: { "x-csrf-token": t },
    credentials: "include",
  });
  if (!r.ok) {
    let details = null;
    try {
      details = await r.json();
    } catch (_error) {

    }
    const message =
      typeof details?.message === "string" && details.message.length
        ? details.message
        : "Запрос не выполнен.";
    const err = new Error(message);
    err.status = r.status;
    err.details = details;
    if (details && typeof details.error === "string") {
      err.code = details.error;
    }
    throw err;
  }
  if (r.status === 204) {
    return null;
  }
  return r.json();
}
