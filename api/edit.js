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

  // instruct-pix2pix — versioned predictions endpoint (more reliable than model-name endpoint)
  let rpRes;
  try {
    rpRes = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        Authorization: `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: '30c1d0b916a6f8efce20493f5d61ee27491ab2a5a5f0b5b09b5c5d2ee0b60c59',
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
  } catch (err) {
    return res.status(502).json({ error: `Failed to reach Replicate: ${err.message}` });
  }

  const data = await rpRes.json();
  return res.status(rpRes.status).json(data);
}
