export function formatMeetingTime(date: Date, timeZone: string = 'Asia/Kolkata') {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(date) + ` (${timeZone})`;
}
