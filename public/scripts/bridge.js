const FALLBACK_SUMMARY = "keeps their routine on track";
const FALLBACK_MOOD = "steady";

export async function summarizeMemories(agent, memories) {
  const payload = memories ?? agent?.decisionLog?.slice(0, 6) ?? [];
  if (!shouldCallLLM()) {
    return `${agent?.name || "Agent"} recalls ${payload.length} notes.`;
  }
  return callProxy({
    task: "summarize",
    prompt: `Summarize these notes: ${payload.map((d) => d.action).join(", ")}`
  });
}

export async function generateMood(agent) {
  if (!shouldCallLLM()) {
    return FALLBACK_MOOD;
  }
  const memories = agent?.decisionLog?.slice(0, 3) ?? [];
  return callProxy({
    task: "mood",
    prompt: `Given ${agent?.name} recent actions ${memories.map((m) => m.action).join(", ")}, provide a one-word mood.`
  });
}

function shouldCallLLM() {
  return typeof window !== "undefined" && window.__LLM_INTENTIONS && Boolean(window.__LLM_PROXY_URL);
}

async function callProxy(body) {
  try {
    const response = await fetch(window.__LLM_PROXY_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ provider: window.__LLM_PROVIDER || "groq", ...body })
    });
    if (!response.ok) throw new Error("proxy error");
    const data = await response.json();
    return data.result || data.summary || data.mood || FALLBACK_SUMMARY;
  } catch (error) {
    console.warn("LLM proxy failed", error);
    return FALLBACK_SUMMARY;
  }
}
