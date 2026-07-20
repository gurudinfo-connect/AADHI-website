/* ==========================================================================
   AADHI Events & Entertainments — demo payment helper
   ==========================================================================
   Exposes AadhiPayments.openCheckout(registrationId, { onSuccess, onError }).

   This is a DEMO payment flow — there is no real payment gateway wired up,
   nothing is charged, and no card/UPI/bank details are collected anywhere.

   Flow:
     1. openCheckout() asks the backend to create a local demo "order" for
        the registration (/create-payment/).
     2. We show our own branded "Payment Options" sheet (styled to match
        the AADHI site) so the flow feels native to the site.
     3. Whichever method the user taps, tapping "Pay" simply simulates a
        brief processing delay (no external gateway call) and then reports
        success.
     4. On success, verifyPayment() posts the demo order reference to
        /payment-success/, which marks the registration paid and issues
        the ticket/QR — same as it would after a real payment.
   ========================================================================== */

const AadhiPayments = (() => {
  function getCookie(name) {
    let cookieValue = null;
    if (document.cookie) {
      const cookies = document.cookie.split(";");
      for (let cookie of cookies) {
        cookie = cookie.trim();
        if (cookie.startsWith(name + "=")) {
          cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
          break;
        }
      }
    }
    return cookieValue;
  }

  function formatRupees(paise) {
    const rupees = Math.round(paise) / 100;
    return "₹" + rupees.toLocaleString("en-IN", { maximumFractionDigits: 0 });
  }

  function verifyPayment(response, { onSuccess, onError } = {}) {
    fetch("/payment-success/", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": getCookie("csrftoken"),
      },
      body: JSON.stringify(response),
    })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (!res.ok || data.ok === false) {
          throw new Error(data.error || "Payment could not be verified.");
        }
        return data;
      })
      .then((data) => {
        if (data && data.registration) showTicket(data.registration);
        if (onSuccess) onSuccess(data);
      })
      .catch((err) => {
        if (onError) onError(err);
      });
  }

  function simulateDemoPayment(data, method, { onSuccess, onError } = {}) {
    // DEMO MODE: no real gateway is called and nothing is charged. We just
    // show a short "processing" state on the sheet's CTA button, then
    // report success with a locally generated demo payment reference.
    const cta = document.getElementById("aadhi-pay-cta");
    const ctaLabel = document.getElementById("aadhi-pay-cta-label");
    if (cta) {
      cta.disabled = true;
      cta.classList.add("processing");
    }
    if (ctaLabel) ctaLabel.textContent = "Processing payment…";

    setTimeout(() => {
      const demoPaymentId = "demo_pay_" + Math.random().toString(16).slice(2, 12);
      verifyPayment(
        {
          razorpay_order_id: data.order_id,
          razorpay_payment_id: demoPaymentId,
          method: method || "upi",
        },
        { onSuccess, onError }
      );
    }, 1400);
  }

  // -- Branded method-picker sheet ------------------------------------------

  // Small mark badges shown inside each method's icon tile — one per
  // scheme, so e.g. the "Cards" row shows the actual Visa/Mastercard marks
  // instead of a single generic card glyph.
  const MARKS = {
    upi: '<svg viewBox="0 0 40 20" width="30" height="15"><path fill="#F58220" d="M11 1L3 19h4.2L15 1h-4z"/><path fill="#5AB847" d="M17.5 1L9.5 19h4.2L21.5 1h-4z"/></svg>',
    visa: '<svg viewBox="0 0 48 16" width="26" height="9"><text x="0" y="13" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-style="italic" font-size="15" fill="#1A1F71">VISA</text></svg>',
    mastercard:
      '<svg viewBox="0 0 32 20" width="24" height="15"><circle cx="12" cy="10" r="9" fill="#EB001B"/><circle cx="20" cy="10" r="9" fill="#F79E1B" opacity=".92"/></svg>',
    netbanking:
      '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="none" stroke="#0A4E92" stroke-width="1.7" d="M3 10l9-6 9 6M4 10v9h16v-9M9 13v4M15 13v4" stroke-linecap="round" stroke-linejoin="round"/></svg>',
    paytm: '<svg viewBox="0 0 60 16" width="30" height="8"><text x="0" y="13" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="13" fill="#002E6E">paytm</text></svg>',
    mobikwik:
      '<svg viewBox="0 0 20 20" width="14" height="14"><circle cx="10" cy="10" r="9" fill="#2B3990"/><text x="10" y="14" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="10" fill="#fff" text-anchor="middle">M</text></svg>',
    amazonpay:
      '<svg viewBox="0 0 20 20" width="14" height="14"><circle cx="10" cy="10" r="9" fill="#232F3E"/><text x="10" y="14" font-family="Arial,Helvetica,sans-serif" font-weight="800" font-size="10" fill="#FF9900" text-anchor="middle">a</text></svg>',
  };

  const METHODS = [
    {
      id: "upi",
      label: "UPI",
      sub: "Google Pay, PhonePe, Paytm & more",
      icon: `<span class="m-icon-stack">${MARKS.upi}</span>`,
    },
    {
      id: "card",
      label: "Cards",
      sub: "Visa, Mastercard, RuPay",
      icon: `<span class="m-icon-stack">${MARKS.visa}${MARKS.mastercard}</span>`,
    },
    {
      id: "netbanking",
      label: "Net Banking",
      sub: "All major banks",
      icon: `<span class="m-icon-stack">${MARKS.netbanking}</span>`,
    },
    {
      id: "wallet",
      label: "Wallet",
      sub: "Paytm, Mobikwik, Amazon Pay",
      icon: `<span class="m-icon-stack">${MARKS.paytm}${MARKS.mobikwik}${MARKS.amazonpay}</span>`,
    },
  ];

  function injectStyles() {
    if (document.getElementById("aadhi-pay-styles")) return;
    const style = document.createElement("style");
    style.id = "aadhi-pay-styles";
    style.textContent = `
      .aadhi-pay-overlay{position:fixed;inset:0;z-index:9999;background:rgba(10,20,35,.55);
        display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(3px);
        animation:aadhiPayFade .18s ease;}
      @keyframes aadhiPayFade{from{opacity:0}to{opacity:1}}
      @media (min-width:640px){.aadhi-pay-overlay{align-items:center;}}
      .aadhi-pay-sheet{width:100%;max-width:420px;max-height:92vh;overflow-y:auto;
        background:#fff;border-radius:22px 22px 0 0;box-shadow:0 -10px 40px rgba(10,30,60,.35);
        font-family:'Inter','Segoe UI',sans-serif;color:#0F172A;
        animation:aadhiPayUp .22s cubic-bezier(.22,1,.36,1);}
      @media (min-width:640px){.aadhi-pay-sheet{border-radius:22px;box-shadow:0 24px 60px rgba(10,30,60,.4);}}
      @keyframes aadhiPayUp{from{transform:translateY(24px);opacity:0}to{transform:translateY(0);opacity:1}}
      .aadhi-pay-head{background:linear-gradient(120deg,#0A4E92 0%,#0099E6 100%);color:#fff;
        padding:22px 22px 26px;border-radius:22px 22px 0 0;position:relative;}
      .aadhi-pay-head .aadhi-pay-close{position:absolute;top:16px;right:16px;width:30px;height:30px;
        border-radius:50%;background:rgba(255,255,255,.18);border:none;color:#fff;font-size:16px;
        cursor:pointer;display:flex;align-items:center;justify-content:center;line-height:1;}
      .aadhi-pay-head .aadhi-pay-close:hover{background:rgba(255,255,255,.3);}
      .aadhi-pay-brand{display:flex;align-items:center;gap:10px;font-weight:700;font-size:15px;margin-bottom:16px;}
      .aadhi-pay-brand .badge{width:34px;height:34px;border-radius:9px;background:#fff;
        display:flex;align-items:center;justify-content:center;font-weight:800;font-size:15px;
        overflow:hidden;flex-shrink:0;padding:4px;}
      .aadhi-pay-brand .badge img{width:100%;height:100%;object-fit:contain;}
      .aadhi-pay-brand .badge.fallback{background:rgba(255,255,255,.2);color:#fff;}
      .aadhi-pay-amount-label{font-size:12px;opacity:.85;letter-spacing:.04em;text-transform:uppercase;margin-bottom:4px;}
      .aadhi-pay-amount{font-size:30px;font-weight:800;font-family:'Sora','Segoe UI',sans-serif;}
      .aadhi-pay-body{padding:14px 16px 18px;}
      .aadhi-pay-method{display:flex;align-items:center;gap:12px;width:100%;text-align:left;
        background:#F7FAFC;border:1.5px solid transparent;border-radius:14px;padding:13px 14px;
        margin-bottom:10px;cursor:pointer;transition:border-color .15s,background .15s;}
      .aadhi-pay-method:hover{background:#EEF6FC;}
      .aadhi-pay-method.selected{border-color:#0099E6;background:#EAF6FF;}
      .aadhi-pay-method .m-icon{width:38px;height:38px;border-radius:10px;background:#fff;
        display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 1px 3px rgba(10,30,60,.12);
        padding:4px;}
      .aadhi-pay-method .m-icon .m-icon-stack{display:flex;align-items:center;justify-content:center;
        gap:4px;flex-wrap:wrap;}
      .aadhi-pay-method .m-text{flex:1;min-width:0;}
      .aadhi-pay-method .m-label{font-weight:700;font-size:14.5px;color:#0F172A;}
      .aadhi-pay-method .m-sub{font-size:12.5px;color:#5B6B82;margin-top:1px;
        white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
      .aadhi-pay-method .m-chev{color:#9AA7B8;flex-shrink:0;}
      .aadhi-pay-footer{padding:4px 16px 20px;}
      .aadhi-pay-btn{width:100%;border:none;border-radius:14px;padding:15px;font-size:15.5px;font-weight:700;
        color:#fff;background:linear-gradient(100deg,#0A4E92 0%,#0099E6 60%,#00C2FF 100%);
        cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;
        box-shadow:0 10px 24px rgba(0,153,230,.35);}
      .aadhi-pay-btn:disabled{opacity:.5;cursor:not-allowed;box-shadow:none;}
      .aadhi-pay-secured{text-align:center;font-size:11.5px;color:#8492A6;margin-top:12px;
        display:flex;align-items:center;justify-content:center;gap:6px;}

      /* -- E-ticket -------------------------------------------------- */
      .aadhi-ticket-overlay{position:fixed;inset:0;z-index:9999;background:rgba(10,20,35,.6);
        display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(3px);
        animation:aadhiPayFade .2s ease;}
      .aadhi-ticket-wrap{width:100%;max-width:560px;animation:aadhiTicketIn .32s cubic-bezier(.22,1,.36,1);}
      @keyframes aadhiTicketIn{from{transform:translateY(30px) scale(.97);opacity:0}to{transform:translateY(0) scale(1);opacity:1}}
      .aadhi-ticket-banner{text-align:center;color:#fff;margin-bottom:16px;font-family:'Inter','Segoe UI',sans-serif;}
      .aadhi-ticket-banner .check{width:52px;height:52px;border-radius:50%;background:#22C55E;
        display:flex;align-items:center;justify-content:center;margin:0 auto 12px;box-shadow:0 8px 20px rgba(34,197,94,.4);}
      .aadhi-ticket-banner h3{font-family:'Sora','Segoe UI',sans-serif;font-size:22px;margin-bottom:3px;}
      .aadhi-ticket-banner p{font-size:14px;opacity:.85;}
      .aadhi-ticket{background:#fff;border-radius:22px;overflow:hidden;box-shadow:0 24px 60px rgba(10,30,60,.45);
        font-family:'Inter','Segoe UI',sans-serif;color:#0F172A;}
      .aadhi-ticket-top{background:linear-gradient(120deg,#0A4E92 0%,#0099E6 100%);color:#fff;padding:26px 30px 20px;}
      .aadhi-ticket-top .t-brand{display:flex;align-items:center;gap:8px;font-weight:700;font-size:13.5px;
        text-transform:uppercase;letter-spacing:.06em;opacity:.9;margin-bottom:12px;}
      .aadhi-ticket-top .t-brand img{width:22px;height:22px;object-fit:contain;border-radius:5px;background:#fff;padding:2px;}
      .aadhi-ticket-top .t-event{font-family:'Sora','Segoe UI',sans-serif;font-size:26px;font-weight:700;line-height:1.25;}
      .aadhi-ticket-top .t-meta{font-size:13.5px;opacity:.9;margin-top:8px;}
      .aadhi-ticket-mid{padding:26px 30px;display:flex;gap:26px;align-items:center;}
      .aadhi-ticket-mid .t-qr{width:140px;height:140px;border-radius:14px;overflow:hidden;flex-shrink:0;
        border:1px solid #E4EAF1;background:#F7FAFC;display:flex;align-items:center;justify-content:center;}
      .aadhi-ticket-mid .t-qr img{width:100%;height:100%;object-fit:contain;}
      .aadhi-ticket-mid .t-fields{flex:1;min-width:0;}
      .aadhi-ticket-row{display:flex;justify-content:space-between;gap:10px;padding:8px 0;
        border-bottom:1px dashed #E4EAF1;}
      .aadhi-ticket-row:last-child{border-bottom:none;}
      .aadhi-ticket-row .t-label{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#8492A6;}
      .aadhi-ticket-row .t-value{font-size:15px;font-weight:700;color:#0F172A;text-align:right;}
      .aadhi-ticket-perforation{position:relative;height:0;border-top:2px dashed #D6DFEA;margin:0 30px;}
      .aadhi-ticket-perforation::before,.aadhi-ticket-perforation::after{content:"";position:absolute;
        top:-11px;width:22px;height:22px;border-radius:50%;background:rgba(10,20,35,.6);}
      .aadhi-ticket-perforation::before{left:-41px;}
      .aadhi-ticket-perforation::after{right:-41px;}
      .aadhi-ticket-bottom{padding:22px 30px 26px;}
      .aadhi-ticket-bib{text-align:center;margin-bottom:18px;}
      .aadhi-ticket-bib .b-label{font-size:12px;text-transform:uppercase;letter-spacing:.06em;color:#8492A6;margin-bottom:3px;}
      .aadhi-ticket-bib .b-value{font-family:'Sora','Segoe UI',sans-serif;font-size:30px;font-weight:800;
        color:#0A4E92;letter-spacing:.02em;}
      .aadhi-ticket-actions{display:flex;gap:12px;}
      .aadhi-ticket-actions button{flex:1;border:none;border-radius:12px;padding:14px;font-size:14.5px;
        font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:7px;}
      .aadhi-ticket-actions button:disabled{opacity:.6;cursor:not-allowed;}
      .aadhi-ticket-btn-primary{color:#fff;background:linear-gradient(100deg,#0A4E92 0%,#0099E6 60%,#00C2FF 100%);
        box-shadow:0 8px 20px rgba(0,153,230,.35);}
      .aadhi-ticket-btn-secondary{background:#F1F5F9;color:#334155;}
      .aadhi-ticket-note{text-align:center;font-size:12px;color:#8492A6;margin-top:14px;}
      @media (max-width:600px){
        .aadhi-ticket-mid{flex-direction:column;}
        .aadhi-ticket-mid .t-qr{width:120px;height:120px;}
        .aadhi-ticket-perforation::before{left:-11px;}
        .aadhi-ticket-perforation::after{right:-11px;}
      }
      @media print{
        body *{visibility:hidden;}
        .aadhi-ticket-overlay,.aadhi-ticket-overlay *{visibility:visible;}
        .aadhi-ticket-overlay{position:absolute;inset:0;background:#fff;padding:0;backdrop-filter:none;}
        .aadhi-ticket-banner,.aadhi-ticket-actions,.aadhi-ticket-note{display:none;}
      }
    `;
    document.head.appendChild(style);
  }

  function closeSheet(overlay) {
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    document.body.style.overflow = "";
  }

  function getLogoSrc() {
    // Reuse whatever logo the page itself is already using (respects
    // Django's hashed static filenames) rather than hardcoding a path.
    const navLogo = document.querySelector(".nav-logo-img");
    if (navLogo && navLogo.src) return navLogo.src;
    return "/static/media/aadhi-logo-nav.png";
  }

  function showMethodPicker(data, { onSuccess, onError } = {}) {
    injectStyles();

    let selected = "upi";
    const overlay = document.createElement("div");
    overlay.className = "aadhi-pay-overlay";
    const logoSrc = getLogoSrc();
    const badgeHtml = `<span class="badge"><img src="${logoSrc}" alt="AADHI Events" onerror="this.parentNode.classList.add('fallback');this.remove();this.parentNode.textContent='A';"></span>`;

    const methodRows = METHODS.map(
      (m) => `
      <button type="button" class="aadhi-pay-method${m.id === selected ? " selected" : ""}" data-method="${m.id}">
        <span class="m-icon">${m.icon}</span>
        <span class="m-text">
          <span class="m-label">${m.label}</span>
          <span class="m-sub">${m.sub}</span>
        </span>
        <span class="m-chev">
          <svg viewBox="0 0 24 24" width="18" height="18"><path fill="none" stroke="currentColor" stroke-width="2" d="M9 6l6 6-6 6" stroke-linecap="round" stroke-linejoin="round"/></svg>
        </span>
      </button>`
    ).join("");

    overlay.innerHTML = `
      <div class="aadhi-pay-sheet" role="dialog" aria-modal="true" aria-label="Payment options">
        <div class="aadhi-pay-head">
          <button type="button" class="aadhi-pay-close" aria-label="Close">&times;</button>
          <div class="aadhi-pay-brand">
            ${badgeHtml}
            <span>AADHI Events</span>
          </div>
          <div class="aadhi-pay-amount-label">Amount to pay</div>
          <div class="aadhi-pay-amount">${formatRupees(data.amount)}</div>
        </div>
        <div class="aadhi-pay-body">
          ${methodRows}
        </div>
        <div class="aadhi-pay-footer">
          <button type="button" class="aadhi-pay-btn" id="aadhi-pay-cta">
            <svg viewBox="0 0 24 24" width="16" height="16"><path fill="currentColor" d="M12 1a5 5 0 0 0-5 5v3H6a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2h-1V6a5 5 0 0 0-5-5zm0 2a3 3 0 0 1 3 3v3H9V6a3 3 0 0 1 3-3z"/></svg>
            <span id="aadhi-pay-cta-label">Pay ${formatRupees(data.amount)}</span>
          </button>
          <div class="aadhi-pay-secured">
            <svg viewBox="0 0 24 24" width="13" height="13"><path fill="currentColor" d="M12 1l8 4v6c0 5.2-3.4 9.9-8 11-4.6-1.1-8-5.8-8-11V5l8-4z"/></svg>
            Demo payment — no charge is made
          </div>
        </div>
      </div>
    `;

    overlay.querySelectorAll(".aadhi-pay-method").forEach((btn) => {
      btn.addEventListener("click", () => {
        selected = btn.getAttribute("data-method");
        overlay.querySelectorAll(".aadhi-pay-method").forEach((b) => b.classList.remove("selected"));
        btn.classList.add("selected");
      });
    });

    overlay.querySelector(".aadhi-pay-close").addEventListener("click", () => {
      closeSheet(overlay);
      if (onError) onError(new Error("Payment was cancelled."));
    });

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) {
        closeSheet(overlay);
        if (onError) onError(new Error("Payment was cancelled."));
      }
    });

    overlay.querySelector("#aadhi-pay-cta").addEventListener("click", () => {
      simulateDemoPayment(data, selected, {
        onSuccess: (res) => {
          closeSheet(overlay);
          if (onSuccess) onSuccess(res);
        },
        onError: (err) => {
          closeSheet(overlay);
          if (onError) onError(err);
        },
      });
    });

    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";
  }

  function formatEventDate(iso) {
    if (!iso) return "";
    try {
      const d = new Date(iso);
      return d.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
    } catch (e) {
      return "";
    }
  }

  function closeTicket(overlay) {
    if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
    document.body.style.overflow = "";
  }

  let html2canvasPromise = null;
  function loadHtml2Canvas() {
    if (window.html2canvas) return Promise.resolve(window.html2canvas);
    if (!html2canvasPromise) {
      html2canvasPromise = new Promise((resolve, reject) => {
        const script = document.createElement("script");
        script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
        script.onload = () => resolve(window.html2canvas);
        script.onerror = () => reject(new Error("Could not load the ticket image generator."));
        document.head.appendChild(script);
      });
    }
    return html2canvasPromise;
  }

  async function downloadTicket(overlay, reg) {
    const btn = overlay.querySelector("#aadhi-ticket-download");
    const label = btn ? btn.querySelector(".dl-label") : null;
    const originalLabel = label ? label.textContent : "";
    if (btn) btn.disabled = true;
    if (label) label.textContent = "Preparing…";

    try {
      const html2canvas = await loadHtml2Canvas();
      const ticketEl = overlay.querySelector(".aadhi-ticket");
      const canvas = await html2canvas(ticketEl, { backgroundColor: "#ffffff", scale: 2 });
      const link = document.createElement("a");
      link.download = `AADHI-Ticket-${reg.bib_number || reg.id || "ticket"}.png`;
      link.href = canvas.toDataURL("image/png");
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      // Offline / blocked CDN — fall back to the browser's print dialog,
      // which can still "Save as PDF".
      window.print();
    } finally {
      if (btn) btn.disabled = false;
      if (label) label.textContent = originalLabel;
    }
  }

  function showTicket(reg) {
    injectStyles();

    const logoSrc = getLogoSrc();
    const overlay = document.createElement("div");
    overlay.className = "aadhi-ticket-overlay";

    const qrHtml = reg.qr_code
      ? `<img src="${reg.qr_code}" alt="Entry QR code">`
      : `<svg viewBox="0 0 24 24" width="34" height="34"><path fill="#9AA7B8" d="M3 3h8v8H3V3zm2 2v4h4V5H5zm8-2h8v8h-8V3zm2 2v4h4V5h-4zM3 13h8v8H3v-8zm2 2v4h4v-4H5zm10-2h2v2h-2zm4 0h2v2h-2zm-4 4h2v2h-2zm4 0h2v2h-2zm-2 4h2v2h-2z"/></svg>`;

    overlay.innerHTML = `
      <div class="aadhi-ticket-wrap">
        <div class="aadhi-ticket-banner">
          <div class="check">
            <svg viewBox="0 0 24 24" width="24" height="24"><path fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" d="M5 13l4 4L19 7"/></svg>
          </div>
          <h3>Payment Successful</h3>
          <p>Your ticket is confirmed. See you at the start line!</p>
        </div>
        <div class="aadhi-ticket">
          <div class="aadhi-ticket-top">
            <div class="t-brand"><img src="${logoSrc}" alt="AADHI"> AADHI Events</div>
            <div class="t-event">${reg.event || "Event Registration"}</div>
            <div class="t-meta">${[reg.category, formatEventDate(reg.event_date), reg.event_location]
              .filter(Boolean)
              .join(" · ")}</div>
          </div>
          <div class="aadhi-ticket-mid">
            <div class="t-qr">${qrHtml}</div>
            <div class="t-fields">
              <div class="aadhi-ticket-row"><span class="t-label">Name</span><span class="t-value">${reg.name || "—"}</span></div>
              <div class="aadhi-ticket-row"><span class="t-label">Category</span><span class="t-value">${reg.category || "—"}</span></div>
              <div class="aadhi-ticket-row"><span class="t-label">Amount Paid</span><span class="t-value">${
                reg.amount ? "₹" + Number(reg.amount).toLocaleString("en-IN") : "—"
              }</span></div>
            </div>
          </div>
          <div class="aadhi-ticket-perforation"></div>
          <div class="aadhi-ticket-bottom">
            <div class="aadhi-ticket-bib">
              <div class="b-label">Bib Number</div>
              <div class="b-value">${reg.bib_number || "—"}</div>
            </div>
            <div class="aadhi-ticket-actions">
              <button type="button" class="aadhi-ticket-btn-secondary" id="aadhi-ticket-cancel">Cancel</button>
              <button type="button" class="aadhi-ticket-btn-primary" id="aadhi-ticket-download">
                <svg viewBox="0 0 24 24" width="15" height="15"><path fill="currentColor" d="M12 3a1 1 0 0 1 1 1v9.59l3.3-3.3a1 1 0 1 1 1.4 1.42l-5 5a1 1 0 0 1-1.4 0l-5-5a1 1 0 1 1 1.4-1.42l3.3 3.3V4a1 1 0 0 1 1-1zM5 19a1 1 0 0 1 1-1h12a1 1 0 1 1 0 2H6a1 1 0 0 1-1-1z"/></svg>
                <span class="dl-label">Download Ticket</span>
              </button>
            </div>
          </div>
        </div>
        <p class="aadhi-ticket-note">A copy has also been emailed to ${reg.email || "you"}.</p>
      </div>
    `;

    overlay.querySelector("#aadhi-ticket-cancel").addEventListener("click", () => closeTicket(overlay));
    overlay.querySelector("#aadhi-ticket-download").addEventListener("click", () => downloadTicket(overlay, reg));
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) closeTicket(overlay);
    });

    document.body.appendChild(overlay);
    document.body.style.overflow = "hidden";
  }

  async function openCheckout(registrationId, { onSuccess, onError } = {}) {
    if (!registrationId) {
      if (onError) onError(new Error("Missing registration id — cannot start payment."));
      return;
    }

    try {
      const res = await fetch("/create-payment/", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CSRFToken": getCookie("csrftoken"),
        },
        body: JSON.stringify({ registration_id: registrationId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok || data.ok === false) {
        throw new Error(data.error || "Could not start payment. Please try again.");
      }

      showMethodPicker(data, { onSuccess, onError });
    } catch (err) {
      if (onError) onError(err);
    }
  }

  return { openCheckout, getCookie, showTicket };
})();

console.log("Payment JS Loaded");
