import { useEffect, useState } from "react";

const api = import.meta.env.VITE_API_URL || "http://localhost:5111/api";

async function request(path, { token, body, signal } = {}) {
  const response = await fetch(api + path, {
    method: body === undefined ? "GET" : "POST",
    headers: {
      ...(token && { Authorization: `Bearer ${token}` }),
      ...(body !== undefined && { "Content-Type": "application/json" }),
    },
    body: JSON.stringify(body),
    signal,
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.message || "Request failed.");
  }
  return response.json();
}

export default function WorkspaceApp() {
  const [session, setSession] = useState(null);
  const [challenge, setChallenge] = useState(null);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const token = session?.token;

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    request("/outlets", { token, signal: controller.signal })
      .then(outlets => setResult({ token, outlets }))
      .catch(err => {
        if (!controller.signal.aborted) setResult({ token, error: err.message });
      });
    return () => controller.abort();
  }, [token]);

  async function submit(event) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setError("");
    try {
      const next = challenge
        ? await request("/auth/verify-otp", { body: { challenge, otp: data.otp } })
        : await request("/auth/login", { body: data });
      if (next.requires2FA) setChallenge(next.challenge);
      else {
        setSession(next);
        setChallenge(null);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function switchWorkspace(event) {
    const workspace = event.target.value;
    setBusy(true);
    setError("");
    try {
      setSession(await request("/auth/switch-workspace", { token, body: { workspace } }));
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }

  const active = result?.token === token ? result : null;
  if (!session) {
    return (
      <main className="mx-auto mt-24 w-full max-w-sm px-5">
        <h1 className="mb-6 text-2xl font-semibold">Salon workspace</h1>
        <form onSubmit={submit} className="grid gap-4">
          {challenge ? (
            <label className="grid gap-1">Authenticator code
              <input className="rounded border p-2" name="otp" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" required />
            </label>
          ) : (
            <>
              <label className="grid gap-1">Email
                <input className="rounded border p-2" name="email" type="email" autoComplete="username" required />
              </label>
              <label className="grid gap-1">Password
                <input className="rounded border p-2" name="password" type="password" autoComplete="current-password" required />
              </label>
            </>
          )}
          {error && <p role="alert" className="text-red-700">{error}</p>}
          <button className="rounded bg-slate-900 p-2 text-white" disabled={busy}>
            {challenge ? "Verify code" : "Sign in"}
          </button>
          {challenge && <button type="button" disabled={busy} onClick={() => { setChallenge(null); setError(""); }}>Back to sign in</button>}
        </form>
      </main>
    );
  }
  return (
    <main className="mx-auto max-w-3xl p-6">
      <header className="mb-8 flex flex-wrap items-center justify-between gap-4 border-b pb-4">
        <label className="grid gap-1">Workspace
          <select className="rounded border p-2" value={session.workspace.slug} onChange={switchWorkspace} disabled={busy}>
            {session.workspaces.map(workspace => <option key={workspace.id} value={workspace.slug}>{workspace.name}</option>)}
          </select>
        </label>
        <button className="rounded border px-3 py-2" disabled={busy} onClick={() => {
          setSession(null);
          setResult(null);
          setError("");
        }}>Sign out</button>
      </header>
      <h1 className="mb-4 text-2xl font-semibold">Outlets</h1>
      {(error || active?.error) && <p role="alert" className="text-red-700">{error || active.error}</p>}
      {!active && <p role="status">Loading outlets…</p>}
      {active?.outlets?.length === 0 && <p>No outlets are assigned.</p>}
      <ul className="divide-y rounded border">
        {active?.outlets?.map(outlet => (
          <li className="p-3" key={outlet.id}>
            <span className="font-medium">{outlet.name}</span>
            <span className="ml-2 text-slate-600">{outlet.city}</span>
          </li>
        ))}
      </ul>
    </main>
  );
}
