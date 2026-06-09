// Proxy for video generation — calls Runway ML or Replicate server-side
export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { image, prompt, apiKey, provider, duration, ratio } = req.body || {};
  if (!image || !prompt || !apiKey) {
    return res.status(400).json({ error: 'Missing image, prompt, or apiKey' });
  }

  let upRes;
  try {
    if (provider === 'runway') {
      upRes = await fetch('https://api.dev.runwayml.com/v1/image_to_video', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'X-Runway-Version': '2024-11-06',
        },
        body: JSON.stringify({
          promptImage: image,
          promptText: prompt,
          model: 'gen3a_turbo',
          duration: duration || 5,
          ratio: ratio || '1280:768',
        }),
      });
    } else {
      upRes = await fetch(
        'https://api.replicate.com/v1/models/stability-ai/stable-video-diffusion/predictions',
        {
          method: 'POST',
          headers: {
            Authorization: `Token ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            input: {
              input_image: image,
              frames_per_second: 6,
              num_frames: (duration || 5) * 6,
              motion_bucket_id: 100,
              cond_aug: 0.02,
              decoding_t: 7,
              output_format: 'mp4',
            },
          }),
        }
      );
    }
  } catch (err) {
    return res.status(502).json({ error: `Failed to reach AI provider: ${err.message}` });
  }

  const data = await upRes.json();
  return res.status(upRes.status).json(data);
}
