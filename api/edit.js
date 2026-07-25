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

  // Step 1: verify the API key is valid by checking account info
  let acctRes;
  try {
    acctRes = await fetch('https://api.replicate.com/v1/account', {
      headers: { Authorization: `Token ${apiKey}` },
    });
  } catch (err) {
    return res.status(502).json({ error: `Cannot reach Replicate: ${err.message}` });
  }

  if (!acctRes.ok) {
    const acctData = await acctRes.json().catch(() => ({}));
    return res.status(401).json({
      error: `Invalid Replicate API key (${acctRes.status}): ${acctData.detail || 'check your token'}`,
    });
  }

  // Step 2: start the prediction
  let rpRes, rpData;
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
    const text = await rpRes.text();
    try { rpData = JSON.parse(text); } catch { rpData = { raw: text }; }
  } catch (err) {
    return res.status(502).json({ error: `Replicate request failed: ${err.message}` });
  }

  if (!rpRes.ok) {
    const detail = rpData?.detail || rpData?.error || JSON.stringify(rpData);
    return res.status(rpRes.status).json({
      error: `Replicate ${rpRes.status}: ${detail}`,
    });
  }

  return res.status(200).json(rpData);
}
