/* ─── State ─── */
const state = {
  editImageData: null,   // base64 data URL of selected photo for editing
  videoImageData: null,  // base64 data URL of selected photo for video
  videoDuration: 5,
  videoRatio: '1280:768',
  videoProvider: 'runway',
};

/* ─── Init ─── */
document.addEventListener('DOMContentLoaded', () => {
  loadSettings();
  wireUpload('edit');
  wireUpload('video');
  wireChips();
  wireSegControls();
  wireActionButtons();
  wireSettings();
});

/* ─── Upload handling ─── */
function wireUpload(section) {
  const fileInput   = document.getElementById(`${section}-file`);
  const box         = document.getElementById(`${section}-upload-box`);
  const preview     = document.getElementById(`${section}-preview`);
  const placeholder = document.getElementById(`${section}-placeholder`);
  const swapBtn     = document.getElementById(`${section}-swap-btn`);

  fileInput.addEventListener('change', e => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const dataURL = ev.target.result;
      resizeImage(dataURL, 1024, compressed => {
        if (section === 'edit') state.editImageData = compressed;
        else state.videoImageData = compressed;
        preview.src = compressed;
        preview.classList.remove('hidden');
        placeholder.classList.add('hidden');
        swapBtn.classList.remove('hidden');
        box.classList.add('has-image');
        updateActionBtn(section);
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  });

  // Clicking swap re-triggers file input
  swapBtn.addEventListener('click', e => {
    e.stopPropagation();
    fileInput.click();
  });
}

/* ─── Chips — insert prompt text ─── */
function wireChips() {
  document.querySelectorAll('#section-edit .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const ta = document.getElementById('edit-prompt');
      ta.value = chip.dataset.insert;
      ta.focus();
      ta.setSelectionRange(ta.value.length, ta.value.length);
    });
  });
  document.querySelectorAll('#section-video .chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const ta = document.getElementById('video-prompt');
      ta.value = chip.dataset.insert;
      ta.focus();
    });
  });
}

/* ─── Segmented controls (duration + ratio) ─── */
function wireSegControls() {
  document.querySelectorAll('[data-duration]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-duration]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.videoDuration = +btn.dataset.duration;
    });
  });
  document.querySelectorAll('[data-vratio]').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('[data-vratio]').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      state.videoRatio = btn.dataset.vratio;
    });
  });
}

/* ─── Enable/disable action buttons ─── */
function updateActionBtn(section) {
  if (section === 'edit') {
    document.getElementById('btn-edit').disabled = !state.editImageData;
  } else {
    document.getElementById('btn-generate').disabled = !state.videoImageData;
  }
}

/* ─── Action buttons ─── */
function wireActionButtons() {
  document.getElementById('btn-edit').addEventListener('click', handleEdit);
  document.getElementById('btn-generate').addEventListener('click', handleVideo);

  document.getElementById('btn-save-edit').addEventListener('click', () => {
    const img = document.getElementById('edit-result-img');
    if (!img.src) return;
    downloadDataURL(img.src, 'frameforge-edit.jpg');
  });

  document.getElementById('btn-save-video').addEventListener('click', () => {
    const video = document.getElementById('video-result');
    if (!video.src) return;
    const a = document.createElement('a');
    a.href = video.src;
    a.download = 'frameforge-video.mp4';
    a.click();
  });

  document.getElementById('btn-use-for-video').addEventListener('click', () => {
    const resultImg = document.getElementById('edit-result-img');
    if (!resultImg.src) return;
    state.videoImageData = resultImg.src;
    document.getElementById('video-preview').src = resultImg.src;
    document.getElementById('video-preview').classList.remove('hidden');
    document.getElementById('video-placeholder').classList.add('hidden');
    document.getElementById('video-swap-btn').classList.remove('hidden');
    document.getElementById('video-upload-box').classList.add('has-image');
    updateActionBtn('video');
    document.getElementById('section-video').scrollIntoView({ behavior: 'smooth' });
    toast('Photo set as video source', 'success');
  });
}

/* ─── Photo Editing via Replicate InstructPix2Pix ─── */
async function handleEdit() {
  const prompt = document.getElementById('edit-prompt').value.trim();
  if (!prompt) { toast('Describe what you want to change first', 'error'); return; }
  if (!state.editImageData) { toast('Add a photo first', 'error'); return; }

  const apiKey = getKey('replicate');
  if (!apiKey) { toast('Add your Replicate API key in Settings ⚙️', 'error'); return; }

  setEditLoading(true);

  try {
    const resultUrl = await editPhotoWithAI(state.editImageData, prompt, apiKey);
    document.getElementById('edit-result-img').src = resultUrl;
    document.getElementById('edit-result-wrap').classList.remove('hidden');
    toast('Edit applied!', 'success');
  } catch (err) {
    toast(err.message || 'Edit failed — check your API key', 'error');
  } finally {
    setEditLoading(false);
  }
}

async function editPhotoWithAI(imageDataURL, prompt, apiKey) {
  const response = await fetch('https://api.replicate.com/v1/models/timothybrooks/instruct-pix2pix/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${apiKey}`,
      'Content-Type': 'application/json',
      'Prefer': 'wait',
    },
    body: JSON.stringify({
      input: {
        image: imageDataURL,
        prompt: prompt,
        num_inference_steps: 100,
        image_guidance_scale: 1.5,
        guidance_scale: 7.5,
        num_outputs: 1,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `API error ${response.status}`);
  }

  const data = await response.json();

  // If completed immediately (Prefer: wait header)
  if (data.status === 'succeeded') {
    return Array.isArray(data.output) ? data.output[0] : data.output;
  }

  // Otherwise poll
  if (!data.id) throw new Error('No prediction ID returned');
  return pollPrediction(data.id, apiKey, 'edit');
}

/* ─── Video Generation ─── */
async function handleVideo() {
  const prompt = document.getElementById('video-prompt').value.trim();
  if (!prompt) { toast('Describe the motion and mood first', 'error'); return; }
  if (!state.videoImageData) { toast('Add a photo first', 'error'); return; }

  const provider = state.videoProvider;
  const apiKey   = getKey(provider === 'runway' ? 'runway' : 'replicate');
  if (!apiKey) {
    toast(`Add your ${provider === 'runway' ? 'Runway ML' : 'Replicate'} API key in Settings ⚙️`, 'error');
    return;
  }

  setVideoLoading(true);

  try {
    let videoUrl;
    if (provider === 'runway') {
      videoUrl = await generateRunway(state.videoImageData, prompt, apiKey);
    } else {
      videoUrl = await generateReplicateVideo(state.videoImageData, prompt, apiKey);
    }
    const videoEl = document.getElementById('video-result');
    videoEl.src = videoUrl;
    document.getElementById('video-result-wrap').classList.remove('hidden');
    toast('Video ready!', 'success');
  } catch (err) {
    toast(err.message || 'Generation failed — check your API key', 'error');
  } finally {
    setVideoLoading(false);
  }
}

async function generateRunway(imageDataURL, prompt, apiKey) {
  const motionHint = getMotionHint();
  const fullPrompt = [prompt, motionHint].filter(Boolean).join(', ');

  const res = await fetch('https://api.dev.runwayml.com/v1/image_to_video', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'X-Runway-Version': '2024-11-06',
    },
    body: JSON.stringify({
      promptImage: imageDataURL,
      promptText: fullPrompt,
      model: 'gen3a_turbo',
      duration: state.videoDuration,
      ratio: state.videoRatio,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Runway error ${res.status}`);
  }

  const { id } = await res.json();
  return pollRunway(id, apiKey);
}

async function pollRunway(taskId, apiKey) {
  for (let i = 0; i < 120; i++) {
    await delay(3000);
    const res = await fetch(`https://api.dev.runwayml.com/v1/tasks/${taskId}`, {
      headers: { 'Authorization': `Bearer ${apiKey}`, 'X-Runway-Version': '2024-11-06' },
    });
    if (!res.ok) continue;
    const data = await res.json();
    updateVideoProgress(Math.min(i / 40 * 90, 88));
    if (data.status === 'SUCCEEDED') return data.output?.[0];
    if (data.status === 'FAILED') throw new Error(data.failure || 'Runway generation failed');
  }
  throw new Error('Timed out — try again');
}

async function generateReplicateVideo(imageDataURL, prompt, apiKey) {
  const motionBucket = 100;
  const res = await fetch('https://api.replicate.com/v1/models/stability-ai/stable-video-diffusion/predictions', {
    method: 'POST',
    headers: {
      'Authorization': `Token ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      input: {
        input_image: imageDataURL,
        frames_per_second: 6,
        num_frames: state.videoDuration * 6,
        motion_bucket_id: motionBucket,
        cond_aug: 0.02,
        decoding_t: 7,
        output_format: 'mp4',
      },
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || `Replicate error ${res.status}`);
  }

  const { id } = await res.json();
  return pollPrediction(id, apiKey, 'video');
}

async function pollPrediction(id, apiKey, section) {
  for (let i = 0; i < 120; i++) {
    await delay(3000);
    const res = await fetch(`https://api.replicate.com/v1/predictions/${id}`, {
      headers: { 'Authorization': `Token ${apiKey}` },
    });
    if (!res.ok) continue;
    const data = await res.json();

    const pct = Math.min(i / 40 * 90, 88);
    if (section === 'edit') updateEditProgress(pct, data.logs?.split('\n').pop() || 'Processing…');
    else updateVideoProgress(pct);

    if (data.status === 'succeeded') {
      return Array.isArray(data.output) ? data.output[0] : data.output;
    }
    if (data.status === 'failed') throw new Error(data.error || 'Generation failed');
  }
  throw new Error('Timed out — try again');
}

function getMotionHint() {
  return '';
}

/* ─── Loading states ─── */
let editProgressTimer = null;
function setEditLoading(on) {
  const btn  = document.getElementById('btn-edit');
  const wrap = document.getElementById('edit-progress');
  const fill = document.getElementById('edit-progress-fill');
  const text = document.getElementById('edit-progress-text');
  btn.disabled = on;
  if (on) {
    wrap.classList.remove('hidden');
    fill.style.width = '0%';
    let p = 0;
    editProgressTimer = setInterval(() => {
      p = Math.min(p + 0.8, 85);
      fill.style.width = p + '%';
      if (p < 20) text.textContent = 'Sending photo to AI…';
      else if (p < 50) text.textContent = 'Applying edits…';
      else if (p < 80) text.textContent = 'Finishing up…';
    }, 800);
  } else {
    clearInterval(editProgressTimer);
    fill.style.width = '100%';
    setTimeout(() => wrap.classList.add('hidden'), 500);
  }
}

function updateEditProgress(pct, label) {
  document.getElementById('edit-progress-fill').style.width = pct + '%';
  if (label) document.getElementById('edit-progress-text').textContent = label;
}

let videoProgressTimer = null;
function setVideoLoading(on) {
  const btn  = document.getElementById('btn-generate');
  const wrap = document.getElementById('video-progress');
  const fill = document.getElementById('video-progress-fill');
  const text = document.getElementById('video-progress-text');
  btn.disabled = on;
  if (on) {
    wrap.classList.remove('hidden');
    fill.style.width = '0%';
    let p = 0;
    videoProgressTimer = setInterval(() => {
      p = Math.min(p + 0.5, 80);
      fill.style.width = p + '%';
      if (p < 15) text.textContent = 'Starting generation…';
      else if (p < 40) text.textContent = 'Generating frames…';
      else if (p < 70) text.textContent = 'Encoding video…';
      else text.textContent = 'Almost done…';
    }, 1200);
  } else {
    clearInterval(videoProgressTimer);
    fill.style.width = '100%';
    setTimeout(() => wrap.classList.add('hidden'), 500);
  }
}

function updateVideoProgress(pct) {
  document.getElementById('video-progress-fill').style.width = pct + '%';
}

/* ─── Settings ─── */
function wireSettings() {
  document.getElementById('btn-settings').addEventListener('click', openModal);
  document.getElementById('btn-close-modal').addEventListener('click', closeModal);
  document.getElementById('modal-settings').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });
  document.getElementById('btn-save-settings').addEventListener('click', () => {
    saveKey('replicate', document.getElementById('key-replicate').value.trim());
    saveKey('runway',    document.getElementById('key-runway').value.trim());
    state.videoProvider = document.getElementById('video-provider').value;
    localStorage.setItem('ff_provider', state.videoProvider);
    closeModal();
    toast('Settings saved', 'success');
  });
}

function openModal() {
  document.getElementById('key-replicate').value = getKey('replicate');
  document.getElementById('key-runway').value    = getKey('runway');
  document.getElementById('video-provider').value = state.videoProvider;
  document.getElementById('modal-settings').classList.remove('hidden');
}

function closeModal() {
  document.getElementById('modal-settings').classList.add('hidden');
}

function loadSettings() {
  state.videoProvider = localStorage.getItem('ff_provider') || 'runway';
}

function getKey(name) { return localStorage.getItem(`ff_key_${name}`) || ''; }
function saveKey(name, val) { localStorage.setItem(`ff_key_${name}`, val); }

/* ─── Helpers ─── */
function resizeImage(dataURL, maxSize, cb) {
  const img = new Image();
  img.onload = () => {
    let w = img.width, h = img.height;
    if (w > maxSize || h > maxSize) {
      if (w > h) { h = Math.round(h * maxSize / w); w = maxSize; }
      else       { w = Math.round(w * maxSize / h); h = maxSize; }
    }
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    cb(c.toDataURL('image/jpeg', 0.88));
  };
  img.src = dataURL;
}

function downloadDataURL(url, filename) {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

let toastTimer = null;
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type}`;
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 3000);
}
