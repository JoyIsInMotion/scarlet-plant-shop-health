import { NextRequest } from 'next/server';

// GET /api/docs — human-readable API reference rendered as a self-contained HTML
// page. Public (no auth) so the Expo app can load it in a WebView. This route is
// the single source of truth for the mobile API contract; the endpoint tables
// below are authoritative.

interface Endpoint {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  path: string;
  auth?: 'user' | 'admin';
  notes?: string;
}

interface Group {
  title: string;
  blurb?: string;
  endpoints: Endpoint[];
}

const GROUPS: Group[] = [
  {
    title: 'Auth',
    blurb: 'Public. Returns { user?, accessToken, refreshToken } in <code>data</code>.',
    endpoints: [
      { method: 'POST', path: '/auth/register', notes: 'Body: { name, email, password } → 201' },
      { method: 'POST', path: '/auth/login', notes: 'Body: { email, password }' },
      { method: 'POST', path: '/auth/refresh', notes: 'Body: { refreshToken }' },
      { method: 'POST', path: '/auth/logout', notes: 'Body: { refreshToken }' },
    ],
  },
  {
    title: 'Users',
    endpoints: [
      { method: 'GET', path: '/users/me', auth: 'user', notes: 'Current user profile' },
      { method: 'PUT', path: '/users/me', auth: 'user', notes: 'Update profile (name, preferredLocale, …)' },
      { method: 'POST', path: '/users/me/avatar', auth: 'user', notes: 'multipart/form-data, field "image"' },
      { method: 'GET', path: '/users', auth: 'admin', notes: 'List users' },
    ],
  },
  {
    title: 'Plants',
    blurb: "The signed-in user's own collection.",
    endpoints: [
      { method: 'GET', path: '/plants', auth: 'user', notes: 'Query: limit (≤100), cursor, offset' },
      { method: 'POST', path: '/plants', auth: 'user', notes: 'Body: { customName, speciesId?, lastWatered?, speciesConfirmed? }' },
      { method: 'GET', path: '/plants/:id', auth: 'user' },
      { method: 'PUT', path: '/plants/:id', auth: 'user' },
      { method: 'DELETE', path: '/plants/:id', auth: 'user' },
      { method: 'POST', path: '/plants/:id/image', auth: 'user', notes: 'multipart/form-data, field "image"' },
      { method: 'GET', path: '/plants/:id/care-logs', auth: 'user' },
      { method: 'POST', path: '/plants/:id/care-logs', auth: 'user' },
      { method: 'GET', path: '/plants/:id/schedule', auth: 'user' },
      { method: 'PATCH', path: '/plants/:id/schedule', auth: 'user' },
      { method: 'GET', path: '/plants/:id/analyses', auth: 'user', notes: 'Past AI analyses' },
      { method: 'POST', path: '/plants/:id/ai-analysis', auth: 'user', notes: 'Run AI health analysis on a saved plant' },
    ],
  },
  {
    title: 'AI',
    blurb: 'Rate-limited to 5 analyses per user per 24h (429 when exceeded).',
    endpoints: [
      { method: 'POST', path: '/ai/quick-scan', auth: 'user', notes: 'Ad-hoc photo analysis. multipart/form-data, field "image"' },
      { method: 'POST', path: '/ai/identify', auth: 'user', notes: 'Identify a species from input' },
    ],
  },
  {
    title: 'Species catalog',
    endpoints: [
      { method: 'GET', path: '/catalog', notes: 'Public. Query: limit, offset, search, difficulty, category, verified' },
      { method: 'GET', path: '/catalog/:id', notes: 'Public' },
      { method: 'POST', path: '/catalog', auth: 'admin' },
      { method: 'PUT', path: '/catalog/:id', auth: 'admin' },
    ],
  },
  {
    title: 'Shop products',
    endpoints: [
      { method: 'GET', path: '/products', notes: 'Public. Query: limit, offset, search, category, sort, order (asc/desc)' },
      { method: 'GET', path: '/products/:id', notes: 'Public' },
      { method: 'POST', path: '/products', auth: 'admin' },
      { method: 'PUT', path: '/products/:id', auth: 'admin' },
      { method: 'DELETE', path: '/products/:id', auth: 'admin' },
    ],
  },
  {
    title: 'Orders',
    endpoints: [
      { method: 'GET', path: '/orders', auth: 'user', notes: "Current user's orders" },
      { method: 'POST', path: '/orders', auth: 'user', notes: 'Body: { items: [{ productId, quantity }], shippingAddress?, notes? }' },
    ],
  },
  {
    title: 'Community',
    endpoints: [
      { method: 'GET', path: '/community/plants', notes: 'Public (auth optional — sets liked state). Query: page, limit, search, difficulty' },
      { method: 'POST', path: '/community/plants/:id/like', auth: 'user', notes: 'Toggle like' },
    ],
  },
  {
    title: 'Admin',
    endpoints: [
      { method: 'GET', path: '/admin/stats', auth: 'admin', notes: 'Dashboard stats' },
      { method: 'GET', path: '/admin/orders', auth: 'admin', notes: 'All orders' },
      { method: 'PATCH', path: '/admin/orders/:id', auth: 'admin', notes: 'Update order status' },
      { method: 'DELETE', path: '/admin/orders/:id', auth: 'admin', notes: 'Delete order' },
    ],
  },
];

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function authBadge(auth?: 'user' | 'admin'): string {
  if (auth === 'admin') return '<span class="badge admin">admin</span>';
  if (auth === 'user') return '<span class="badge auth">auth</span>';
  return '<span class="badge public">public</span>';
}

function renderGroup(group: Group): string {
  const rows = group.endpoints
    .map(
      (e) => `
        <tr>
          <td><span class="method ${e.method.toLowerCase()}">${e.method}</span></td>
          <td><code>${escapeHtml(e.path)}</code></td>
          <td>${authBadge(e.auth)}</td>
          <td>${e.notes ? escapeHtml(e.notes) : ''}</td>
        </tr>`
    )
    .join('');

  return `
    <section>
      <h2>${escapeHtml(group.title)}</h2>
      ${group.blurb ? `<p class="blurb">${group.blurb}</p>` : ''}
      <table>
        <thead>
          <tr><th>Method</th><th>Path</th><th>Access</th><th>Notes</th></tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </section>`;
}

function renderPage(apiBase: string): string {
  const groups = GROUPS.map(renderGroup).join('');

  // Backticks and ${...} inside code samples are escaped so they stay literal
  // within this template literal.
  const clientSketch = `async function request(path, init = {}) {
  const res = await fetch(\`\${API_URL}\${path}\`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: \`Bearer \${accessToken}\` } : {}),
      ...init.headers,
    },
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.error ?? \`HTTP \${res.status}\`);
  return json.data;
}`;

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Scarlet API</title>
  <style>
    :root { color-scheme: light dark; }
    * { box-sizing: border-box; }
    body {
      margin: 0; padding: 1.5rem 1rem 4rem;
      font: 15px/1.55 -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      max-width: 860px; margin-inline: auto;
      color: #1b1b1f; background: #fafafa;
    }
    h1 { font-size: 1.6rem; margin: 0 0 .25rem; }
    h2 { font-size: 1.15rem; margin: 2rem 0 .5rem; border-bottom: 1px solid #8884; padding-bottom: .25rem; }
    .lead { color: #6b6b70; margin-top: 0; }
    .blurb { color: #6b6b70; margin: .25rem 0 .6rem; font-size: .9rem; }
    code { font-family: ui-monospace, SFMono-Regular, Menlo, monospace; font-size: .88em; background: #ececef; padding: .1em .35em; border-radius: 4px; }
    pre { background: #ececef; padding: .9rem 1rem; border-radius: 8px; overflow-x: auto; }
    pre code { background: none; padding: 0; }
    table { width: 100%; border-collapse: collapse; font-size: .9rem; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 1px 2px #0001; }
    th, td { text-align: left; padding: .5rem .65rem; vertical-align: top; }
    th { background: #f0f0f3; font-weight: 600; font-size: .82rem; text-transform: uppercase; letter-spacing: .03em; }
    tr:nth-child(even) td { background: #f6f6f8; }
    .method { font-weight: 700; font-size: .78rem; font-family: ui-monospace, monospace; }
    .method.get { color: #1a7f37; }
    .method.post { color: #9a6700; }
    .method.put, .method.patch { color: #0969da; }
    .method.delete { color: #cf222e; }
    .badge { font-size: .72rem; padding: .1em .5em; border-radius: 999px; font-weight: 600; white-space: nowrap; }
    .badge.public { background: #dbe5ff; color: #0a3b8c; }
    .badge.auth { background: #fff1cc; color: #7a5300; }
    .badge.admin { background: #ffd9d6; color: #8c1f17; }
    .pill { display: inline-block; background: #2a2a30; color: #fff; padding: .15em .6em; border-radius: 6px; font-family: ui-monospace, monospace; font-size: .85rem; }
    /* Dark mode. Kept last so these rules win the cascade over the equal-specificity
       light-mode defaults above (media queries do not add specificity). */
    @media (prefers-color-scheme: dark) {
      body { color: #e6e6e6; background: #161618; }
      h2 { border-bottom-color: #ffffff22; }
      .lead, .blurb { color: #a1a1a8; }
      code, pre { background: #2a2a30; color: #e6e6e6; }
      table { background: #1f1f23; box-shadow: 0 1px 2px #0006; }
      th { background: #26262b; }
      tr:nth-child(even) td { background: #1c1c20; }
      .method.get { color: #3fb950; }
      .method.post { color: #d29922; }
      .method.put, .method.patch { color: #58a6ff; }
      .method.delete { color: #f85149; }
      .badge.public { background: #1f3a8a; color: #cdd9ff; }
      .badge.auth { background: #5a4300; color: #ffe9a8; }
      .badge.admin { background: #6e1b14; color: #ffd2cd; }
    }
  </style>
</head>
<body>
  <h1>Scarlet REST API</h1>
  <p class="lead">RESTful API for the Expo mobile client. The web frontend uses Server Actions, but every endpoint here is reachable over plain HTTP.</p>

  <h2>Base URL</h2>
  <p>This server: <span class="pill">${escapeHtml(apiBase)}</span></p>

  <h2>Response envelope</h2>
  <p>Success: <code>{ "success": true, "data": &lt;T&gt; }</code> &nbsp;·&nbsp; Error: <code>{ "success": false, "error": "message" }</code></p>
  <p class="blurb">Branch on the HTTP status code and/or the <code>success</code> flag — not on the message text.</p>

  <h2>Authentication</h2>
  <p>JWT access tokens (15&nbsp;min) + refresh tokens (7&nbsp;days). Send the access token on every protected request:</p>
  <pre><code>Authorization: Bearer &lt;accessToken&gt;</code></pre>
  <p class="blurb">On a <code>401</code>, call <code>POST /auth/refresh</code> with the stored refresh token, save the new pair, and retry once. Store tokens in <code>expo-secure-store</code>.</p>

  <h2>CORS</h2>
  <p class="blurb">All <code>/api/*</code> responses carry CORS headers and answer <code>OPTIONS</code> preflight (handled in <code>src/proxy.ts</code>). Default origin is <code>*</code>; restrict via <code>CORS_ALLOWED_ORIGINS</code>.</p>

  <h1 style="font-size:1.25rem;margin-top:2.5rem;">Endpoints</h1>
  ${groups}

  <h2>File uploads</h2>
  <p class="blurb">Image endpoints expect <code>multipart/form-data</code> with a single <code>image</code> field. From React Native, do <strong>not</strong> set <code>Content-Type</code> manually — let fetch set the multipart boundary.</p>

  <h2>Minimal client</h2>
  <pre><code>${escapeHtml(clientSketch)}</code></pre>

  <h2>Sample credentials (seeded)</h2>
  <table>
    <thead><tr><th>Role</th><th>Email</th><th>Password</th></tr></thead>
    <tbody>
      <tr><td>Admin</td><td><code>admin@scarlet.com</code></td><td><code>admin123</code></td></tr>
      <tr><td>Demo user</td><td><code>demo@scarlet.com</code></td><td><code>demo123</code></td></tr>
    </tbody>
  </table>
</body>
</html>`;
}

export function GET(req: NextRequest) {
  const apiBase = `${req.nextUrl.origin}/api`;
  return new Response(renderPage(apiBase), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}
