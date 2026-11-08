import { inworldRequest } from "./inworldRequest";

type Annotation = { url?: string; url_citation?: { url?: string } };
type Completion = { choices?: Array<{ message?: { content?: string; annotations?: Annotation[] } }> };

const SPOKEN =
  "You answer for a voice assistant. Reply in plain spoken sentences: no markdown, lists, URLs or citations. " +
  "If the search results do not answer the question, say so.";

function hostnames(annotations: Annotation[] | undefined): string[] {
  const hosts = (annotations ?? []).flatMap((annotation) => {
    const url = annotation.url ?? annotation.url_citation?.url;
    try {
      return url ? [new URL(url).hostname.replace(/^www\./, "")] : [];
    } catch {
      return [];
    }
  });
  return [...new Set(hosts)].slice(0, 3);
}

async function complete(key: string, model: string, query: string, deep: boolean, signal: AbortSignal) {
  const res = await inworldRequest(key, "/v1/chat/completions", {
    method: "POST",
    contentType: "application/json",
    signal,
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: `${SPOKEN} Use ${deep ? "up to five" : "two or three short"} sentences.` },
        { role: "user", content: query },
      ],
      web_search: { engine: "exa", max_results: deep ? 8 : 3, max_steps: deep ? 3 : 1 },
      max_tokens: deep ? 500 : 250,
    }),
  });
  return (await res.json()) as Completion;
}

/** Ask Inworld's router to search the web and answer in a few spoken sentences (30s cap). */
export async function webSearch(key: string, model: string, query: string, depth: "quick" | "deep") {
  const signal = AbortSignal.timeout(30_000);
  const deep = depth === "deep";
  let body: Completion;
  try {
    body = await complete(key, model, query, deep, signal);
  } catch (error) {
    // The realtime model id may not be routable for chat completions; let Inworld pick instead.
    if (signal.aborted || model === "auto" || /api key/i.test(String(error))) throw error;
    body = await complete(key, "auto", query, deep, signal);
  }
  const message = body.choices?.[0]?.message;
  const answer = message?.content?.trim();
  if (!answer) throw new Error("The search came back empty.");
  return { answer, sources: hostnames(message?.annotations) };
}
