/**
 * @file Slide navigation — fixed up/down arrow buttons (bottom right) and
 * keyboard shortcuts (↑↓←→, Space, PageUp/Down, Home/End). Tracks the
 * current slide via IntersectionObserver and disables prev/next at edges.
 */
(function() {
  let slides = Array.prototype.slice.call(document.querySelectorAll('.slide'));
  let prevBtn = document.getElementById('nav-prev');
  let nextBtn = document.getElementById('nav-next');
  let current = 0;

  function updateButtons() {
    prevBtn.disabled = (current <= 0);
    nextBtn.disabled = (current >= slides.length - 1);
  }

  function goTo(i) {
    i = Math.max(0, Math.min(slides.length - 1, i));
    current = i;
    slides[i].scrollIntoView({ behavior: 'smooth', block: 'start' });
    updateButtons();
  }

  /* Track visible slide as user scrolls manually */
  let io = new IntersectionObserver(function(entries) {
    entries.forEach(function(e) {
      if (e.isIntersecting && e.intersectionRatio > 0.5) {
        current = slides.indexOf(e.target);
        updateButtons();
      }
    });
  }, { threshold: [0.5] });
  slides.forEach(function(s) { io.observe(s); });

  prevBtn.addEventListener('click', function() { goTo(current - 1); });
  nextBtn.addEventListener('click', function() { goTo(current + 1); });

  document.addEventListener('keydown', function(e) {
    if (e.target && /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)) return;
    if (e.key === 'ArrowDown' || e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
      e.preventDefault();
      goTo(current + 1);
    } else if (e.key === 'ArrowUp' || e.key === 'ArrowLeft' || e.key === 'PageUp') {
      e.preventDefault();
      goTo(current - 1);
    } else if (e.key === 'Home') {
      e.preventDefault();
      goTo(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      goTo(slides.length - 1);
    }
  });

  updateButtons();
})();

