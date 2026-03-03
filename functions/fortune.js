/**
 * Cloudflare Pages Function — Fortune proxy
 * Keeps the Anthropic API key server-side.
 */

const MAX_PROMPT_CHARS = 4000; // well above any legitimate reading prompt

export async function onRequestPost(context) {
  // Reject requests not originating from the site itself
  const origin = context.request.headers.get('origin') ?? '';
  const host   = context.request.headers.get('host') ?? '';
  if (origin && !origin.includes(host.replace(/:\d+$/, ''))) {
    return new Response('Forbidden', { status: 403 });
  }

  let body;
  try {
    body = await context.request.json();
  } catch {
    return new Response('Bad request', { status: 400 });
  }

  const { prompt } = body;
  if (!prompt || typeof prompt !== 'string') {
    return new Response('Missing prompt', { status: 400 });
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    return new Response('Prompt too long', { status: 413 });
  }

  const anthropicRes = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': context.env.ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 900,
      stream: true,
      messages: [{ role: 'user', content: prompt }],
    }),
  });

  return new Response(anthropicRes.body, {
    status: anthropicRes.status,
    headers: { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' },
  });
}
