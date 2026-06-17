/* ================================================
   SCHEDLY — PWA Manager (pwa.js)
   ================================================ */

// Register Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        console.log('Service Worker registered successfully, scope:', reg.scope);
      })
      .catch((err) => {
        console.error('Service Worker registration failed:', err);
      });
  });
}

// Handle Install Prompt (PWA)
let deferredPrompt = null;

window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent browser from showing automatic install prompt
  e.preventDefault();
  // Save event for triggering later
  deferredPrompt = e;

  // Show install section/button in UI
  const installSection = document.getElementById('install-section');
  const installBtn = document.getElementById('btn-install-app');

  if (installSection) {
    installSection.style.display = 'block';
  }
  if (installBtn) {
    installBtn.style.display = 'flex';
  }
});

// Setup click event for the install button
document.addEventListener('DOMContentLoaded', () => {
  const installBtn = document.getElementById('btn-install-app');
  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (!deferredPrompt) return;

      // Show the installation prompt
      deferredPrompt.prompt();

      // Wait for user choice
      const { outcome } = await deferredPrompt.userChoice;
      console.log(`User installation choice: ${outcome}`);

      // Reset deferredPrompt
      deferredPrompt = null;

      // Hide the install button
      const installSection = document.getElementById('install-section');
      if (installSection) {
        installSection.style.display = 'none';
      }
    });
  }
});

// App installed event handler
window.addEventListener('appinstalled', (evt) => {
  console.log('Schedly was successfully installed!');
  const installSection = document.getElementById('install-section');
  if (installSection) {
    installSection.style.display = 'none';
  }
});
