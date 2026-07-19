/* ================================================
   SCHEDLY — PWA Manager (pwa.js)
   Handles: SW registration, install prompt,
            SW update detection, standalone mode
   ================================================ */

/* ──────────────────────────────────────────────
   1. SERVICE WORKER REGISTRATION & UPDATE FLOW
   ────────────────────────────────────────────── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('[PWA] Service Worker registered. Scope:', registration.scope);

        // ── Detect SW update ──────────────────
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (!newWorker) return;

          newWorker.addEventListener('statechange', () => {
            if (
              newWorker.state === 'installed' &&
              navigator.serviceWorker.controller
            ) {
              console.log('[PWA] New version available — showing update toast');
              showUpdateToast();
            }
          });
        });
      })
      .catch((err) => {
        console.error('[PWA] Service Worker registration failed:', err);
      });

    // Reload page when new SW takes control
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[PWA] New Service Worker active — reloading page');
      window.location.reload();
    });
  });
}

/* ──────────────────────────────────────────────
   2. INSTALL PROMPT (beforeinstallprompt)
   ────────────────────────────────────────────── */
let _deferredInstallPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault(); // Prevent mini-infobar
  _deferredInstallPrompt = e;
  console.log('[PWA] beforeinstallprompt captured — making install buttons visible');
  _showAllInstallUI();
});

// Hide all install UI permanently once installed
window.addEventListener('appinstalled', () => {
  console.log('[PWA] App installed successfully');
  _deferredInstallPrompt = null;
  _hideAllInstallUI();
});

/* ──────────────────────────────────────────────
   3. STANDALONE MODE DETECTION
   ────────────────────────────────────────────── */
function isStandaloneMode() {
  return (
    window.matchMedia('(display-mode: standalone)').matches ||
    window.navigator.standalone === true ||
    document.referrer.includes('android-app://')
  );
}

/* ──────────────────────────────────────────────
   4. SHOW / HIDE ALL INSTALL UI SURFACES
   ────────────────────────────────────────────── */
function _showAllInstallUI() {
  // Guard: never show install UI when already running installed
  if (isStandaloneMode()) return;

  // Topbar button
  const topbarBtn = document.getElementById('btn-pwa-install');
  if (topbarBtn) topbarBtn.classList.add('pwa-ready');

  // Sidebar button
  const sidebarBtn = document.getElementById('sidebar-pwa-install');
  if (sidebarBtn) sidebarBtn.classList.add('pwa-ready');

  // Floating banner (secondary — appears after a short delay)
  setTimeout(showInstallBanner, 1500);
}

function _hideAllInstallUI() {
  const topbarBtn  = document.getElementById('btn-pwa-install');
  const sidebarBtn = document.getElementById('sidebar-pwa-install');
  if (topbarBtn)  topbarBtn.classList.remove('pwa-ready');
  if (sidebarBtn) sidebarBtn.classList.remove('pwa-ready');
  hideInstallBanner();
}

/* ──────────────────────────────────────────────
   5. TRIGGER INSTALL  (called by all 3 buttons)
   ────────────────────────────────────────────── */
async function triggerInstall() {
  if (!_deferredInstallPrompt) {
    // Prompt not available — show browser guidance
    _showInstallGuidance();
    return;
  }
  _deferredInstallPrompt.prompt();
  const { outcome } = await _deferredInstallPrompt.userChoice;
  console.log('[PWA] Install prompt outcome:', outcome);
  _deferredInstallPrompt = null;
  if (outcome === 'accepted') {
    _hideAllInstallUI();
  }
}

function _showInstallGuidance() {
  injectPWAStyles();
  // Show a brief toast explaining how to install manually
  const existing = document.getElementById('pwa-guidance-toast');
  if (existing) { existing.remove(); }

  const toast = document.createElement('div');
  toast.id = 'pwa-guidance-toast';
  toast.setAttribute('role', 'status');

  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const msg = isIOS
    ? '📱 Di Safari: ketuk ikon Share → "Add to Home Screen"'
    : '💡 Muat ulang halaman sekali, lalu tombol install akan aktif';

  toast.innerHTML = `
    <span>${msg}</span>
    <button onclick="this.closest('#pwa-guidance-toast').remove()" aria-label="Tutup">✕</button>
  `;
  toast.style.cssText = `
    position:fixed; bottom:24px; left:50%; transform:translateX(-50%);
    background:#1E1E2E; color:#E8E8F0; border:1px solid rgba(92,106,196,0.4);
    border-radius:12px; padding:12px 16px; display:flex; align-items:center;
    gap:12px; font-family:'DM Sans',sans-serif; font-size:0.85rem;
    box-shadow:0 4px 24px rgba(0,0,0,0.3); z-index:9999; max-width:90vw;
  `;
  toast.querySelector('button').style.cssText =
    'background:none;border:none;color:#9099B0;cursor:pointer;font-size:1rem;line-height:1;';
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 6000);
}

/* ──────────────────────────────────────────────
   6. FLOATING INSTALL BANNER UI
   ────────────────────────────────────────────── */
function showInstallBanner() {
  if (document.getElementById('pwa-install-banner')) return;
  if (isStandaloneMode()) return;

  injectPWAStyles();

  const banner = document.createElement('div');
  banner.id = 'pwa-install-banner';
  banner.setAttribute('role', 'dialog');
  banner.setAttribute('aria-label', 'Install Schedly');
  banner.innerHTML = `
    <div class="pwa-banner-inner">
      <img src="/icons/icon-72.png" alt="Schedly" class="pwa-banner-icon" onerror="this.style.display='none'">
      <div class="pwa-banner-text">
        <span class="pwa-banner-title">Install Schedly</span>
        <span class="pwa-banner-sub">Tambahkan ke layar utama untuk akses cepat</span>
      </div>
      <div class="pwa-banner-actions">
        <button class="pwa-btn-install" onclick="triggerInstall()">Install</button>
        <button class="pwa-btn-dismiss" onclick="dismissInstallBanner()" aria-label="Tutup">✕</button>
      </div>
    </div>
  `;
  document.body.appendChild(banner);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => { banner.classList.add('pwa-banner-visible'); });
  });
}

function hideInstallBanner() {
  const banner = document.getElementById('pwa-install-banner');
  if (!banner) return;
  banner.classList.remove('pwa-banner-visible');
  setTimeout(() => banner.remove(), 350);
}

function dismissInstallBanner() {
  hideInstallBanner();
}

/* ──────────────────────────────────────────────
   7. SW UPDATE TOAST UI
   ────────────────────────────────────────────── */
function showUpdateToast() {
  if (document.getElementById('pwa-update-toast')) return;
  injectPWAStyles();

  const toast = document.createElement('div');
  toast.id = 'pwa-update-toast';
  toast.setAttribute('role', 'alert');
  toast.innerHTML = `
    <span class="pwa-update-msg">⚡ Versi baru tersedia</span>
    <button class="pwa-update-btn" onclick="applyUpdate()">Perbarui</button>
    <button class="pwa-update-close" onclick="this.closest('#pwa-update-toast').remove()" aria-label="Tutup">✕</button>
  `;
  document.body.appendChild(toast);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => { toast.classList.add('pwa-toast-visible'); });
  });

  setTimeout(() => {
    const t = document.getElementById('pwa-update-toast');
    if (t) { t.classList.remove('pwa-toast-visible'); setTimeout(() => t.remove(), 350); }
  }, 30000);
}

function applyUpdate() {
  if (navigator.serviceWorker.controller) {
    navigator.serviceWorker.controller.postMessage({ type: 'SKIP_WAITING' });
  }
  navigator.serviceWorker.getRegistration('/').then((reg) => {
    if (reg && reg.waiting) reg.waiting.postMessage({ type: 'SKIP_WAITING' });
  });
}

/* ──────────────────────────────────────────────
   8. INJECTED STYLES (all PWA overlay elements)
   ────────────────────────────────────────────── */
function injectPWAStyles() {
  if (document.getElementById('pwa-styles')) return;

  const style = document.createElement('style');
  style.id = 'pwa-styles';
  style.textContent = `
    /* ── Install Banner ── */
    #pwa-install-banner {
      position: fixed;
      bottom: 0; left: 0; right: 0;
      z-index: 9999;
      padding: 0 16px 16px;
      transform: translateY(110%);
      transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
      pointer-events: none;
    }
    #pwa-install-banner.pwa-banner-visible {
      transform: translateY(0);
      pointer-events: all;
    }
    .pwa-banner-inner {
      display: flex;
      align-items: center;
      gap: 12px;
      background: #1E1E2E;
      color: #E8E8F0;
      border-radius: 16px;
      padding: 14px 16px;
      box-shadow: 0 -4px 32px rgba(0,0,0,0.25), 0 8px 32px rgba(0,0,0,0.3);
      max-width: 480px;
      margin: 0 auto;
      border: 1px solid rgba(92,106,196,0.3);
    }
    .pwa-banner-icon {
      width: 44px; height: 44px;
      border-radius: 10px; flex-shrink: 0;
    }
    .pwa-banner-text {
      flex: 1; min-width: 0;
      display: flex; flex-direction: column; gap: 2px;
    }
    .pwa-banner-title {
      font-family: 'Sora','DM Sans',sans-serif;
      font-size: 0.9rem; font-weight: 600; color: #E8E8F0;
    }
    .pwa-banner-sub {
      font-size: 0.75rem; color: #9099B0;
      white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
    }
    .pwa-banner-actions {
      display: flex; align-items: center; gap: 8px; flex-shrink: 0;
    }
    .pwa-btn-install {
      background: #5C6AC4; color: #fff;
      border: none; padding: 8px 16px; border-radius: 8px;
      font-size: 0.85rem; font-weight: 600;
      cursor: pointer; transition: background 0.15s; white-space: nowrap;
    }
    .pwa-btn-install:hover { background: #3F4EA8; }
    .pwa-btn-dismiss {
      background: transparent; border: none; color: #9099B0;
      cursor: pointer; font-size: 1rem; padding: 4px 6px;
      border-radius: 6px; line-height: 1;
    }
    .pwa-btn-dismiss:hover { color: #E8E8F0; }

    /* ── Update Toast ── */
    #pwa-update-toast {
      position: fixed;
      top: 72px; right: 16px;
      z-index: 9999;
      display: flex; align-items: center; gap: 10px;
      background: #1E1E2E; color: #E8E8F0;
      border-radius: 12px; padding: 12px 16px;
      box-shadow: 0 4px 24px rgba(0,0,0,0.3);
      border: 1px solid rgba(92,106,196,0.4);
      max-width: 320px;
      transform: translateX(calc(100% + 32px));
      transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
    }
    #pwa-update-toast.pwa-toast-visible { transform: translateX(0); }
    .pwa-update-msg {
      font-family: 'DM Sans',sans-serif;
      font-size: 0.85rem; font-weight: 500; flex: 1;
    }
    .pwa-update-btn {
      background: #5C6AC4; color: #fff;
      border: none; padding: 6px 12px; border-radius: 6px;
      font-size: 0.8rem; font-weight: 600;
      cursor: pointer; white-space: nowrap;
    }
    .pwa-update-btn:hover { background: #3F4EA8; }
    .pwa-update-close {
      background: transparent; border: none;
      color: #9099B0; cursor: pointer;
      font-size: 0.85rem; padding: 2px 4px; border-radius: 4px;
    }
    .pwa-update-close:hover { color: #E8E8F0; }

    @media (max-width: 480px) {
      #pwa-update-toast {
        top: auto; bottom: 100px;
        right: 12px; left: 12px; max-width: none;
        transform: translateY(calc(100% + 32px));
      }
      #pwa-update-toast.pwa-toast-visible { transform: translateY(0); }
      .pwa-banner-sub { display: none; }
    }
  `;
  document.head.appendChild(style);
}

/* ──────────────────────────────────────────────
   9. INIT — run after DOM ready
   ────────────────────────────────────────────── */
document.addEventListener('DOMContentLoaded', () => {
  // If already running in standalone (installed), hide all install UI
  if (isStandaloneMode()) {
    console.log('[PWA] Running in standalone mode — install UI suppressed');
    return;
  }

  // Check if install prompt already captured before DOMContentLoaded
  // (can happen on fast loads where beforeinstallprompt fires early)
  if (_deferredInstallPrompt) {
    _showAllInstallUI();
  }
});
