// Addis Ababa, Ethiopia prayer times
// Based on user-provided accurate times:
// Asr ~3:42 PM, Maghrib ~6:20 PM, Isha ~7:35 PM

export interface PrayerTime {
  name: string;
  arabic: string;
  time: string;       // display string e.g. "5:08 AM"
  hour: number;       // 24h
  minute: number;
  icon: string;
}

// Monthly approximate prayer times for Addis Ababa (adjusted for accuracy)
// Format: 24h internal; displayed as 12h with AM/PM
const monthlyTimes: Record<number, { fajr: string; dhuhr: string; asr: string; maghrib: string; isha: string }> = {
  1:  { fajr: "05:10", dhuhr: "12:25", asr: "15:45", maghrib: "18:22", isha: "19:38" },
  2:  { fajr: "05:05", dhuhr: "12:22", asr: "15:42", maghrib: "18:20", isha: "19:35" },
  3:  { fajr: "04:58", dhuhr: "12:18", asr: "15:42", maghrib: "18:20", isha: "19:35" },
  4:  { fajr: "04:48", dhuhr: "12:13", asr: "15:38", maghrib: "18:15", isha: "19:28" },
  5:  { fajr: "04:40", dhuhr: "12:10", asr: "15:35", maghrib: "18:12", isha: "19:25" },
  6:  { fajr: "04:38", dhuhr: "12:09", asr: "15:33", maghrib: "18:10", isha: "19:22" },
  7:  { fajr: "04:42", dhuhr: "12:11", asr: "15:35", maghrib: "18:12", isha: "19:25" },
  8:  { fajr: "04:50", dhuhr: "12:14", asr: "15:38", maghrib: "18:15", isha: "19:28" },
  9:  { fajr: "04:57", dhuhr: "12:16", asr: "15:40", maghrib: "18:16", isha: "19:29" },
  10: { fajr: "05:03", dhuhr: "12:19", asr: "15:42", maghrib: "18:19", isha: "19:33" },
  11: { fajr: "05:08", dhuhr: "12:23", asr: "15:44", maghrib: "18:22", isha: "19:37" },
  12: { fajr: "05:12", dhuhr: "12:26", asr: "15:46", maghrib: "18:24", isha: "19:40" },
};

function parseTime(timeStr: string): { hour: number; minute: number } {
  const [h, m] = timeStr.split(":").map(Number);
  return { hour: h, minute: m };
}

/** Format 24h "HH:MM" → "h:MM AM/PM" */
function to12h(timeStr: string): string {
  const [h, m] = timeStr.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  const mm = m.toString().padStart(2, "0");
  return `${h12}:${mm} ${period}`;
}

export function getPrayerTimes(): PrayerTime[] {
  const month = new Date().getMonth() + 1;
  const times = monthlyTimes[month] || monthlyTimes[1];

  return [
    { name: "Fajr",    arabic: "الفجر",  time: to12h(times.fajr),    ...parseTime(times.fajr),    icon: "🌙" },
    { name: "Dhuhr",   arabic: "الظهر",  time: to12h(times.dhuhr),   ...parseTime(times.dhuhr),   icon: "☀️" },
    { name: "Asr",     arabic: "العصر",  time: to12h(times.asr),     ...parseTime(times.asr),     icon: "🌤️" },
    { name: "Maghrib", arabic: "المغرب", time: to12h(times.maghrib),  ...parseTime(times.maghrib), icon: "🌅" },
    { name: "Isha",    arabic: "العشاء", time: to12h(times.isha),     ...parseTime(times.isha),    icon: "🌃" },
  ];
}

export function getCurrentAndNextPrayer(): {
  current: PrayerTime | null;
  next: PrayerTime;
  countdown: string;
} {
  const prayers = getPrayerTimes();
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  let currentPrayer: PrayerTime | null = null;
  let nextPrayer = prayers[0];

  for (let i = 0; i < prayers.length; i++) {
    const prayerMinutes = prayers[i].hour * 60 + prayers[i].minute;
    const nextIdx = (i + 1) % prayers.length;
    const nextPrayerMinutes = prayers[nextIdx].hour * 60 + prayers[nextIdx].minute;

    if (nowMinutes >= prayerMinutes) {
      if (i === prayers.length - 1 || nowMinutes < nextPrayerMinutes) {
        currentPrayer = prayers[i];
        nextPrayer = prayers[nextIdx];
      }
    }
  }

  const nextMinutes = nextPrayer.hour * 60 + nextPrayer.minute;
  let diffMinutes = nextMinutes - nowMinutes;
  if (diffMinutes < 0) diffMinutes += 24 * 60;

  const hours = Math.floor(diffMinutes / 60);
  const minutes = diffMinutes % 60;
  const countdown = hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`;

  return { current: currentPrayer, next: nextPrayer, countdown };
}
