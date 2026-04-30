/**
 * @file Client-side PDF export — captures each `.slide` with html2canvas
 * and stitches them into a 1600×900 landscape PDF via jsPDF.
 * Both libraries are lazy-loaded on first Download click.
 *
 * Public API: `downloadPDF` (↓ Download buttons), `closePDFLoader` (× button).
 */

/** Lazy-load html2canvas + jsPDF on first click — memoized. */
function loadPDFDeps() {
  if (window.__pdfDepsPromise) return window.__pdfDepsPromise;
  function loadScript(src) {
    return new Promise(function(resolve, reject) {
      var s = document.createElement('script');
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

/** Extract the first frame of a <video> as a JPEG data URL. */
function videoFirstFrame(video) {
  return new Promise(function(resolve) {
    function grab() {
      try {
        var c = document.createElement('canvas');
        c.width  = video.videoWidth  || 1280;
        c.height = video.videoHeight || 720;
        c.getContext('2d').drawImage(video, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.82));
      } catch (e) { resolve(null); }
    }
    if (video.readyState >= 2 && video.videoWidth > 0) { grab(); return; }
    var src = video.currentSrc || video.src || video.getAttribute('data-src');
    if (!src) { resolve(null); return; }
    var tmp = document.createElement('video');
    tmp.muted = true;
    tmp.playsInline = true;
    tmp.crossOrigin = 'anonymous';
    tmp.src = src;
    tmp.preload = 'auto';
    tmp.addEventListener('loadeddata', function() {
      try { tmp.currentTime = 0.05; } catch (_) {}
    });
    tmp.addEventListener('seeked', function() {
      try {
        var c = document.createElement('canvas');
        c.width  = tmp.videoWidth  || 1280;
        c.height = tmp.videoHeight || 720;
        c.getContext('2d').drawImage(tmp, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.82));
      } catch (e) { resolve(null); }
    });
    tmp.addEventListener('error', function() { resolve(null); });
    setTimeout(function() { resolve(null); }, 4000);
  });
}

/** Generates and saves a PDF of all slides. */
async function downloadPDF(/* btn */) {
  var loading     = document.getElementById('pdf-loading');
  var loadingText = document.getElementById('pdf-loading-text');
  var titleEl     = document.getElementById('pdf-loading-title');
  var hintEl      = document.getElementById('pdf-loading-hint');
  var progressEl  = document.getElementById('pdf-loading-progress');
  var allBtns     = document.querySelectorAll('.dl-link');

  function setProgress(v) {
    if (progressEl) progressEl.style.setProperty('--p', Math.max(0, Math.min(1, v)));
  }
  var t = window.__i18n || function(k){ return k; };

  loading.classList.add('active');
  titleEl.textContent     = t('pdfTitle');
  loadingText.textContent = t('pdfLoadingEng');
  hintEl.textContent      = '';
  setProgress(0.02);
  allBtns.forEach(function(b) { b.disabled = true; });

  try {
    await loadPDFDeps();
  } catch (e) {
    titleEl.textContent     = t('pdfNetErr');
    loadingText.textContent = t('pdfNetErrDesc');
    hintEl.textContent      = t('pdfNetErrHint');
    return;
  }

  loadingText.textContent = t('pdfPreparing');
  setProgress(0.06);

  /* For each <video>, replace it with a still <img> using its first frame.
     Restored at the end so the live page is not affected.               */
  var videos = Array.prototype.slice.call(document.querySelectorAll('video.lazy-media, .media-cell video'));
  var videoRestores = [];
  for (var v = 0; v < videos.length; v++) {
    var vid = videos[v];
    /* Force the lazy-media src so the element actually has frames to capture. */
    if (!vid.src && vid.getAttribute('data-src')) {
      vid.src = vid.getAttribute('data-src');
      try { vid.load(); } catch (_) {}
    }
    var dataUrl = await videoFirstFrame(vid);
    if (!dataUrl) continue;
    var img = document.createElement('img');
    img.src = dataUrl;
    img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;filter:grayscale(100%) contrast(1.05);';
    var prevDisplay = vid.style.display;
    vid.style.display = 'none';
    vid.parentNode.insertBefore(img, vid);
    videoRestores.push({ video: vid, img: img, display: prevDisplay });
  }

  /* Force light theme + pdf-capture class so toggles/nav are hidden. */
  var savedTheme = document.documentElement.getAttribute('data-theme');
  document.documentElement.setAttribute('data-theme', 'light');
  document.body.classList.add('pdf-capture');
  await new Promise(function(r) { setTimeout(r, 250); });

  var slides = document.querySelectorAll('.slide');
  var PDF_W = 1600, PDF_H = 900, JPEG_Q = 0.82;

  try {
    var JSPDFCtor = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
    var pdf = new JSPDFCtor({
      orientation: 'landscape',
      unit: 'px',
      format: [PDF_W, PDF_H],
      hotfixes: ['px_scaling'],
      compress: true
    });

    for (var j = 0; j < slides.length; j++) {
      loadingText.textContent = t('pdfRendering', { n: (j + 1), total: slides.length });
      setProgress(0.15 + 0.8 * ((j + 1) / slides.length));

      /* Each slide is rendered at its own viewport; we tell html2canvas
         to use a fixed 1600×900 window so the layout matches the PDF. */
      var canvas = await html2canvas(slides[j], {
        scale: 1,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#FFFFFF',
        logging: false,
        windowWidth: PDF_W,
        windowHeight: PDF_H,
        width: PDF_W,
        height: PDF_H,
        imageTimeout: 5000,
        removeContainer: true
      });
      var imgData = canvas.toDataURL('image/jpeg', JPEG_Q);
      if (j > 0) pdf.addPage([PDF_W, PDF_H], 'landscape');
      pdf.addImage(imgData, 'JPEG', 0, 0, PDF_W, PDF_H);
    }

    loadingText.textContent = t('pdfSaveDialog');
    setProgress(0.98);
    pdf.save('TSSRCT-Pitch-2026.pdf');
    setProgress(1);
    titleEl.textContent     = t('pdfReady');
    loadingText.textContent = t('pdfReadyDesc');
    hintEl.textContent      = t('pdfReadyHint');
    loading.classList.add('ready');
  } catch (err) {
    console.error('PDF generation error:', err);
    if (titleEl)     titleEl.textContent     = t('pdfErr');
    if (loadingText) loadingText.textContent = t('pdfErrDesc');
    if (hintEl)      hintEl.textContent      = (err && err.message) ? err.message : t('pdfErrHint');
  } finally {
    /* Restore video swaps + theme + buttons regardless of success. */
    document.body.classList.remove('pdf-capture');
    if (savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
    else document.documentElement.removeAttribute('data-theme');
    allBtns.forEach(function(b) { b.disabled = false; });
    videoRestores.forEach(function(r) {
      r.img.remove();
      r.video.style.display = r.display;
    });
  }
}

/** Dismiss the PDF loader (× button or ESC). */
function closePDFLoader() {
  var loading = document.getElementById('pdf-loading');
  if (!loading) return;
  loading.classList.remove('active');
  loading.classList.remove('ready');
  var titleEl = document.getElementById('pdf-loading-title');
  var txtEl   = document.getElementById('pdf-loading-text');
  var hintEl  = document.getElementById('pdf-loading-hint');
  var progEl  = document.getElementById('pdf-loading-progress');
  var t = window.__i18n || function(k){ return k; };
  if (titleEl) titleEl.textContent = t('pdfTitle');
  if (txtEl)   txtEl.textContent   = t('pdfPreparing');
  if (hintEl)  hintEl.textContent  = '';
  if (progEl)  progEl.style.setProperty('--p', 0);
}
