/* ==========================================================================
   AADHI Events & Entertainments — Auth pages (Sign In / Sign Up)
   Ripple effect + client-side form validation
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {

  /* ---------------- Ripple button effect ---------------- */
  document.querySelectorAll('.ripple').forEach(btn => {
    btn.addEventListener('click', function(e){
      const rect = this.getBoundingClientRect();
      const circle = document.createElement('span');
      const size = Math.max(rect.width, rect.height);
      circle.classList.add('ripple-circle');
      circle.style.width = circle.style.height = size + 'px';
      circle.style.left = (e.clientX - rect.left - size / 2) + 'px';
      circle.style.top = (e.clientY - rect.top - size / 2) + 'px';
      this.appendChild(circle);
      setTimeout(() => circle.remove(), 650);
    });
  });

  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const phonePattern = /^[6-9]\d{9}$/;

  function setError(form, fieldName, message){
    const errorEl = form.querySelector(`.form-error[data-for="${fieldName}"]`);
    const row = errorEl ? errorEl.closest('.form-row') : null;
    if (errorEl) errorEl.textContent = message || '';
    if (row) row.classList.toggle('invalid', Boolean(message));
  }

  /* ---------------- Sign In form ---------------- */
  const signinForm = document.getElementById('signinForm');
  if (signinForm) {
    const fields = {
      email: document.getElementById('si-email'),
      password: document.getElementById('si-password')
    };
    const success = document.getElementById('formSuccess');

    function validateSignin(){
      let valid = true;
      const email = fields.email.value.trim();
      const password = fields.password.value;

      if (!email || !emailPattern.test(email)) {
        setError(signinForm, 'email', 'Please enter a valid email address.'); valid = false;
      } else setError(signinForm, 'email', '');

      if (!password) {
        setError(signinForm, 'password', 'Please enter your password.'); valid = false;
      } else setError(signinForm, 'password', '');

      return valid;
    }

    signinForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      success.classList.remove('show');
      if (!validateSignin()) return;

      const submitBtn = signinForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      const { data } = await AadhiAPI.login({
        email: fields.email.value.trim(),
        password: fields.password.value,
      });

      if (submitBtn) submitBtn.disabled = false;

      if (data && data.ok) {
        success.textContent = `Welcome back, ${data.user.name.split(' ')[0]}! Redirecting…`;
        success.classList.add('show');
        signinForm.reset();
        setTimeout(() => { window.location.href = 'index.html'; }, 1200);
      } else if (data && data.errors) {
        Object.keys(data.errors).forEach(key => setError(signinForm, key, data.errors[key]));
      }
    });

    Object.keys(fields).forEach(key => {
      fields[key].addEventListener('input', () => setError(signinForm, key, ''));
    });
  }

  /* ---------------- Sign Up form ---------------- */
  const signupForm = document.getElementById('signupForm');
  if (signupForm) {
    const fields = {
      name: document.getElementById('su-name'),
      email: document.getElementById('su-email'),
      phone: document.getElementById('su-phone'),
      password: document.getElementById('su-password'),
      confirm: document.getElementById('su-confirm')
    };
    const terms = document.getElementById('su-terms');
    const success = document.getElementById('formSuccess');

    function validateSignup(){
      let valid = true;
      const name = fields.name.value.trim();
      const email = fields.email.value.trim();
      const phone = fields.phone.value.trim();
      const password = fields.password.value;
      const confirm = fields.confirm.value;

      if (!name) {
        setError(signupForm, 'name', 'Please enter your full name.'); valid = false;
      } else setError(signupForm, 'name', '');

      if (!email || !emailPattern.test(email)) {
        setError(signupForm, 'email', 'Please enter a valid email address.'); valid = false;
      } else setError(signupForm, 'email', '');

      if (!phone || !phonePattern.test(phone.replace(/\D/g, '').slice(-10))) {
        setError(signupForm, 'phone', 'Please enter a valid 10-digit mobile number.'); valid = false;
      } else setError(signupForm, 'phone', '');

      if (!password || password.length < 6) {
        setError(signupForm, 'password', 'Password must be at least 6 characters.'); valid = false;
      } else setError(signupForm, 'password', '');

      if (!confirm || confirm !== password) {
        setError(signupForm, 'confirm', 'Passwords do not match.'); valid = false;
      } else setError(signupForm, 'confirm', '');

      if (!terms.checked) {
        setError(signupForm, 'terms', 'Please accept the terms to continue.'); valid = false;
      } else setError(signupForm, 'terms', '');

      return valid;
    }

    signupForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      success.classList.remove('show');
      if (!validateSignup()) return;

      const submitBtn = signupForm.querySelector('button[type="submit"]');
      if (submitBtn) submitBtn.disabled = true;

      const { data } = await AadhiAPI.signup({
        name: fields.name.value.trim(),
        email: fields.email.value.trim(),
        phone: fields.phone.value.trim(),
        password: fields.password.value,
        confirm: fields.confirm.value,
      });

      if (submitBtn) submitBtn.disabled = false;

      if (data && data.ok) {
        success.textContent = `🎉 Welcome, ${data.user.name.split(' ')[0]}! Your account is ready. Redirecting…`;
        success.classList.add('show');
        signupForm.reset();
        setTimeout(() => { window.location.href = 'index.html'; }, 1400);
      } else if (data && data.errors) {
        Object.keys(data.errors).forEach(key => setError(signupForm, key, data.errors[key]));
      }
    });

    Object.keys(fields).forEach(key => {
      fields[key].addEventListener('input', () => setError(signupForm, key, ''));
    });
    terms.addEventListener('change', () => setError(signupForm, 'terms', ''));
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
