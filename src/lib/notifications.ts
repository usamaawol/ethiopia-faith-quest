// Browser notification system for Ramadan Faith app
// Schedules reminders for prayer times, azkar, and quran

export type NotifCategory = "prayer" | "azkar" | "quran" | "challenge";

export async function requestNotificationPermission(): Promise<boolean> {
  if (!("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}

export function isNotificationsSupported(): boolean {
  return "Notification" in window && "serviceWorker" in navigator;
}

export function getPermissionStatus(): NotificationPermission | "unsupported" {
  if (!("Notification" in window)) return "unsupported";
  return Notification.permission;
}

function showNotification(title: string, body: string, icon = "/favicon.ico", tag = "ramadan-faith") {
  if (Notification.permission !== "granted") return;
  try {
    new Notification(title, { body, icon, tag, badge: "/favicon.ico" });
  } catch (_) {}
}

// Schedule a one-time notification at a given time (hours, minutes, 24h)
export function scheduleNotification(
  title: string,
  body: string,
  hour: number,
  minute: number,
  tag: string
): ReturnType<typeof setTimeout> | null {
  const now = new Date();
  const target = new Date();
  target.setHours(hour, minute, 0, 0);
  if (target <= now) target.setDate(target.getDate() + 1); // schedule for tomorrow if already past

  const delay = target.getTime() - now.getTime();
  return setTimeout(() => showNotification(title, body, undefined, tag), delay);
}

// Schedule all daily reminders
export function scheduleDailyReminders(
  prayerTimes: Array<{ name: string; hour: number; minute: number }>
): ReturnType<typeof setTimeout>[] {
  const timers: ReturnType<typeof setTimeout>[] = [];

  // Prayer reminders (5 min before)
  prayerTimes.forEach((p) => {
    let h = p.hour;
    let m = p.minute - 5;
    if (m < 0) { m += 60; h -= 1; }
    if (h < 0) h += 24;
    const t = scheduleNotification(
      `🕌 ${p.name} Time Soon`,
      `${p.name} prayer is in 5 minutes. Prepare yourself.`,
      h, m, `prayer-${p.name}`
    );
    if (t) timers.push(t);
  });

  // Morning Azkar reminder – 30 min after Fajr
  const fajr = prayerTimes[0];
  if (fajr) {
    let h = fajr.hour;
    let m = fajr.minute + 30;
    if (m >= 60) { m -= 60; h += 1; }
    const t = scheduleNotification("🌅 Morning Azkar", "Start your day with Morning Azkar", h, m, "azkar-morning");
    if (t) timers.push(t);
  }

  // Evening Azkar reminder – 30 min after Asr
  const asr = prayerTimes[2];
  if (asr) {
    let h = asr.hour;
    let m = asr.minute + 30;
    if (m >= 60) { m -= 60; h += 1; }
    const t = scheduleNotification("🌙 Evening Azkar", "Don't forget your Evening Azkar!", h, m, "azkar-evening");
    if (t) timers.push(t);
  }

  // Quran reminder – 9 AM daily
  const t1 = scheduleNotification("📖 Quran Challenge", "Have you read your Quran today?", 9, 0, "quran-daily");
  if (t1) timers.push(t1);

  // Evening Quran reminder – 8 PM
  const t2 = scheduleNotification("📖 Quran Reminder", "Complete your daily Quran goal before sleep!", 20, 0, "quran-evening");
  if (t2) timers.push(t2);

  // Sleep Azkar – 10 PM
  const t3 = scheduleNotification("😴 Sleep Azkar", "Read your sleep Azkar before bed.", 22, 0, "azkar-sleep");
  if (t3) timers.push(t3);

  return timers;
}

export function clearReminders(timers: ReturnType<typeof setTimeout>[]) {
  timers.forEach(clearTimeout);
}
