// Proxy for polling prediction status — works for both Replicate and Runway ML
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { id, apiKey, provider } = req.body || {};
  if (!id || !apiKey) {
    return res.status(400).json({ error: 'Missing id or apiKey' });
  }

  let pollRes;
  try {
    if (provider === 'runway') {
      pollRes = await fetch(`https://api.dev.runwayml.com/v1/tasks/${id}`, {
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'X-Runway-Version': '2024-11-06',
        },
      });
    } else {
      pollRes = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
        headers: { Authorization: `Token ${apiKey}` },
      });
    }
  } catch (err) {
    return res.status(502).json({ error: `Polling failed: ${err.message}` });
  }

  const data = await pollRes.json();
  return res.status(pollRes.status).json(data);
}
