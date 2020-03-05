export default function register(newVersionAvailableAction) {
  // Register the service worker in production if it exists in the navigator interface
  if (process.env.NODE_ENV === 'production' && 'serviceWorker' in navigator) {
    // When the window loads, register the service worker, check for app updates,
    // and take the necessary action
    window.addEventListener('load', () => {
      // Register the service worker, then...
      navigator.serviceWorker.register('./service-worker.js')
        // If an app update is found, execute the passed in action
        .then((reg) => {
          reg.onupdatefound = () => {
            const installingWorker = reg.installing;
            installingWorker.onstatechange = () => {
              if (installingWorker.state === 'installed' && navigator.serviceWorker.controller) {
                newVersionAvailableAction();
              }
            };
          };
        });
    });
  }
}

export function unregister() {
  // Unregister the service worker if it exists in the navigator interface and is active
  if ('serviceWorker' in navigator) {
    // If the service worker is active...
    navigator.serviceWorker.ready
      .then((registration) => {
        // Unregister the service worker
        registration.unregister();
      });
  }
}
