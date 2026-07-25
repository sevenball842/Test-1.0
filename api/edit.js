export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { image, prompt, apiKey } = req.body || {};
  if (!image || !prompt || !apiKey) {
    return res.status(400).json({ error: 'Missing image, prompt, or apiKey' });
  }

  // Step 1: fetch the latest published version of instruct-pix2pix
  let versionId;
  try {
    const vRes = await fetch(
      'https://api.replicate.com/v1/models/timothybrooks/instruct-pix2pix/versions',
      { headers: { Authorization: `Token ${apiKey}` } }
    );
    if (!vRes.ok) {
      const d = await vRes.json().catch(() => ({}));
      return res.status(vRes.status).json({
        error: `Model lookup failed (${vRes.status}): ${d.detail || JSON.stringify(d)}`,
      });
    }
    const vData = await vRes.json();
    versionId = vData.results?.[0]?.id;
    if (!versionId) {
      return res.status(502).json({ error: 'No versions found for instruct-pix2pix' });
    }
  } catch (err) {
    return res.status(502).json({ error: `Cannot reach Replicate: ${err.message}` });
  }

  // Step 2: create prediction with that version
  let rpRes, rpData;
  try {
    rpRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: versionId,
        input: {
          image,
          prompt,
          num_inference_steps: 50,
          image_guidance_scale: 1.5,
          guidance_scale: 7.5,
          num_outputs: 1,
        },
      }),
    });
    const text = await rpRes.text();
    try { rpData = JSON.parse(text); } catch { rpData = { raw: text }; }
  } catch (err) {
    return res.status(502).json({ error: `Prediction request failed: ${err.message}` });
  }

  if (!rpRes.ok) {
    const detail = rpData?.detail || rpData?.error || JSON.stringify(rpData);
    return res.status(rpRes.status).json({ error: `Replicate ${rpRes.status}: ${detail}` });
  }

  return res.status(200).json(rpData);
}
