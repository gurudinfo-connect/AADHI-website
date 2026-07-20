/* ==========================================================================
   AADHI Events & Entertainments — shared API helper
   Talks to the Django backend (session auth + CSRF).
   ========================================================================== */

const AadhiAPI = (() => {
  function getCookie(name) {
    const match = document.cookie.match('(^|;)\\s*' + name + '\\s*=\\s*([^;]+)');
    return match ? decodeURIComponent(match.pop()) : '';
  }

  async function request(url, { method = 'GET', body } = {}) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
      credentials: 'same-origin',
    };
    if (method !== 'GET') {
      opts.headers['X-CSRFToken'] = getCookie('csrftoken');
    }
    if (body !== undefined) opts.body = JSON.stringify(body);

    const res = await fetch(url, opts);
    let data = {};
    let parseFailed = false;
    try {
      data = await res.json();
    } catch (e) {
      parseFailed = true;
    }
    if (parseFailed && !res.ok) {
      // Server returned something that wasn't JSON — almost always a Django
      // error page (500, 404, etc). Surface the status so it's obvious this
      // is a server-side problem and not a validation error.
      console.error(`${url} returned ${res.status} with a non-JSON body. Check the Django server console for the traceback.`);
      data = { ok: false, _serverError: true, _status: res.status };
    }
    return { status: res.status, ok: res.ok, data };
  }

  const signup = (payload) => request('/api/auth/signup/', { method: 'POST', body: payload });
  const login = (payload) => request('/api/auth/login/', { method: 'POST', body: payload });
  const logout = () => request('/api/auth/logout/', { method: 'POST' });
  const me = () => request('/api/auth/me/');
  const events = () => request('/api/events/');
  const registerForEvent = (slug, payload) =>
    request(`/api/events/${encodeURIComponent(slug)}/register/`, { method: 'POST', body: payload });
  const contact = (payload) => request('/api/contact/', { method: 'POST', body: payload });

  /* ---- Nav login-state sync: swaps "Login" for the user's name + Logout ---- */
  async function syncNav() {
    const navActions = document.querySelector('.nav-actions');
    if (!navActions) return;
    const loginBtn = navActions.querySelector('a[href="signin.html"], a[href$="signin.html"]');
    if (!loginBtn) return;

    const { data } = await me();
    if (data && data.ok && data.user) {
      loginBtn.textContent = `Hi, ${data.user.name.split(' ')[0]}`;
      loginBtn.removeAttribute('href');
      loginBtn.style.cursor = 'pointer';
      loginBtn.title = 'Click to log out';
      loginBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await logout();
        window.location.reload();
      });
    }
  }

  document.addEventListener('DOMContentLoaded', syncNav);

  return { signup, login, logout, me, events, registerForEvent, contact, getCookie };
})();
