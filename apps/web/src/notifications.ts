import { api } from './api';

const SEEN_PREFIX = 'el.notification.';

export function notificationsSupported(): boolean {
  return 'Notification' in window;
}

export async function requestNotificationPermission(): Promise<NotificationPermission> {
  if (!notificationsSupported()) return 'denied';
  return Notification.requestPermission();
}

async function showNotification(
  id: string,
  title: string,
  body: string,
  url: string,
): Promise<void> {
  const seenKey = `${SEEN_PREFIX}${id}`;
  if (localStorage.getItem(seenKey)) return;

  const registration = await navigator.serviceWorker?.getRegistration();
  if (registration) {
    await registration.showNotification(title, {
      body,
      icon: '/icons/icon.svg',
      badge: '/icons/icon.svg',
      tag: id,
      data: { url },
    });
  } else {
    new Notification(title, { body, icon: '/icons/icon.svg', tag: id });
  }
  localStorage.setItem(seenKey, new Date().toISOString());
}

export async function checkDueNotifications(now = new Date()): Promise<void> {
  if (!notificationsSupported() || Notification.permission !== 'granted') return;

  const from = new Date(now.getTime() - 15 * 60_000);
  const to = new Date(now.getTime() + 24 * 60 * 60_000);
  const [hearings, cases] = await Promise.all([
    api.listHearings({ from: from.toISOString(), to: to.toISOString() }),
    api.listCases({ limit: 100 }),
  ]);

  const reminders = await Promise.all(hearings.map((hearing) => api.listReminders(hearing.id)));
  for (const [index, items] of reminders.entries()) {
    const hearing = hearings[index];
    for (const reminder of items) {
      const triggerAt = new Date(reminder.triggerAt);
      if (reminder.status === 'PENDING' && triggerAt >= from && triggerAt <= now) {
        await showNotification(
          `hearing-${reminder.id}`,
          'Pengingat sidang',
          `${hearing.case.caseNumber} · ${new Date(hearing.startsAt).toLocaleString('id-ID')}`,
          '/sidang',
        );
      }
    }
  }

  const integrityResults = await Promise.allSettled(
    cases.items.map((item) => api.caseIntegrity(item.id)),
  );
  for (const [index, result] of integrityResults.entries()) {
    if (result.status !== 'fulfilled') continue;
    const caseItem = cases.items[index];
    for (const deadline of result.value.deadlines) {
      const dueAt = new Date(deadline.dueAt);
      if (deadline.status === 'OPEN' && dueAt >= now && dueAt <= to) {
        await showNotification(
          `deadline-${deadline.id}`,
          'Deadline perkara mendekat',
          `${caseItem.caseNumber} · ${deadline.label} · ${dueAt.toLocaleString('id-ID')}`,
          `/perkara/${caseItem.id}`,
        );
      }
    }
  }
}
