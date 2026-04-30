/**
 * @file Client-side PDF export — captures each `.slide` with html2canvas,
 * stitches them into a 1600×900 landscape PDF via jsPDF. Both libs are
 * lazy-loaded on first Download click (saves ~280 KB on initial page load).
 * Public API: `downloadPDF` (↓ Download buttons), `closePDFLoader` (× button).
 */

/**
 * Preloads an image so it's cached before html2canvas tries to capture it.
 * @param {string} src
 * @returns {Promise<HTMLImageElement|null>} resolves null on error
 */
function preloadImage(src) {
  return new Promise(function(resolve) {
    let img = new Image();
    img.onload = function() { resolve(img); };
    img.onerror = function() { resolve(null); };
    img.src = src;
  });
}

/**
 * Lazy-loads html2canvas + jsPDF on first Download click. Memoized so
 * subsequent clicks reuse the same promise. Saves ~280 KB on initial load.
 * @returns {Promise<unknown[]>}
 */
function loadPDFDeps() {
  if (window.__pdfDepsPromise) return window.__pdfDepsPromise;
  function loadScript(src) {
    return new Promise(function(resolve, reject) {
      let s = document.createElement('script');
      s.src = src;
      s.async = true;
      s.onload = resolve;
      s.onerror = function() { reject(new Error('Failed to load ' + src)); };
      document.head.appendChild(s);
    });
  }
  window.__pdfDepsPromise = Promise.all([
    typeof html2canvas !== 'undefined'
      ? Promise.resolve()
      : loadScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js'),
    (window.jspdf && window.jspdf.jsPDF) || window.jsPDF
      ? Promise.resolve()
      : loadScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js')
  ]);
  return window.__pdfDepsPromise;
}

/**
 * Generates and saves a PDF of all slides. Triggered by the ↓ Download
 * button in every slide's meta-bar. Shows a fullscreen loader during
 * rendering, swaps iframes/videos with placeholder images so html2canvas
 * can capture them, restores DOM after.
 * @param {HTMLButtonElement} [btn] The button that triggered the click
 *                                 (currently unused but kept for API parity).
 */
async function downloadPDF(btn) {
  /* Safety: if the cover intro is still playing, hard-skip it so the cover
     slide is in its final state before any html2canvas capture runs. */
  if (typeof window.__coverIntroForceFinish === 'function') {
    window.__coverIntroForceFinish();
  }
  let loading = document.getElementById('pdf-loading');
  let loadingText = document.getElementById('pdf-loading-text');
  let titleEl = document.getElementById('pdf-loading-title');
  let hintEl  = document.getElementById('pdf-loading-hint');
  let progressEl = document.getElementById('pdf-loading-progress');
  let allBtns = document.querySelectorAll('.dl-link');
  function setProgress(v) {
    if (progressEl) progressEl.style.setProperty('--pdf-progress', Math.max(0, Math.min(1, v)));
  }

  let t = window.__i18n || function(k){ return k; };
  loading.classList.add('active');
  titleEl.textContent = t('pdfTitle');
  loadingText.textContent = t('pdfLoadingEng');
  hintEl.textContent = '';
  setProgress(0.02);
  allBtns.forEach(function(b) { b.disabled = true; });

  /* Lazy-load html2canvas + jsPDF the first time. ~280 KB saved otherwise. */
  try {
    await loadPDFDeps();
  } catch (e) {
    titleEl.textContent = t('pdfNetErr');
    loadingText.textContent = t('pdfNetErrDesc');
    hintEl.textContent = t('pdfNetErrHint');
    return;
  }
  loadingText.textContent = t('pdfPreparing');
  setProgress(0.06);

  /* Preload placeholder images */
  await Promise.all([
    preloadImage('images/gaussian-pdf.jpg'),
    preloadImage('images/hackathon-video-pdf.png'),
    preloadImage('images/excalibur-cover.jpg'),
    preloadImage('images/hadone-cover.jpg'),
    preloadImage('images/track-pdf-2.jpg'),
    preloadImage('images/track-pdf-3.jpg')
  ]);

  /* Track Record media strip — swap any cell with data-pdf-image to an
     <img> overlay during PDF capture, then restore. Web stays untouched. */
  let pdfCellRestores = [];
  let pdfCells = Array.prototype.slice.call(document.querySelectorAll('.track-media-cell[data-pdf-image]'));
  for (let pc = 0; pc < pdfCells.length; pc++) {
    let cell = pdfCells[pc];
    let pdfImgSrc = cell.getAttribute('data-pdf-image');
    if (!pdfImgSrc) continue;
    let pdfImg = document.createElement('img');
    pdfImg.src = pdfImgSrc;
    pdfImg.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;z-index:2;';
    await new Promise(function(r){ pdfImg.onload = r; pdfImg.onerror = r; });
    cell.appendChild(pdfImg);
    pdfCellRestores.push({ cell: cell, img: pdfImg });
  }

  /* Swap live iframes for preloaded images in the real DOM */
  let iframes = Array.prototype.slice.call(document.querySelectorAll('iframe'));
  let restores = [];
  for (let i = 0; i < iframes.length; i++) {
    let iframe = iframes[i];
    let src = iframe.src || '';
    let id  = iframe.id || '';
    let imgSrc = null;
    if (src.indexOf('luma') !== -1) imgSrc = 'images/gaussian-pdf.jpg';
    else if (id === 'party-video') imgSrc = 'images/hadone-cover.jpg';
    else if (src.indexOf('youtube') !== -1) imgSrc = 'images/hackathon-video-pdf.png';
    if (!imgSrc) continue;

    let img = document.createElement('img');
    img.src = imgSrc;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
    await new Promise(function(r) { img.onload = r; img.onerror = r; });

    let originalDisplay = iframe.style.display;
    iframe.style.display = 'none';
    iframe.parentNode.insertBefore(img, iframe);
    restores.push({ iframe: iframe, img: img, display: originalDisplay });
  }

  /* Swap <video> elements for cover images (Excalibur) */
  let videos = Array.prototype.slice.call(document.querySelectorAll('video'));
  let videoRestores = [];
  for (let v = 0; v < videos.length; v++) {
    let vid = videos[v];
    let cover = vid.getAttribute('poster') || 'images/excalibur-cover.jpg';
    let vimg = document.createElement('img');
    vimg.src = cover;
    vimg.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
    await new Promise(function(r) { vimg.onload = r; vimg.onerror = r; });
    let vDisplay = vid.style.display;
    vid.style.display = 'none';
    vid.parentNode.insertBefore(vimg, vid);
    videoRestores.push({ video: vid, img: vimg, display: vDisplay });
  }

  /* Switch to PDF sizing (fixed 1920×1080 per slide). Also force the
     LIGHT palette during capture: html2canvas captures the rendered
     pixels, so if the user is in dark mode, light text on a dark
     background turns into invisible-on-light once we force the
     beige paper background. We snapshot the current theme and restore
     it after the capture is done. */
  let savedTheme = document.documentElement.getAttribute('data-theme');
  document.documentElement.setAttribute('data-theme', 'light');
  document.body.classList.add('pdf-capture');
  await new Promise(function(r) { setTimeout(r, 400); });

  let slides = document.querySelectorAll('.slide');

  /* Output config — 1600×900 instead of 1920×1080 (still beautiful in any
     PDF viewer, ~30% faster to render and ~40% smaller file). JPEG 0.78
     quality is visually identical to 0.82 in PDF context. */
  let PDF_W = 1600, PDF_H = 900, JPEG_Q = 0.78;
  try {
    let JSPDFCtor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
    let pdf = new JSPDFCtor({
      orientation: 'landscape',
      unit: 'px',
      format: [PDF_W, PDF_H],
      hotfixes: ['px_scaling'],
      compress: true
    });

    for (let j = 0; j < slides.length; j++) {
      loadingText.textContent = t('pdfRendering', { n: (j + 1), total: slides.length });
      setProgress(0.15 + 0.8 * ((j + 1) / slides.length));
      let canvas = await html2canvas(slides[j], {
        scale: 1,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#F4F1EA',
        logging: false,
        windowWidth: 1920,
        windowHeight: 1080,
        imageTimeout: 5000,
        removeContainer: true
      });
      let imgData = canvas.toDataURL('image/jpeg', JPEG_Q);
      if (j > 0) pdf.addPage([PDF_W, PDF_H], 'landscape');
      pdf.addImage(imgData, 'JPEG', 0, 0, PDF_W, PDF_H);
    }

    loadingText.textContent = t('pdfSaveDialog');
    setProgress(0.98);
    pdf.save('TSSRCT-Pitch-2026.pdf');
    setProgress(1);
    titleEl.textContent = t('pdfReady');
    loadingText.textContent = t('pdfReadyDesc');
    hintEl.textContent = t('pdfReadyHint');
    /* Swap to "ready" state → hide the spinner (done, no need to spin anymore) */
    loading.classList.add('ready');

    /* Keep the spinner turning — loader stays visible until user closes
       it via × or ESC, after they've handled the native save dialog. */
    document.body.classList.remove('pdf-capture');
    if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
    else document.documentElement.removeAttribute('data-theme');
    allBtns.forEach(function(b) { b.disabled = false; });
    restores.forEach(function(r) {
      r.img.remove();
      r.iframe.style.display = r.display;
    });
    videoRestores.forEach(function(r) {
      r.img.remove();
      r.video.style.display = r.display;
    });
    pdfCellRestores.forEach(function(r) { r.img.remove(); });
    restores = [];
    videoRestores = [];
    pdfCellRestores = [];
    return;
  } catch (err) {
    console.error('PDF generation error:', err);
    /* Revert DOM but KEEP loader visible so user can see the error */
    restores.forEach(function(r) {
      r.img.remove();
      r.iframe.style.display = r.display;
    });
    videoRestores.forEach(function(r) {
      r.img.remove();
      r.video.style.display = r.display;
    });
    pdfCellRestores.forEach(function(r) { r.img.remove(); });
    document.body.classList.remove('pdf-capture');
    if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
    else document.documentElement.removeAttribute('data-theme');
    allBtns.forEach(function(b) { b.disabled = false; });
    if (titleEl) titleEl.textContent = t('pdfErr');
    if (loadingText) loadingText.textContent = t('pdfErrDesc');
    if (hintEl) hintEl.textContent = (err && err.message) ? err.message : t('pdfErrHint');
  }
}

/* Dismiss the PDF loader manually (× button or ESC) */
/**
 * Dismisses the PDF loading overlay. Called from the × button on the
 * loader and from the ESC key handler. Resets the loader text to its
 * initial state for the next download.
 */
function closePDFLoader() {
  let loading = document.getElementById('pdf-loading');
  if (!loading) return;
  loading.classList.remove('active');
  loading.classList.remove('ready');
  let titleEl = document.getElementById('pdf-loading-title');
  let txtEl   = document.getElementById('pdf-loading-text');
  let hintEl  = document.getElementById('pdf-loading-hint');
  let progEl  = document.getElementById('pdf-loading-progress');
  let t = window.__i18n || function(k){ return k; };
  if (titleEl) titleEl.textContent = t('pdfTitle');
  if (txtEl)   txtEl.textContent   = t('pdfPreparing');
  if (hintEl)  hintEl.textContent  = '';
  if (progEl)  progEl.style.setProperty('--pdf-progress', 0);
}

