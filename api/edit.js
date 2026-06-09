// Proxy for photo editing — calls Replicate InstructPix2Pix server-side
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

  let rpRes;
  try {
    rpRes = await fetch(
      'https://api.replicate.com/v1/models/timothybrooks/instruct-pix2pix/predictions',
      {
        method: 'POST',
        headers: {
          Authorization: `Token ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          input: {
            image,
            prompt,
            num_inference_steps: 50,
            image_guidance_scale: 1.5,
            guidance_scale: 7.5,
            num_outputs: 1,
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
