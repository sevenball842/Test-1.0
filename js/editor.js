/* Photo editor — canvas-based adjustments, filters, crop, transform */

const Editor = (() => {
  let canvas, ctx;
  let sourceImage = null;
  let rotation = 0;
  let flipH = false, flipV = false;
  let activeFilter = 'none';
  let cropRatio = 'free';
  let cropBox = null;
  let isDraggingCrop = false;
  let cropStart = { x: 0, y: 0 };

  const adjustments = { brightness: 0, contrast: 0, saturation: 0, sharpness: 0 };

  const FILTERS = [
    { id: 'none',     label: 'Original',  fn: null },
    { id: 'vivid',    label: 'Vivid',     fn: (d) => applySatBoost(d, 1.5) },
    { id: 'cool',     label: 'Cool',      fn: (d) => applyColorShift(d, -10, 0, 20) },
    { id: 'warm',     label: 'Warm',      fn: (d) => applyColorShift(d, 20, 5, -10) },
    { id: 'grayscale',label: 'B&W',       fn: applyGrayscale },
    { id: 'sepia',    label: 'Sepia',     fn: applySepia },
    { id: 'fade',     label: 'Fade',      fn: applyFade },
    { id: 'punch',    label: 'Punch',     fn: (d) => applyPunch(d) },
    { id: 'dramatic', label: 'Dramatic',  fn: applyDramatic },
  ];

  function init(canvasEl) {
    canvas = canvasEl;
    ctx = canvas.getContext('2d');
    buildFilterThumbs();
    bindControls();
  }

  function loadImage(img) {
    sourceImage = img;
    rotation = 0; flipH = false; flipV = false;
    activeFilter = 'none';
    cropBox = null;
    Object.assign(adjustments, { brightness: 0, contrast: 0, saturation: 0, sharpness: 0 });
    resetSliders();
    setActiveFilter('none');
    render();
  }

  function render() {
    if (!sourceImage) return;
    const rad = (rotation * Math.PI) / 180;
    const sw = sourceImage.naturalWidth || sourceImage.width;
    const sh = sourceImage.naturalHeight || sourceImage.height;
    const rotated = rotation % 180 !== 0;
    canvas.width  = rotated ? sh : sw;
    canvas.height = rotated ? sw : sh;

    ctx.save();
    ctx.translate(canvas.width / 2, canvas.height / 2);
    ctx.rotate(rad);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);
    ctx.drawImage(sourceImage, -sw / 2, -sh / 2, sw, sh);
    ctx.restore();

    let imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    applyAdjustments(imgData);
    const filterDef = FILTERS.find(f => f.id === activeFilter);
    if (filterDef && filterDef.fn) filterDef.fn(imgData.data);
    if (adjustments.sharpness > 0) sharpen(imgData, canvas.width, canvas.height, adjustments.sharpness);
    ctx.putImageData(imgData, 0, 0);

    if (cropBox) drawCropOverlay();
  }

  function applyAdjustments(imgData) {
    const d = imgData.data;
    const br = adjustments.brightness * 2.55;
    const con = adjustments.contrast;
    const conF = (259 * (con + 255)) / (255 * (259 - con));
    const sat = 1 + adjustments.saturation / 100;

    for (let i = 0; i < d.length; i += 4) {
      let r = d[i], g = d[i+1], b = d[i+2];
      // Brightness
      r += br; g += br; b += br;
      // Contrast
      r = conF * (r - 128) + 128;
      g = conF * (g - 128) + 128;
      b = conF * (b - 128) + 128;
      // Saturation
      const gray = 0.299 * r + 0.587 * g + 0.114 * b;
      r = gray + sat * (r - gray);
      g = gray + sat * (g - gray);
      b = gray + sat * (b - gray);

      d[i]   = clamp(r);
      d[i+1] = clamp(g);
      d[i+2] = clamp(b);
    }
  }

  function applyGrayscale(d) {
    for (let i = 0; i < d.length; i += 4) {
      const v = 0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2];
      d[i] = d[i+1] = d[i+2] = v;
    }
  }

  function applySepia(d) {
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i+1], b = d[i+2];
      d[i]   = clamp(r * .393 + g * .769 + b * .189);
      d[i+1] = clamp(r * .349 + g * .686 + b * .168);
      d[i+2] = clamp(r * .272 + g * .534 + b * .131);
    }
  }

  function applyFade(d) {
    for (let i = 0; i < d.length; i += 4) {
      d[i]   = clamp(d[i]   * .85 + 30);
      d[i+1] = clamp(d[i+1] * .85 + 28);
      d[i+2] = clamp(d[i+2] * .85 + 25);
    }
  }

  function applyDramatic(d) {
    for (let i = 0; i < d.length; i += 4) {
      const v = 0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2];
      const lum = v / 255;
      const boost = lum > 0.5 ? 1.2 : 0.8;
      d[i]   = clamp(d[i]   * boost);
      d[i+1] = clamp(d[i+1] * boost);
      d[i+2] = clamp(d[i+2] * boost);
    }
  }

  function applySatBoost(d, factor) {
    for (let i = 0; i < d.length; i += 4) {
      const gray = 0.299 * d[i] + 0.587 * d[i+1] + 0.114 * d[i+2];
      d[i]   = clamp(gray + factor * (d[i]   - gray));
      d[i+1] = clamp(gray + factor * (d[i+1] - gray));
      d[i+2] = clamp(gray + factor * (d[i+2] - gray));
    }
  }

  function applyColorShift(d, rShift, gShift, bShift) {
    for (let i = 0; i < d.length; i += 4) {
      d[i]   = clamp(d[i]   + rShift);
      d[i+1] = clamp(d[i+1] + gShift);
      d[i+2] = clamp(d[i+2] + bShift);
    }
  }

  function applyPunch(d) {
    const cf = (259 * (60 + 255)) / (255 * (259 - 60));
    for (let i = 0; i < d.length; i += 4) {
      d[i]   = clamp(cf * (d[i]   - 128) + 128);
      d[i+1] = clamp(cf * (d[i+1] - 128) + 128);
      d[i+2] = clamp(cf * (d[i+2] - 128) + 128);
    }
    applySatBoost(d, 1.3);
  }

  function sharpen(imgData, w, h, strength) {
    const kernel = [0, -1, 0, -1, 4 + (strength * 0.8), -1, 0, -1, 0];
    const src = new Uint8ClampedArray(imgData.data);
    const d = imgData.data;
    for (let y = 1; y < h - 1; y++) {
      for (let x = 1; x < w - 1; x++) {
        for (let c = 0; c < 3; c++) {
          let sum = 0;
          for (let ky = -1; ky <= 1; ky++)
            for (let kx = -1; kx <= 1; kx++)
              sum += src[((y + ky) * w + (x + kx)) * 4 + c] * kernel[(ky + 1) * 3 + (kx + 1)];
          d[(y * w + x) * 4 + c] = clamp(src[(y * w + x) * 4 + c] + sum * strength * 0.1);
        }
      }
    }
  }

  function clamp(v) { return Math.max(0, Math.min(255, Math.round(v))); }

  /* ─── Crop ─── */
  function drawCropOverlay() {
    if (!cropBox) return;
    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    const { x, y, w, h } = cropBox;
    ctx.fillRect(0, 0, canvas.width, y);
    ctx.fillRect(0, y + h, canvas.width, canvas.height - y - h);
    ctx.fillRect(0, y, x, h);
    ctx.fillRect(x + w, y, canvas.width - x - w, h);
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);
    // Rule of thirds grid
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = 'rgba(255,255,255,0.3)';
    ctx.beginPath();
    for (let i = 1; i <= 2; i++) {
      ctx.moveTo(x + (w / 3) * i, y);
      ctx.lineTo(x + (w / 3) * i, y + h);
      ctx.moveTo(x, y + (h / 3) * i);
      ctx.lineTo(x + w, y + (h / 3) * i);
    }
    ctx.stroke();
    ctx.restore();
  }

  function startCrop(e) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    cropStart.x = (e.clientX - rect.left) * scaleX;
    cropStart.y = (e.clientY - rect.top)  * scaleY;
    isDraggingCrop = true;
    cropBox = { x: cropStart.x, y: cropStart.y, w: 0, h: 0 };
  }

  function updateCrop(e) {
    if (!isDraggingCrop) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    let cx = (e.clientX - rect.left) * scaleX;
    let cy = (e.clientY - rect.top)  * scaleY;
    let w = cx - cropStart.x;
    let h = cy - cropStart.y;

    if (cropRatio !== 'free') {
      const [rw, rh] = cropRatio.split(':').map(Number);
      const aspect = rw / rh;
      h = Math.abs(w) / aspect * Math.sign(w) * Math.sign(h) || h;
    }

    cropBox = {
      x: w < 0 ? cx : cropStart.x,
      y: h < 0 ? cy : cropStart.y,
      w: Math.abs(w),
      h: Math.abs(h),
    };
    render();
  }

  function endCrop() { isDraggingCrop = false; }

  function applyCrop() {
    if (!cropBox || cropBox.w < 4 || cropBox.h < 4) return;
    const tmp = document.createElement('canvas');
    tmp.width  = cropBox.w;
    tmp.height = cropBox.h;
    tmp.getContext('2d').drawImage(canvas, cropBox.x, cropBox.y, cropBox.w, cropBox.h, 0, 0, cropBox.w, cropBox.h);
    sourceImage = new Image();
    sourceImage.onload = () => { cropBox = null; rotation = 0; flipH = false; flipV = false; render(); };
    sourceImage.src = tmp.toDataURL();
  }

  function setActiveFilter(id) {
    activeFilter = id;
    document.querySelectorAll('.filter-thumb').forEach(el => {
      el.classList.toggle('active', el.dataset.filter === id);
    });
  }

  function buildFilterThumbs() {
    const container = document.getElementById('filter-list');
    if (!container) return;
    container.innerHTML = '';
    FILTERS.forEach(f => {
      const wrap = document.createElement('div');
      wrap.className = 'filter-thumb';
      wrap.dataset.filter = f.id;
      const c = document.createElement('canvas');
      c.width = 60; c.height = 60;
      const label = document.createElement('span');
      label.textContent = f.label;
      wrap.appendChild(c);
      wrap.appendChild(label);
      wrap.addEventListener('click', () => { setActiveFilter(f.id); render(); updateFilterThumb(wrap, c, f); });
      container.appendChild(wrap);
    });
    if (activeFilter === 'none') {
      document.querySelector('.filter-thumb').classList.add('active');
    }
  }

  function updateFilterThumbs() {
    if (!sourceImage) return;
    document.querySelectorAll('.filter-thumb').forEach(wrap => {
      const c = wrap.querySelector('canvas');
      const id = wrap.dataset.filter;
      const f = FILTERS.find(x => x.id === id);
      if (f) updateFilterThumb(wrap, c, f);
    });
  }

  function updateFilterThumb(wrap, c, f) {
    if (!sourceImage) return;
    const ctx2 = c.getContext('2d');
    ctx2.drawImage(sourceImage, 0, 0, 60, 60);
    if (f.fn) {
      const id = ctx2.getImageData(0, 0, 60, 60);
      f.fn(id.data);
      ctx2.putImageData(id, 0, 0);
    }
  }

  function bindControls() {
    const sliders = [
      { id: 'sl-brightness', key: 'brightness', label: 'val-brightness' },
      { id: 'sl-contrast',   key: 'contrast',   label: 'val-contrast' },
      { id: 'sl-saturation', key: 'saturation', label: 'val-saturation' },
      { id: 'sl-sharpness',  key: 'sharpness',  label: 'val-sharpness' },
    ];
    sliders.forEach(({ id, key, label }) => {
      const el = document.getElementById(id);
      if (!el) return;
      el.addEventListener('input', () => {
        adjustments[key] = +el.value;
        document.getElementById(label).textContent = el.value;
        render();
      });
    });

    document.getElementById('btn-rot-left')?.addEventListener('click', () => { rotation = (rotation - 90 + 360) % 360; render(); });
    document.getElementById('btn-rot-right')?.addEventListener('click', () => { rotation = (rotation + 90) % 360; render(); });
    document.getElementById('btn-flip-h')?.addEventListener('click', () => { flipH = !flipH; render(); });
    document.getElementById('btn-flip-v')?.addEventListener('click', () => { flipV = !flipV; render(); });

    document.querySelectorAll('[data-ratio]').forEach(btn => {
      btn.addEventListener('click', () => {
        cropRatio = btn.dataset.ratio;
        document.querySelectorAll('[data-ratio]').forEach(b => b.classList.remove('active-tool'));
        btn.classList.add('active-tool');
      });
    });

    document.getElementById('btn-apply-crop')?.addEventListener('click', applyCrop);

    canvas.addEventListener('mousedown', startCrop);
    canvas.addEventListener('mousemove', updateCrop);
    canvas.addEventListener('mouseup', endCrop);
    canvas.addEventListener('touchstart', e => startCrop(e.touches[0]), { passive: true });
    canvas.addEventListener('touchmove',  e => { e.preventDefault(); updateCrop(e.touches[0]); }, { passive: false });
    canvas.addEventListener('touchend',   endCrop);
  }

  function resetSliders() {
    ['sl-brightness','sl-contrast','sl-saturation','sl-sharpness'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.value = 0;
    });
    ['val-brightness','val-contrast','val-saturation','val-sharpness'].forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '0';
    });
  }

  function getDataURL(type = 'image/jpeg', quality = 0.92) {
    return canvas.toDataURL(type, quality);
  }

  function getBlob(cb, type = 'image/jpeg', quality = 0.92) {
    canvas.toBlob(cb, type, quality);
  }

  return { init, loadImage, render, getDataURL, getBlob, updateFilterThumbs };
})();
