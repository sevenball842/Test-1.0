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

  // FLUX Kontext Pro — instruction-based image editing (change outfits, backgrounds, hair, etc.)
  let rpRes;
  try {
    rpRes = await fetch(
      'https://api.replicate.com/v1/models/black-forest-labs/flux-kontext-pro/predictions',
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${apiKey}`,
          'Content-Type': 'application/json',
          'Prefer': 'wait=5',
        },
        body: JSON.stringify({
          input: {
            prompt,
            input_image: image,
            output_format: 'jpg',
            safety_tolerance: 2,
          },
        }),
      }
    );
  } catch (err) {
    return res.status(502).json({ error: `Failed to reach Replicate: ${err.message}` });
  }

  const data = await rpRes.json();
  return res.status(rpRes.status).json(data);
}
