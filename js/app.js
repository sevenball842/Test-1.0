/* App — gallery state, view routing, event wiring */

const App = (() => {
  let photos = [];       // { id, name, src }
  let activePhoto = null;
  let currentView = 'gallery';  // 'gallery' | 'editor'
  let editorTab = 'edit';       // 'edit' | 'video'
  let isGenerating = false;
  let progressTimer = null;

  function init() {
    loadPhotosFromStorage();
    Editor.init(document.getElementById('main-canvas'));
    VideoGen.init();
    wireGallery();
    wireEditor();
    wireSettings();
    renderGallery();
  }

  /* ─── Gallery ─── */
  function wireGallery() {
    document.getElementById('file-input').addEventListener('change', e => {
      const files = Array.from(e.target.files);
      files.forEach(file => loadFile(file));
      e.target.value = '';
    });
  }

  function loadFile(file) {
    const reader = new FileReader();
    reader.onload = ev => {
      const photo = { id: Date.now() + Math.random(), name: file.name, src: ev.target.result };
      photos.push(photo);
      savePhotosToStorage();
      renderGallery();
    };
    reader.readAsDataURL(file);
  }

  function renderGallery() {
    const grid = document.getElementById('gallery-grid');
    const empty = document.getElementById('gallery-empty');
    grid.innerHTML = '';
    if (photos.length === 0) {
      empty.classList.remove('hidden');
      return;
    }
    empty.classList.add('hidden');
    photos.forEach(photo => {
      const item = document.createElement('div');
      item.className = 'gallery-item';
      item.innerHTML = `
        <img src="${photo.src}" alt="${escHtml(photo.name)}" loading="lazy" />
        <div class="item-overlay"><span class="item-name">${escHtml(photo.name)}</span></div>
        <button class="item-delete" data-id="${photo.id}" title="Remove">
          <svg viewBox="0 0 24 24"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>
        </button>
      `;
      item.querySelector('img').addEventListener('click', () => openEditor(photo));
      item.querySelector('.item-delete').addEventListener('click', e => {
        e.stopPropagation();
        deletePhoto(photo.id);
      });
      grid.appendChild(item);
    });
  }

  function deletePhoto(id) {
    photos = photos.filter(p => p.id !== id);
    savePhotosToStorage();
    renderGallery();
  }

  function openEditor(photo) {
    activePhoto = photo;
    currentView = 'editor';
    editorTab = 'edit';

    document.getElementById('view-gallery').classList.remove('active');
    document.getElementById('view-editor').classList.add('active');
    document.getElementById('btn-back').classList.remove('hidden');
    document.getElementById('view-tabs').classList.remove('hidden');

    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.view === 'edit'));
    document.getElementById('panel-edit').classList.remove('hidden');
    document.getElementById('panel-video').classList.add('hidden');

    const img = new Image();
    img.onload = () => {
      Editor.loadImage(img);
      Editor.updateFilterThumbs();
    };
    img.src = photo.src;

    // Pre-fill video source
    document.getElementById('video-source-img').src = photo.src;
  }

  /* ─── Editor wiring ─── */
  function wireEditor() {
    document.getElementById('btn-back').addEventListener('click', goToGallery);

    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', () => switchTab(btn.dataset.view));
    });

    document.getElementById('btn-reset').addEventListener('click', () => {
      if (!activePhoto) return;
      const img = new Image();
      img.onload = () => { Editor.loadImage(img); Editor.updateFilterThumbs(); };
      img.src = activePhoto.src;
    });

    document.getElementById('btn-download-photo').addEventListener('click', () => {
      Editor.getBlob(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = activePhoto ? activePhoto.name.replace(/\.[^.]+$/, '') + '_edited.jpg' : 'edited.jpg';
        a.click();
        URL.revokeObjectURL(a.href);
      });
    });

    document.getElementById('btn-generate').addEventListener('click', startGenerate);

    document.getElementById('btn-download-video').addEventListener('click', () => {
      const video = document.getElementById('video-result');
      if (!video.src) return;
      const a = document.createElement('a');
      a.href = video.src;
      a.download = 'frameforge_video.mp4';
      a.click();
    });
  }

  function goToGallery() {
    currentView = 'gallery';
    document.getElementById('view-gallery').classList.add('active');
    document.getElementById('view-editor').classList.remove('active');
    document.getElementById('btn-back').classList.add('hidden');
    document.getElementById('view-tabs').classList.add('hidden');
  }

  function switchTab(tab) {
    editorTab = tab;
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b.dataset.view === tab));
    document.getElementById('panel-edit').classList.toggle('hidden', tab !== 'edit');
    document.getElementById('panel-video').classList.toggle('hidden', tab !== 'video');
    if (tab === 'video') {
      // Sync latest edited frame to video source
      document.getElementById('video-source-img').src = Editor.getDataURL();
    }
  }

  /* ─── Video Generation ─── */
  async function startGenerate() {
    if (isGenerating) return;
    const prompt = document.getElementById('video-prompt').value.trim();
    if (!prompt) { toast('Enter a motion prompt first.', 'error'); return; }

    const imageData = Editor.getDataURL('image/jpeg', 0.92);
    const btn = document.getElementById('btn-generate');
    const progressWrap = document.getElementById('video-progress');
    const progressFill = document.getElementById('progress-fill');
    const progressStatus = document.getElementById('progress-status');

    isGenerating = true;
    btn.disabled = true;
    progressWrap.classList.remove('hidden');
    document.getElementById('video-result-wrap').classList.add('hidden');

    let fakeProgress = 0;
    progressTimer = setInterval(() => {
      fakeProgress = Math.min(fakeProgress + 1.2, 88);
      progressFill.style.width = fakeProgress + '%';
      if (fakeProgress < 30) progressStatus.textContent = 'Uploading photo…';
      else if (fakeProgress < 60) progressStatus.textContent = 'Generating frames…';
      else progressStatus.textContent = 'Finalizing video…';
    }, 1000);

    try {
      const videoUrl = await VideoGen.generate(imageData, prompt);
      clearInterval(progressTimer);
      progressFill.style.width = '100%';
      progressStatus.textContent = 'Done!';
      await new Promise(r => setTimeout(r, 600));
      progressWrap.classList.add('hidden');

      const videoEl = document.getElementById('video-result');
      videoEl.src = videoUrl;
      document.getElementById('video-result-wrap').classList.remove('hidden');
      toast('Video generated successfully!', 'success');
    } catch (err) {
      clearInterval(progressTimer);
      progressWrap.classList.add('hidden');
      toast(err.message || 'Generation failed', 'error');
    } finally {
      isGenerating = false;
      btn.disabled = false;
      progressFill.style.width = '0%';
    }
  }

  /* ─── Settings Modal ─── */
  function wireSettings() {
    document.getElementById('btn-settings').addEventListener('click', openSettings);
    document.getElementById('btn-close-settings').addEventListener('click', closeSettings);
    document.getElementById('btn-save-settings').addEventListener('click', saveSettings);
    document.getElementById('modal-settings').addEventListener('click', e => {
      if (e.target === e.currentTarget) closeSettings();
    });
  }

  function openSettings() {
    document.getElementById('key-runway').value   = VideoGen.getApiKey('runway');
    document.getElementById('key-replicate').value = VideoGen.getApiKey('replicate');
    document.getElementById('modal-settings').classList.remove('hidden');
  }

  function closeSettings() {
    document.getElementById('modal-settings').classList.add('hidden');
  }

  function saveSettings() {
    VideoGen.saveApiKey('runway',    document.getElementById('key-runway').value.trim());
    VideoGen.saveApiKey('replicate', document.getElementById('key-replicate').value.trim());
    closeSettings();
    toast('Settings saved', 'success');
  }

  /* ─── Persistence ─── */
  function savePhotosToStorage() {
    try {
      // Only store up to 30 photos to avoid storage limits
      const toSave = photos.slice(-30).map(p => ({ id: p.id, name: p.name, src: p.src }));
      localStorage.setItem('ff_photos', JSON.stringify(toSave));
    } catch {}
  }

  function loadPhotosFromStorage() {
    try {
      const raw = localStorage.getItem('ff_photos');
      if (raw) photos = JSON.parse(raw);
    } catch {}
  }

  /* ─── Toast ─── */
  function toast(msg, type = '') {
    const el = document.createElement('div');
    el.className = `toast ${type}`;
    el.textContent = msg;
    document.body.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => el.classList.add('show')));
    setTimeout(() => {
      el.classList.remove('show');
      setTimeout(() => el.remove(), 400);
    }, 3000);
  }

  function escHtml(s) {
    return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }

  document.addEventListener('DOMContentLoaded', init);
})();
