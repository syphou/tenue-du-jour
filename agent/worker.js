/* Relais Cloudflare Workers AI pour l'appli Habille-moi.
   - Reçoit { messages:[{role,content}], max_tokens } de l'appli, appelle le modèle et renvoie { text }.
   - Aucune clé à gérer : le modèle est appelé par la liaison « AI » du Worker.
   - Garde-fous : origine autorisée, taille limitée, rôles limités, longueur de réponse limitée, plafonds journaliers optionnels (KV). */

const ALLOWED_ORIGIN = "https://syphou.github.io"; // adresse de votre appli (sans / final)
// Modèles essayés dans l'ordre : le premier qui répond est utilisé (légers d'abord : plus de réponses par jour dans l'offre gratuite).
const MODELS = [
  "@cf/meta/llama-3.1-8b-instruct-fp8",
  "@cf/meta/llama-3.1-8b-instruct",
  "@cf/meta/llama-3.2-3b-instruct",
  "@cf/meta/llama-3.3-70b-instruct-fp8-fast",
  "@cf/mistral/mistral-7b-instruct-v0.1",
];
const MAX_BODY = 20000;                              // octets
const MAX_TOKENS = 450;
const PER_IP_PER_DAY = 40;                           // utilisé seulement si un espace KV « LIMITS » est lié
const GLOBAL_PER_DAY = 400;

function cors(origin) {
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin",
  };
}
function json(obj, status, origin) {
  return new Response(JSON.stringify(obj), { status, headers: { "Content-Type": "application/json", ...cors(origin) } });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const okOrigin = origin === ALLOWED_ORIGIN || origin === "http://localhost:8000"; // localhost : essais
    const allow = okOrigin ? origin : ALLOWED_ORIGIN;
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors(allow) });
    if (request.method !== "POST") return json({ error: "method" }, 405, allow);
    if (!okOrigin) return json({ error: "origin" }, 403, allow);

    const raw = await request.text();
    if (raw.length > MAX_BODY) return json({ error: "too_large" }, 413, allow);
    let body;
    try { body = JSON.parse(raw); } catch (e) { return json({ error: "json" }, 400, allow); }
    const msgs = Array.isArray(body.messages) ? body.messages : null;
    if (!msgs || msgs.length < 1 || msgs.length > 4) return json({ error: "messages" }, 400, allow);
    const messages = [];
    for (const m of msgs) {
      if (!m || (m.role !== "system" && m.role !== "user") || typeof m.content !== "string") return json({ error: "messages" }, 400, allow);
      messages.push({ role: m.role, content: m.content });
    }

    // Plafonds journaliers (facultatifs : seulement si un espace KV nommé LIMITS est lié au Worker)
    if (env.LIMITS) {
      const day = new Date().toISOString().slice(0, 10);
      const ip = request.headers.get("CF-Connecting-IP") || "?";
      const kIp = "ip:" + day + ":" + ip, kAll = "all:" + day;
      const nIp = parseInt((await env.LIMITS.get(kIp)) || "0", 10), nAll = parseInt((await env.LIMITS.get(kAll)) || "0", 10);
      if (nIp >= PER_IP_PER_DAY || nAll >= GLOBAL_PER_DAY) return json({ error: "quota" }, 429, allow);
      await env.LIMITS.put(kIp, String(nIp + 1), { expirationTtl: 90000 });
      await env.LIMITS.put(kAll, String(nAll + 1), { expirationTtl: 90000 });
    }

    const list = env.MODEL ? [env.MODEL, ...MODELS] : MODELS;
    let lastErr = "";
    for (const model of list) {
      try {
        const out = await env.AI.run(model, {
          messages,
          max_tokens: Math.min(Number(body.max_tokens) || MAX_TOKENS, MAX_TOKENS),
          temperature: 0.4,
        });
        let text = "";
        if (typeof out === "string") text = out;
        else if (out && typeof out.response === "string") text = out.response;
        else if (out && out.result && typeof out.result.response === "string") text = out.result.response;
        else text = JSON.stringify(out || {});
        return json({ text, model }, 200, allow);
      } catch (e) {
        lastErr = model.split("/").pop() + " : " + String((e && e.message) || e).slice(0, 160);
      }
    }
    return json({ error: "model", detail: lastErr }, 502, allow);
  },
};
