/** Use local calendar dates in pickers and convert the selected wall time to UTC once. */
export const upcomingDates = (count: number) => Array.from({ length: count }, (_, index) => {
  const date = new Date();
  date.setDate(date.getDate() + index + 1);
  const isoDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  return { isoDate, label: index === 0 ? 'Tomorrow' : date.toLocaleDateString('en-IN', { weekday: 'long' }), dateStr: date.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }), day: date.toLocaleDateString('en-IN', { weekday: 'short' }), date: String(date.getDate()), month: date.toLocaleDateString('en-IN', { month: 'short' }), full: isoDate };
});

export const appointmentTime = (date: string, time: string) => {
  const match = /^(\d{1,2}):(\d{2}) (AM|PM)$/.exec(time);
  if (!match) throw new Error('Choose a valid appointment time.');
  const hours = Number(match[1]) % 12 + (match[3] === 'PM' ? 12 : 0);
  return new Date(`${date}T${String(hours).padStart(2, '0')}:${match[2]}:00`).toISOString();
};
