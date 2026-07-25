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

  // SDXL img2img — stable, widely available, no special permissions required
  let rpRes, rpData;
  try {
    rpRes = await fetch('https://api.replicate.com/v1/models/stability-ai/sdxl/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input: {
          prompt,
          image,
          prompt_strength: 0.8,
          num_inference_steps: 30,
          guidance_scale: 7.5,
          num_outputs: 1,
          width: 512,
          height: 512,
        },
      }),
    });
    const text = await rpRes.text();
    try { rpData = JSON.parse(text); } catch { rpData = { raw: text }; }
  } catch (err) {
    return res.status(502).json({ error: `Cannot reach Replicate: ${err.message}` });
  }

  if (!rpRes.ok) {
    const detail = rpData?.detail || rpData?.error || JSON.stringify(rpData);
    return res.status(rpRes.status).json({ error: `Replicate ${rpRes.status}: ${detail}` });
  }

  return res.status(200).json(rpData);
}
