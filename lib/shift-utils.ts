export function calculateShiftHours(startTime: string, endTime: string): number {
  const [sh, sm] = startTime.split(':').map(Number)
  const [eh, em] = endTime.split(':').map(Number)
  const minutes = (eh * 60 + em) - (sh * 60 + sm)

  const hours = Math.floor(minutes / 60)
  const mins = minutes % 60

  // For fractional minutes, ceil to nearest 15-minute increment, but max at 15 for the fractional part
  const fractionalHours = mins > 0 ? 0.25 : 0

  return hours + fractionalHours
}
