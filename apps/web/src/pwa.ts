export async function registerServiceWorker(): Promise<ServiceWorkerRegistration | undefined> {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return undefined;

  try {
    return await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  } catch (error) {
    console.error('Service worker gagal didaftarkan', error);
    return undefined;
  }
}
