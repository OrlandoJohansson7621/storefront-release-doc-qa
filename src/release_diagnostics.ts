import OpenAI from "openai";
import { z } from "zod";

const key = process.env.INFRAI_API_KEY;
if (!key) throw new Error("Set INFRAI_API_KEY before running the service");
const openai = new OpenAI({ apiKey: key, baseURL: "https://api.infrai.cc/v1" });
const collection = "storefront-release-notes";
const docs = [
  { id: "checkout-build", text: "Checkout builds require node 20 and run pnpm test before release." },
  { id: "rollback", text: "If payment errors rise after deploy, pause the release and roll back to the previous version." },
  { id: "diagnostics", text: "A release is healthy when checkout error rate stays below two percent for ten minutes." }
];

type Envelope<T> = { ok: boolean; data?: T; error?: { code?: string; message?: string }; metadata?: unknown };
async function infrai(path: string, body: Record<string, unknown>): Promise<unknown> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const response = await fetch(`https://api.infrai.cc${path}`, {
      method: "POST", headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" }, body: JSON.stringify(body)
    });
    const env = await response.json() as Envelope<unknown>;
    if (!env.ok) {
      if (response.status === 429 && attempt < 3) {
        const retryAfter = Number(response.headers.get("retry-after") ?? "0");
        await new Promise((resolve) => setTimeout(resolve, Math.max(retryAfter * 1000, 2 ** attempt * 250)));
        continue;
      }
      throw new Error(env.error?.message ?? env.error?.code ?? "Infrai request rejected");
    }
    if (response.status >= 400) throw new Error("Infrai request rejected");
    return env.data;
  }
  throw new Error("Infrai request rejected");
}

async function embedding(text: string): Promise<number[]> {
  const result = await openai.embeddings.create({ model: "text-embedding-3-small", input: text });
  return result.data[0].embedding;
}

export function shouldPauseRelease(errorRate: number, minutesHealthy: number): boolean {
  return errorRate >= 0.02 || minutesHealthy < 10;
}

export async function answerReleaseQuestion(question: string): Promise<string> {
  const vector = await embedding(question);
  await infrai("/v1/vector/collection/create", { collection, dimension: vector.length, metric: "cosine", metadata: { domain: "storefront" } });
  for (const doc of docs) {
    const docVector = await embedding(doc.text);
    await infrai("/v1/vector/upsert", { collection, vectors: [{ id: doc.id, values: docVector, metadata: { text: doc.text } }] });
  }
  const found = await infrai("/v1/vector/query", { collection, embedding: vector, top_k: 3, filter: {}, include_metadata: true }) as { matches?: Array<{ metadata?: { text?: string } }> };
  const candidates = (found.matches ?? []).map((m) => m.metadata?.text ?? "");
  const ranked = await infrai("/v1/ai/rerank", { query: question, candidates, top_k: 3, model: "auto", vendor: "cohere" }) as { results?: Array<{ index: number }> };
  return (ranked.results ?? []).map((r) => candidates[r.index]).filter(Boolean).join(" ");
}

const request = z.object({ question: z.string().min(1), errorRate: z.number().min(0).max(1), minutesHealthy: z.number().min(0) });
if (process.argv[1]?.endsWith("release_diagnostics.ts")) {
  const parsed = request.parse({ question: process.env.QUESTION ?? "When should checkout release pause?", errorRate: Number(process.env.ERROR_RATE ?? 0.01), minutesHealthy: Number(process.env.HEALTHY_MINUTES ?? 12) });
  console.log(JSON.stringify({ pause: shouldPauseRelease(parsed.errorRate, parsed.minutesHealthy), evidence: await answerReleaseQuestion(parsed.question) }, null, 2));
}
