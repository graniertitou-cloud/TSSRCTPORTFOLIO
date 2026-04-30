/**
 * @file Lazy-load helper for elements with `class="lazy-media"` and a
 * `data-src` attribute. Swaps `data-src` → `src` when the parent slide
 * is one viewport away from entering view. Used for the YouTube iframes
 * (slides 8 + 10), the Luma 3D embed (slide 7), and the autoplay videos
 * (slides 3 + 9) so the cover slide first paint is not blocked by tens
 * of MB of media + YT player JS / Luma WebGL bootstrap.
 */
(function(){
  function swap(el){
    let realSrc = el.getAttribute('data-src');
    if (!realSrc || el.src === realSrc) return;
    el.src = realSrc;
    el.removeAttribute('data-src');
    /* For autoplay muted videos the browser auto-plays once src is set;
       calling load() explicitly ensures Safari/iOS pick up the new src. */
    if (el.tagName === 'VIDEO' && typeof el.load === 'function') {
      try { el.load(); } catch (_) {}
    }
  }
  if (!('IntersectionObserver' in window)) {
    /* Fallback: just swap immediately */
    Array.prototype.forEach.call(document.querySelectorAll('.lazy-media[data-src]'), swap);
    return;
  }
  let io = new IntersectionObserver(function(entries){
    entries.forEach(function(entry){
      if (!entry.isIntersecting) return;
      let slide = entry.target;
      Array.prototype.forEach.call(slide.querySelectorAll('.lazy-media[data-src]'), swap);
      io.unobserve(slide);
    });
  }, { rootMargin: '100% 0px 100% 0px', threshold: 0 });
  /* Observe each slide that contains at least one lazy-media descendant. */
  let seen = new Set();
  Array.prototype.forEach.call(document.querySelectorAll('.lazy-media'), function(el){
    let slide = el.closest('.slide');
    if (slide && !seen.has(slide)) { seen.add(slide); io.observe(slide); }
  });
})();

