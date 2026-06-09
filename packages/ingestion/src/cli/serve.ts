import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import path from "node:path";
import { defaultCorpusDir } from "../manifest";
import { resolveEmbedding } from "../embeddings";
import { LocalVectorStore } from "../vectorstore";

// Dev retrieval bridge: a tiny Node sidecar exposing the local embedder + vector
// index over HTTP, so the Worker can run the real agent loop in dev without
// Cloudflare (Workers AI / Vectorize). Prod uses the bindings instead.
const dir = defaultCorpusDir();
const { provider: embedder, model } = resolveEmbedding();
const store = new LocalVectorStore(path.join(dir, ".chunks", "local-index.json"));
const PORT = Number(process.env.PORT ?? 8799);

function readBody(req: IncomingMessage): Promise<string> {
  return new Promise((resolve) => {
    let data = "";
    req.on("data", (c) => (data += c));
    req.on("end", () => resolve(data));
  });
}

const server = createServer(async (req: IncomingMessage, res: ServerResponse) => {
  res.setHeader("content-type", "application/json");
  res.setHeader("access-control-allow-origin", "*");
  try {
    if (req.method === "POST" && req.url === "/embed") {
      const { texts, kind } = JSON.parse(await readBody(req)) as {
        texts: string[];
        kind?: "query" | "passage";
      };
      res.end(JSON.stringify({ vectors: await embedder.embed(texts, kind) }));
    } else if (req.method === "POST" && req.url === "/query") {
      const { vector, topK } = JSON.parse(await readBody(req)) as { vector: number[]; topK?: number };
      res.end(JSON.stringify({ chunks: await store.query(vector, { topK: topK ?? 8 }) }));
    } else if (req.url === "/health") {
      res.end(JSON.stringify({ ok: true, embedder: embedder.name }));
    } else {
      res.statusCode = 404;
      res.end(JSON.stringify({ error: "not found" }));
    }
  } catch (e) {
    res.statusCode = 500;
    res.end(JSON.stringify({ error: e instanceof Error ? e.message : "error" }));
  }
});

server.listen(PORT, "127.0.0.1", () =>
  console.log(`dev retrieval bridge → http://127.0.0.1:${PORT}  (embed=${model})`),
);
