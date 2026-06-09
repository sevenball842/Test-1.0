/* Video generation — Runway ML Gen-3 and Replicate integrations */

const VideoGen = (() => {
  let settings = {
    duration: 5,
    motion: 'subtle',
    ratio: '1280:768',
    provider: 'runway',
  };

  const PROVIDER_NOTES = {
    runway: 'Runway ML Gen-3 Alpha Turbo. Supports 5s or 10s. High quality cinematic output.',
    replicate: 'Stable Video Diffusion via Replicate. Good for realistic motion from photos.',
  };

  const MOTION_PROMPTS = {
    subtle:   'subtle motion, smooth and gentle',
    moderate: 'moderate camera movement, natural motion',
    dynamic:  'dynamic motion, dramatic camera movement',
  };

  function init() {
    bindSettingButtons();
    updateProviderNote();
    document.getElementById('video-provider')?.addEventListener('change', e => {
      settings.provider = e.target.value;
      updateProviderNote();
    });
  }

  function bindSettingButtons() {
    document.querySelectorAll('[data-duration]').forEach(btn => {
      btn.addEventListener('click', () => {
        settings.duration = +btn.dataset.duration;
        document.querySelectorAll('[data-duration]').forEach(b => b.classList.remove('active-tool'));
        btn.classList.add('active-tool');
      });
    });
    document.querySelectorAll('[data-motion]').forEach(btn => {
      btn.addEventListener('click', () => {
        settings.motion = btn.dataset.motion;
        document.querySelectorAll('[data-motion]').forEach(b => b.classList.remove('active-tool'));
        btn.classList.add('active-tool');
      });
    });
    document.querySelectorAll('[data-ratio-v]').forEach(btn => {
      btn.addEventListener('click', () => {
        settings.ratio = btn.dataset.ratioV;
        document.querySelectorAll('[data-ratio-v]').forEach(b => b.classList.remove('active-tool'));
        btn.classList.add('active-tool');
      });
    });
  }

  function updateProviderNote() {
    const el = document.getElementById('provider-info');
    if (el) el.textContent = PROVIDER_NOTES[settings.provider] || '';
  }

  function buildFullPrompt(userPrompt) {
    const motionHint = MOTION_PROMPTS[settings.motion] || '';
    return [userPrompt.trim(), motionHint].filter(Boolean).join(', ');
  }

  async function generate(imageDataURL, userPrompt) {
    const provider = settings.provider;
    const apiKey = getApiKey(provider);
    if (!apiKey) {
      throw new Error(`No API key set for ${provider === 'runway' ? 'Runway ML' : 'Replicate'}. Open Settings to add it.`);
    }

    const prompt = buildFullPrompt(userPrompt);

    if (provider === 'runway') {
      return generateRunway(imageDataURL, prompt, apiKey);
    } else {
      return generateReplicate(imageDataURL, prompt, apiKey);
    }
  }

  async function generateRunway(imageDataURL, prompt, apiKey) {
    const response = await fetch('https://api.dev.runwayml.com/v1/image_to_video', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Runway-Version': '2024-11-06',
      },
      body: JSON.stringify({
        promptImage: imageDataURL,
        promptText: prompt,
        model: 'gen3a_turbo',
        duration: settings.duration,
        ratio: settings.ratio,
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.message || `Runway API error ${response.status}`);
    }

    const { id } = await response.json();
    return pollRunway(id, apiKey);
  }

  async function pollRunway(taskId, apiKey, onProgress) {
    const maxAttempts = 120;
    let attempt = 0;
    while (attempt < maxAttempts) {
      await delay(3000);
      attempt++;
      const res = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
        headers: { 'Authorization': `Bearer ${apiKey}`, 'X-Runway-Version': '2024-11-06' },
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (data.status === 'SUCCEEDED') return data.output?.[0];
      if (data.status === 'FAILED') throw new Error(data.failure || 'Runway generation failed');
      if (typeof onProgress === 'function') onProgress(Math.min(attempt / maxAttempts * 90, 90));
    }
    throw new Error('Timed out waiting for Runway video');
  }

  async function generateReplicate(imageDataURL, prompt, apiKey) {
    // Use Stable Video Diffusion img2vid model
    const response = await fetch('https://api.replicate.com/v1/predictions', {
      method: 'POST',
      headers: {
        'Authorization': `Token ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        version: 'stability-ai/stable-video-diffusion:3f0457e4619daac51203dedb472816fd4af51f3149fa7a9e0b5ffcf1b8172438',
        input: {
          input_image: imageDataURL,
          frames_per_second: 6,
          num_frames: settings.duration * 6,
          motion_bucket_id: settings.motion === 'subtle' ? 64 : settings.motion === 'moderate' ? 100 : 160,
          cond_aug: 0.02,
          decoding_t: 7,
          output_format: 'mp4',
        },
      }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.detail || `Replicate API error ${response.status}`);
    }

    const { id } = await response.json();
    return pollReplicate(id, apiKey);
  }

  async function pollReplicate(predId, apiKey) {
    const maxAttempts = 120;
    let attempt = 0;
    while (attempt < maxAttempts) {
      await delay(3000);
      attempt++;
      const res = await fetch(`https://api.replicate.com/v1/predictions/${predId}`, {
        headers: { 'Authorization': `Token ${apiKey}` },
      });
      if (!res.ok) continue;
      const data = await res.json();
      if (data.status === 'succeeded') return Array.isArray(data.output) ? data.output[0] : data.output;
      if (data.status === 'failed') throw new Error(data.error || 'Replicate generation failed');
    }
    throw new Error('Timed out waiting for Replicate video');
  }

  function getApiKey(provider) {
    return localStorage.getItem(`ff_key_${provider}`) || '';
  }

  function saveApiKey(provider, key) {
    localStorage.setItem(`ff_key_${provider}`, key);
  }

  function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  return { init, generate, getApiKey, saveApiKey };
})();
