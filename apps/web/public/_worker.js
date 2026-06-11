/**
 * Cloudflare Pages advanced-mode worker: serves the built SPA (with SPA
 * fallback for /c/* routes) and proxies /api/* to the Legalis brain, injecting
 * the bearer token only the edge knows. BRAIN_URL + BRAIN_TOKEN are Pages
 * project secrets.
 */
export default {
  async fetch(request, env) {
    const url = new URL(request.url);

    if (url.pathname.startsWith("/api/")) {
      if (url.pathname === "/api/health") {
        return Response.json({ ok: true, service: "legalis-edge" });
      }
      const isStream = request.method === "POST" && /^\/api\/chat\/[^/]+\/stream$/.test(url.pathname);
      const isHistory = request.method === "GET" && /^\/api\/chat\/[^/]+\/history$/.test(url.pathname);
      if (!isStream && !isHistory) return Response.json({ error: "not found" }, { status: 404 });
      if (!env.BRAIN_URL) return Response.json({ error: "brain not configured" }, { status: 503 });

      const headers = { accept: "*/*" };
      if (env.BRAIN_TOKEN) headers.authorization = `Bearer ${env.BRAIN_TOKEN}`;
      let body;
      if (isStream) {
        headers["content-type"] = "application/json";
        body = await request.text();
        if (body.length > 4000) return Response.json({ error: "payload too large" }, { status: 413 });
      }
      const upstream = await fetch(`${env.BRAIN_URL}${url.pathname}`, {
        method: request.method,
        headers,
        body,
      });
      return new Response(upstream.body, {
        status: upstream.status,
        headers: isStream
          ? {
              "content-type": "text/event-stream; charset=utf-8",
              "cache-control": "no-cache, no-transform",
            }
          : { "content-type": "application/json" },
      });
    }

    // Static assets with SPA fallback (/, /chat, /c/:id, marketing routes).
    const asset = await env.ASSETS.fetch(request);
    if (asset.status !== 404) return asset;
    return env.ASSETS.fetch(new Request(new URL("/index.html", url.origin), request));
  },
};
