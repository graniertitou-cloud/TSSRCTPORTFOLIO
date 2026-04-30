/**
 * @file Fullscreen media lightbox — handles images (with prev/next gallery
 * navigation across multiple galleries on the deck), HTML5 videos with
 * controls, and YouTube/Luma iframes. Touch swipe (left / right) is wired
 * on the overlay so phones get a native-feeling photo-roll experience.
 * Public API: `openLightbox`, `openMedia`, `closeLightbox`,
 * `lightboxPrev`, `lightboxNext`, `lightboxBackdropClick`.
 */

/** @type {string[]} URLs of the images currently navigable with prev/next */
let LIGHTBOX_IMGS = [];
/** @type {number} Current index in LIGHTBOX_IMGS */
let LIGHTBOX_IDX  = 0;

/**
 * Build the list of images for the gallery containing `src`. We scan two
 * places: the venue photo grid and the Track Record media strip. The
 * gallery that contains `src` wins — its full list becomes the prev/next
 * cycle. If `src` isn't found, we fall back to a single-image gallery.
 * @param {string} src URL the lightbox is opening with
 * @returns {string[]}
 */
function _findGalleryFor(src) {
  /* Normalise: strip the origin prefix so 'http://host/images/x.jpg' and
     'images/x.jpg' compare as equal. We compare against the suffix. */
  function tail(u) {
    if (!u) return '';
    let s = String(u).replace(/^https?:\/\/[^\/]+/, '');
    return s.replace(/^\/+/, '');
  }
  let target = tail(src);

  /* Gallery 1 — venue photo grid (background-image URLs). */
  let venue = Array.prototype.slice.call(document.querySelectorAll('.venue-grid > .zoomable'))
    .map(function(el){
      let m = (el.getAttribute('style') || '').match(/url\(['"]?([^'")]+)['"]?\)/);
      return m ? m[1] : null;
    })
    .filter(Boolean);
  if (venue.some(function(u){ return tail(u) === target; })) return venue;

  /* Gallery 2 — Track Record image cells (skipping the video cell). */
  let track = Array.prototype.slice
    .call(document.querySelectorAll('.track-media-cell img'))
    .map(function(el){ return el.getAttribute('src') || el.src; })
    .filter(Boolean);
  if (track.some(function(u){ return tail(u) === target; })) return track;

  return [src];
}

function _renderLightbox() {
  let img = document.getElementById('lightbox-img');
  if (!img || !LIGHTBOX_IMGS.length) return;
  img.src = LIGHTBOX_IMGS[LIGHTBOX_IDX];
}

/**
 * Opens the lightbox in image-gallery mode. Detects which gallery `src`
 * belongs to and arms prev/next on its sibling images. If `src` isn't
 * part of any registered gallery, falls back to a single-image lightbox.
 * @param {string} src Image URL to display first
 */
function openLightbox(src) {
  let overlay = document.getElementById('lightbox');
  if (!overlay) return;
  LIGHTBOX_IMGS = _findGalleryFor(src);
  /* Find index by tail match so different URL prefixes still align. */
  let target = String(src).replace(/^https?:\/\/[^\/]+/, '').replace(/^\/+/, '');
  LIGHTBOX_IDX = 0;
  for (let i = 0; i < LIGHTBOX_IMGS.length; i++) {
    let t = String(LIGHTBOX_IMGS[i]).replace(/^https?:\/\/[^\/]+/, '').replace(/^\/+/, '');
    if (t === target) { LIGHTBOX_IDX = i; break; }
  }
  _renderLightbox();
  overlay.classList.remove('show-video', 'show-iframe');
  overlay.classList.add('active', 'show-img');
}

/**
 * Universal media opener — single-item lightbox for images, HTML5 videos,
 * or iframes (e.g., YouTube). For images, defers to `openLightbox` so
 * the gallery context is automatically resolved.
 * @param {'image'|'video'|'iframe'} type Type of media to render
 * @param {string} src URL of the media
 */
function openMedia(type, src) {
  if (type === 'image') return openLightbox(src);
  let overlay = document.getElementById('lightbox');
  if (!overlay) return;
  overlay.classList.remove('show-img', 'show-video', 'show-iframe');
  if (type === 'video') {
    let v = document.getElementById('lightbox-video');
    v.src = src;
    v.muted = false;
    v.currentTime = 0;
    overlay.classList.add('show-video');
    setTimeout(function(){ try { v.play(); } catch(_){} }, 50);
  } else if (type === 'iframe') {
    document.getElementById('lightbox-iframe').src = src;
    overlay.classList.add('show-iframe');
  }
  /* Single-item mode: no gallery navigation. */
  LIGHTBOX_IMGS = [];
  LIGHTBOX_IDX  = 0;
  overlay.classList.add('active');
}

/**
 * Closes the lightbox and stops any playing media. Removes both `active`
 * state and any media-type modifiers, then clears the video and iframe
 * sources so they stop streaming/buffering in the background.
 */
function closeLightbox() {
  let overlay = document.getElementById('lightbox');
  if (!overlay) return;
  overlay.classList.remove('active', 'show-img', 'show-video', 'show-iframe');
  /* Stop any media playing in the lightbox */
  let v = document.getElementById('lightbox-video');
  if (v) { try { v.pause(); } catch(_){} v.removeAttribute('src'); v.load && v.load(); }
  let ifr = document.getElementById('lightbox-iframe');
  if (ifr) ifr.src = 'about:blank';
}

function lightboxPrev(e) {
  if (e) e.stopPropagation();
  if (LIGHTBOX_IMGS.length < 2) return;
  LIGHTBOX_IDX = (LIGHTBOX_IDX - 1 + LIGHTBOX_IMGS.length) % LIGHTBOX_IMGS.length;
  _renderLightbox();
}
function lightboxNext(e) {
  if (e) e.stopPropagation();
  if (LIGHTBOX_IMGS.length < 2) return;
  LIGHTBOX_IDX = (LIGHTBOX_IDX + 1) % LIGHTBOX_IMGS.length;
  _renderLightbox();
}
function lightboxBackdropClick(e) {
  if (e.target && e.target.id === 'lightbox') closeLightbox();
}

/* ─── Touch swipe (left / right) for phone gallery navigation ─────────
   Tracks a single-finger horizontal drag on the overlay. Triggers
   prev/next when the finger has moved ≥ 50px more horizontally than
   vertically (so vertical scroll on the lightbox image still works
   without accidentally paginating). Only active when in image-gallery
   mode (.show-img) AND the gallery has ≥ 2 photos. */
(function initLightboxSwipe() {
  let overlay = document.getElementById('lightbox');
  if (!overlay) return;
  let startX = 0, startY = 0, tracking = false;
  function onStart(e) {
    if (!overlay.classList.contains('show-img')) return;
    if (LIGHTBOX_IMGS.length < 2) return;
    if (!e.touches || e.touches.length !== 1) return;
    startX = e.touches[0].clientX;
    startY = e.touches[0].clientY;
    tracking = true;
  }
  function onEnd(e) {
    if (!tracking) return;
    tracking = false;
    let t = (e.changedTouches && e.changedTouches[0]) || null;
    if (!t) return;
    let dx = t.clientX - startX;
    let dy = t.clientY - startY;
    if (Math.abs(dx) < 50) return;
    if (Math.abs(dx) < Math.abs(dy)) return;
    /* Swipe LEFT (dx < 0) → next photo, swipe RIGHT → previous. */
    if (dx < 0) lightboxNext(); else lightboxPrev();
  }
  overlay.addEventListener('touchstart', onStart, { passive: true });
  overlay.addEventListener('touchend',   onEnd,   { passive: true });
})();
