const API_URL = 'https://commentanalyzer.googleapis.com/v1alpha1/comments:analyze';

async function getFetch() {
  if (typeof fetch !== 'undefined') return fetch;
  try {
    const mod = await import('node-fetch');
    return mod.default || mod;
  } catch (e) {
    // eslint-disable-next-line no-console
    console.error('Perspective: fetch not available and node-fetch not installed.', e?.message);
    return null;
  }
}

export async function analyzeWithPerspective(text, lang = 'en') {
  const apiKey = process.env.PERSPECTIVE_API_KEY;
  const doFetch = await getFetch();
  if (!apiKey || !doFetch || !text) {
    if (!apiKey) console.error('Perspective: missing PERSPECTIVE_API_KEY');
    return null;
  }

  const body = {
    comment: { text },
    doNotStore: true,
    requestedAttributes: {
      TOXICITY: {},
      SEVERE_TOXICITY: {},
      IDENTITY_ATTACK: {},
      INSULT: {},
      PROFANITY: {},
      THREAT: {},
      SEXUALLY_EXPLICIT: {},
      SPAM: {}
    }
  };

  const resp = await doFetch(`${API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });

  if (!resp.ok) {
    const errText = await resp.text().catch(() => '');
    console.error('Perspective API error:', resp.status, errText);
    return null;
  }

  const data = await resp.json();
  const s = (k) => data?.attributeScores?.[k]?.summaryScore?.value ?? 0;
  const scores = {
    toxicity: s('TOXICITY'),
    severeToxicity: s('SEVERE_TOXICITY'),
    identityAttack: s('IDENTITY_ATTACK'),
    insult: s('INSULT'),
    profanity: s('PROFANITY'),
    threat: s('THREAT'),
    sexualExplicit: s('SEXUALLY_EXPLICIT'),
    spam: s('SPAM')
  };

  // Map to allowed/flagged/block severity
  const reasons = [];
  let severity = 'low';

  if (scores.threat >= 0.8 || scores.severeToxicity >= 0.8 || scores.identityAttack >= 0.7 || scores.sexualExplicit >= 0.85 || scores.profanity >= 0.8) {
    if (scores.threat >= 0.8) reasons.push('threat');
    if (scores.severeToxicity >= 0.8) reasons.push('severe_toxicity');
    if (scores.identityAttack >= 0.7) reasons.push('identity_attack');
    if (scores.sexualExplicit >= 0.85) reasons.push('sexual_explicit');
    if (scores.profanity >= 0.8) reasons.push('toxicity');
    severity = 'high';
  } else if (
    scores.toxicity >= 0.6 || scores.spam >= 0.7 || scores.profanity >= 0.7 || scores.insult >= 0.65
  ) {
    if (scores.toxicity >= 0.6) reasons.push('toxicity');
    if (scores.spam >= 0.7) reasons.push('spam');
    if (scores.profanity >= 0.7) reasons.push('profanity');
    if (scores.insult >= 0.65) reasons.push('insult');
    severity = 'medium';
  }

  const blocked = severity === 'high';
  return {
    allowed: !blocked,
    flagged: reasons.length > 0,
    severity,
    reasons,
    scores,
    aiDecision: blocked ? 'blocked' : (reasons.length > 0 ? 'auto_flagged' : 'approved')
  };
}

export default { analyzeWithPerspective };


