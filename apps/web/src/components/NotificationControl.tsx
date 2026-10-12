import { useEffect, useState } from 'react';
import {
  checkDueNotifications,
  notificationsSupported,
  requestNotificationPermission,
} from '../notifications';

export default function NotificationControl() {
  const supported = notificationsSupported();
  const [permission, setPermission] = useState<NotificationPermission>(
    supported ? Notification.permission : 'denied',
  );

  useEffect(() => {
    if (permission !== 'granted') return undefined;
    void checkDueNotifications();
    const timer = window.setInterval(() => void checkDueNotifications(), 60_000);
    return () => window.clearInterval(timer);
  }, [permission]);

  if (!supported || permission === 'denied') return null;

  return (
    <button
      className="btn btn-ghost btn-sm"
      type="button"
      onClick={async () => {
        const result = await requestNotificationPermission();
        setPermission(result);
        if (result === 'granted') await checkDueNotifications();
      }}
      aria-label="Aktifkan notifikasi pengingat sidang dan deadline"
      disabled={permission === 'granted'}
    >
      {permission === 'granted' ? '🔔 Notifikasi aktif' : '🔕 Aktifkan notifikasi'}
    </button>
  );
}
