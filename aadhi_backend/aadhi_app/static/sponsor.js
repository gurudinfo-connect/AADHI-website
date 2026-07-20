/* ==========================================================================
   AADHI Events & Entertainments — Become a Sponsor page
   File-upload filename preview + lightweight client-side validation.
   (Loader, nav, scroll-reveal, ripple buttons, animated counters, the
   testimonial slider and the FAQ accordion are all already handled
   generically by script.js — this file only adds what's specific to the
   sponsorship form.)
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------------- File upload: show chosen filename ---------------- */
  document.querySelectorAll('.file-upload-row input[type="file"]').forEach(input => {
    const nameEl = input.closest('.file-upload-row').querySelector('.file-upload-filename');
    if (!nameEl) return;
    const defaultText = nameEl.textContent;
    input.addEventListener('change', () => {
      if (input.files && input.files.length) {
        nameEl.textContent = input.files[0].name;
        nameEl.classList.add('has-file');
      } else {
        nameEl.textContent = defaultText;
        nameEl.classList.remove('has-file');
      }
    });
  });

  /* ---------------- Sponsorship form: gentle client-side validation ----------------
     This does NOT block submission on its own — the form still posts to
     Django, which is the real source of truth for validation. It just
     gives instant feedback and stops obviously-empty required fields from
     round-tripping to the server. */
  const form = document.getElementById('sponsorForm');
  if (form) {
    const requiredFields = form.querySelectorAll('[required]');

    function setFieldError(field, message) {
      const row = field.closest('.form-row') || field.closest('.agree-row');
      if (!row) return;
      let errorEl = row.querySelector('.form-error');
      if (!errorEl) {
        errorEl = row.querySelector('[data-for]');
      }
      if (errorEl) errorEl.textContent = message || '';
      row.classList.toggle('invalid', Boolean(message));
    }

    requiredFields.forEach(field => {
      field.addEventListener('input', () => setFieldError(field, ''));
      field.addEventListener('change', () => setFieldError(field, ''));
    });

    form.addEventListener('submit', (e) => {
      let firstInvalid = null;

      requiredFields.forEach(field => {
        let empty = false;
        if (field.type === 'checkbox') {
          empty = !field.checked;
        } else {
          empty = !field.value || !field.value.trim();
        }
        if (empty) {
          setFieldError(field, field.type === 'checkbox'
            ? 'Please agree to the sponsorship terms and conditions.'
            : 'This field is required.');
          if (!firstInvalid) firstInvalid = field;
        } else {
          setFieldError(field, '');
        }
      });

      if (firstInvalid) {
        e.preventDefault();
        firstInvalid.scrollIntoView({ behavior: 'smooth', block: 'center' });
        firstInvalid.focus({ preventScroll: true });
      }
    });
  }

  /* ---------------- Live phone number validation ----------------
     As soon as the person types something into a phone field, check it
     against a strict 10-digit mobile number pattern and turn the field
     red with an inline message immediately — instead of waiting until
     they hit submit. */
  (function initLivePhoneValidation(){
    const PHONE_PATTERN = /^[6-9]\d{9}$/;

    function showPhoneError(input, message){
      const row = input.closest('.form-row');
      if (row) row.classList.toggle('invalid', Boolean(message));

      let errorEl = row ? row.querySelector('.form-error') : null;
      if (!errorEl && row) {
        errorEl = document.createElement('span');
        errorEl.className = 'form-error';
        row.appendChild(errorEl);
      }
      if (errorEl) errorEl.textContent = message || '';
    }

    function validatePhone(input){
      const raw = input.value.trim();
      const digitsOnly = raw.replace(/\D/g, '');

      if (!raw) { showPhoneError(input, ''); return; }

      if (digitsOnly !== raw) {
        showPhoneError(input, 'Mobile number should contain digits only.');
      } else if (digitsOnly.length !== 10) {
        showPhoneError(input, 'Please enter a valid 10-digit mobile number.');
      } else if (!PHONE_PATTERN.test(digitsOnly)) {
        showPhoneError(input, 'Please enter a valid mobile number.');
      } else {
        showPhoneError(input, '');
      }
    }

    document.querySelectorAll('input[type="tel"]').forEach(input => {
      input.addEventListener('input', () => validatePhone(input));
      input.addEventListener('blur', () => validatePhone(input));
    });
  })();

});
