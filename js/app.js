/* ─── State ─── */
const state = {
  editImageData: null,
  videoImageData: null,
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
      resizeImage(ev.target.result, 512, compressed => {
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

  swapBtn.addEventListener('click', e => { e.stopPropagation(); fileInput.click(); });
}

/* ─── Chips ─── */
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

/* ─── Segmented controls ─── */
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
  if (section === 'edit') document.getElementById('btn-edit').disabled = !state.editImageData;
  else document.getElementById('btn-generate').disabled = !state.videoImageData;
}

/* ─── Action buttons ─── */
function wireActionButtons() {
  document.getElementById('btn-edit').addEventListener('click', handleEdit);
  document.getElementById('btn-generate').addEventListener('click', handleVideo);

  document.getElementById('btn-save-edit').addEventListener('click', () => {
    const img = document.getElementById('edit-result-img');
    if (!img.src) return;
    downloadURL(img.src, 'frameforge-edit.jpg');
  });

  document.getElementById('btn-save-video').addEventListener('click', () => {
    const v = document.getElementById('video-result');
    if (!v.src) return;
    downloadURL(v.src, 'frameforge-video.mp4');
  });

  document.getElementById('btn-use-for-video').addEventListener('click', () => {
    const src = document.getElementById('edit-result-img').src;
    if (!src) return;
    state.videoImageData = src;
    const vp = document.getElementById('video-preview');
    vp.src = src;
    vp.classList.remove('hidden');
    document.getElementById('video-placeholder').classList.add('hidden');
    document.getElementById('video-swap-btn').classList.remove('hidden');
    document.getElementById('video-upload-box').classList.add('has-image');
    updateActionBtn('video');
    document.getElementById('section-video').scrollIntoView({ behavior: 'smooth' });
    toast('Photo set as video source', 'success');
  });
}

/* ─── Photo Edit ─── */
async function handleEdit() {
  const prompt = document.getElementById('edit-prompt').value.trim();
  if (!prompt) { toast('Describe what you want to change first', 'error'); return; }
  if (!state.editImageData) { toast('Add a photo first', 'error'); return; }
  const apiKey = getKey('replicate');
  if (!apiKey) { toast('Add your Replicate API key in Settings ⚙️', 'error'); return; }

  setLoading('edit', true);
  try {
    // Step 1 — create prediction via server-side proxy
    const startRes = await apiCall('/api/edit', { image: state.editImageData, prompt, apiKey });
    if (startRes.error) throw new Error(startRes.error);
    if (!startRes.id) throw new Error('No prediction ID — check your API key');

    // Step 2 — poll until done
    const output = await pollUntilDone(startRes.id, apiKey, 'replicate', 'edit');
    const imageUrl = Array.isArray(output) ? output[0] : output;
    if (!imageUrl) throw new Error('No output image returned');

    document.getElementById('edit-result-img').src = imageUrl;
    document.getElementById('edit-result-wrap').classList.remove('hidden');
    toast('Edit applied!', 'success');
  } catch (err) {
    toast(err.message || 'Edit failed', 'error');
  } finally {
    setLoading('edit', false);
  }
}

/* ─── Video Generation ─── */
async function handleVideo() {
  const prompt = document.getElementById('video-prompt').value.trim();
  if (!prompt) { toast('Describe the motion first', 'error'); return; }
  if (!state.videoImageData) { toast('Add a photo first', 'error'); return; }
  const provider = state.videoProvider;
  const apiKey = getKey(provider === 'runway' ? 'runway' : 'replicate');
  if (!apiKey) {
    toast(`Add your ${provider === 'runway' ? 'Runway ML' : 'Replicate'} API key in Settings ⚙️`, 'error');
    return;
  }

  setLoading('video', true);
  try {
    // Step 1 — start generation via proxy
    const startRes = await apiCall('/api/video', {
      image: state.videoImageData, prompt, apiKey, provider,
      duration: state.videoDuration, ratio: state.videoRatio,
    });
    if (startRes.error) throw new Error(startRes.error);

    // Runway returns { id } at top level; Replicate also returns { id }
    const taskId = startRes.id;
    if (!taskId) throw new Error('No task ID returned — check your API key');

    // Step 2 — poll
    const output = await pollUntilDone(taskId, apiKey, provider, 'video');
    const videoUrl = Array.isArray(output) ? output[0] : output;
    if (!videoUrl) throw new Error('No output video returned');

    const videoEl = document.getElementById('video-result');
    videoEl.src = videoUrl;
    document.getElementById('video-result-wrap').classList.remove('hidden');
    toast('Video ready!', 'success');
  } catch (err) {
    toast(err.message || 'Generation failed', 'error');
  } finally {
    setLoading('video', false);
  }
}

/* ─── Shared poll loop (calls /api/poll proxy) ─── */
async function pollUntilDone(id, apiKey, provider, section) {
  const STATUSES_DONE    = ['succeeded', 'SUCCEEDED'];
  const STATUSES_FAILED  = ['failed', 'FAILED', 'canceled', 'CANCELED'];

  for (let attempt = 0; attempt < 120; attempt++) {
    await delay(3000);
    const data = await apiCall('/api/poll', { id, apiKey, provider });

    const pct = Math.min((attempt / 50) * 90, 88);
    updateProgress(section, pct, data);

    if (data.error) throw new Error(data.error);

    const status = data.status;
    if (STATUSES_DONE.includes(status)) {
      // Runway output is in data.output[]; Replicate in data.output
      return data.output;
    }
    if (STATUSES_FAILED.includes(status)) {
      throw new Error(data.failure || data.error || 'Generation failed');
    }
  }
  throw new Error('Timed out after 6 minutes — try again');
}

/* ─── Generic API proxy call ─── */
async function apiCall(path, body) {
  let res;
  try {
    res = await fetch(path, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch (err) {
    // fetch itself failed — likely not on Vercel yet (GitHub Pages doesn't have /api)
    throw new Error('API proxy not available. Deploy to Vercel to enable AI features — see setup instructions below.');
  }

  if (!res.ok && res.status !== 422) {
    let msg = `Server error ${res.status}`;
    try { const e = await res.json(); msg = e.error || e.detail || msg; } catch {}
    throw new Error(msg);
  }

  return res.json();
}

/* ─── Loading states ─── */
let loadTimers = {};
function setLoading(section, on) {
  const btn  = document.getElementById(section === 'edit' ? 'btn-edit' : 'btn-generate');
  const wrap = document.getElementById(`${section}-progress`);
  const fill = document.getElementById(`${section}-progress-fill`);
  const text = document.getElementById(`${section}-progress-text`);

  btn.disabled = on || !( section === 'edit' ? state.editImageData : state.videoImageData );
  clearInterval(loadTimers[section]);

  if (on) {
    wrap.classList.remove('hidden');
    fill.style.width = '0%';
    let p = 0;
    loadTimers[section] = setInterval(() => {
      p = Math.min(p + 0.4, 80);
      fill.style.width = p + '%';
      if (p < 20) text.textContent = section === 'edit' ? 'Sending to AI…' : 'Starting generation…';
      else if (p < 50) text.textContent = section === 'edit' ? 'Applying edits…' : 'Generating frames…';
      else text.textContent = 'Almost done…';
    }, 1000);
  } else {
    fill.style.width = '100%';
    setTimeout(() => wrap.classList.add('hidden'), 500);
  }
}

function updateProgress(section, pct, data) {
  const fill = document.getElementById(`${section}-progress-fill`);
  const text = document.getElementById(`${section}-progress-text`);
  fill.style.width = pct + '%';
  const logLine = typeof data.logs === 'string' ? data.logs.trim().split('\n').pop() : null;
  if (logLine && logLine.length < 80) text.textContent = logLine;
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
  document.getElementById('key-replicate').value  = getKey('replicate');
  document.getElementById('key-runway').value     = getKey('runway');
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
      if (w >= h) { h = Math.round(h * maxSize / w); w = maxSize; }
      else        { w = Math.round(w * maxSize / h); h = maxSize; }
    }
    const c = document.createElement('canvas');
    c.width = w; c.height = h;
    c.getContext('2d').drawImage(img, 0, 0, w, h);
    cb(c.toDataURL('image/jpeg', 0.88));
  };
  img.src = dataURL;
}

function downloadURL(url, filename) {
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

let toastTimer = null;
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast ${type}`;
  requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 4000);
}
