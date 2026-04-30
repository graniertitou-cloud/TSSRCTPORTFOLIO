/**
 * @file Partnership contact modal — opens on click of the "Contact us for
 * more opportunity" button on slide 12 (Partnership), submits via Web3Forms
 * direct (the access_key is domain-restricted on Web3Forms' end).
 * Public API: `openContactModal`, `closeContactModal`, `submitContactForm`.
 */

/** Opens the modal and focuses the name field. */
function openContactModal() {
  let modal = document.getElementById('contact-modal');
  if (!modal) return;
  modal.classList.add('active');
  setTimeout(function() {
    let nameField = document.getElementById('cf-name');
    if (nameField) nameField.focus();
  }, 50);
}
/** Closes the modal (also reachable via × button, ESC key or backdrop click). */
function closeContactModal() {
  let modal = document.getElementById('contact-modal');
  if (!modal) return;
  modal.classList.remove('active');
}
/**
 * Submits the partnership inquiry to Web3Forms.
 * @param {Event} e The form submit event
 */
function submitContactForm(e) {
  e.preventDefault();
  let form    = document.getElementById('contact-form');
  let submit  = form.querySelector('.modal-submit');
  let status  = document.getElementById('cf-status');
  let name    = document.getElementById('cf-name').value.trim();
  let email   = document.getElementById('cf-email').value.trim();
  let company = document.getElementById('cf-company').value.trim();
  let message = document.getElementById('cf-message').value.trim();

  submit.disabled = true;
  submit.textContent = (window.__i18n ? window.__i18n('cfSending') : 'Sending…');
  status.textContent = '';
  status.className   = 'modal-status';

  /* Web3Forms direct client call — replace WEB3FORMS_ACCESS_KEY with your
     real key after deployment. Web3Forms enforces a domain restriction on
     their side so the key alone can't be reused from another origin. */
  fetch('https://api.web3forms.com/submit', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify({
      access_key: 'WEB3FORMS_ACCESS_KEY',
      subject:    'TSSRCT pitch · contact · ' + name,
      from_name:  'TSSRCT · Pitch Deck',
      replyto:    email,
      name:       name,
      email:      email,
      company:    company || '—',
      message:    message || '(no message)',
      source:     'tssrct-pitch',
      botcheck:   ''
    })
  })
  .then(function(res) {
    if (!res.ok) throw new Error('Network error (' + res.status + ')');
    return res.json();
  })
  .then(function(data) {
    status.textContent = (window.__i18n ? window.__i18n('cfSent') : '✓ Sent. We\'ll reply within 48 hours.');
    status.className   = 'modal-status success';
    form.reset();
    setTimeout(closeContactModal, 2200);
  })
  .catch(function(err) {
    status.textContent = (window.__i18n ? window.__i18n('cfFailed') : '⚠ Could not send. Email us directly: contact@example.com');
    status.className   = 'modal-status error';
  })
  .then(function() {
    submit.disabled = false;
    submit.textContent = (window.__i18n ? window.__i18n('cfSendBtn') : 'Send inquiry →');
  });
}
/* Close modal on overlay click or ESC */
document.addEventListener('click', function(e) {
  let modal = document.getElementById('contact-modal');
  if (modal && e.target === modal) closeContactModal();
});
document.addEventListener('keydown', function(e) {
  if (e.key === 'Escape') {
    closeContactModal();
    closeLightbox();
    let pdfLoading = document.getElementById('pdf-loading');
    if (pdfLoading && pdfLoading.classList.contains('active')) closePDFLoader();
  }
  let lightbox = document.getElementById('lightbox');
  if (lightbox && lightbox.classList.contains('active')) {
    if (e.key === 'ArrowLeft')  { e.preventDefault(); lightboxPrev(); }
    if (e.key === 'ArrowRight') { e.preventDefault(); lightboxNext(); }
  }
});

