/** `YYYY-MM-DD` in local time. */
export function toDateKey(date: Date): string {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, "0")
  const d = String(date.getDate()).padStart(2, "0")
  return `${y}-${m}-${d}`
}

/**
 * The five working days (Mon-Fri) of the week `weeksAgo` weeks back from `today`.
 * "This week" runs to today at most: later days are left out.
 */
export function workingDays(today: Date, weeksAgo: 0 | 1): Date[] {
  const monday = new Date(today)
  const offset = (today.getDay() + 6) % 7 // Mon = 0
  monday.setDate(today.getDate() - offset - weeksAgo * 7)
  monday.setHours(0, 0, 0, 0)

  return Array.from({ length: 5 }, (_, i) => {
    const day = new Date(monday)
    day.setDate(monday.getDate() + i)
    return day
  }).filter((day) => weeksAgo === 1 || day <= today)
}

export function dayLabel(day: Date, today: Date): string {
  if (toDateKey(day) === toDateKey(today)) return "Today"
  return day.toLocaleDateString("en-US", { weekday: "short", day: "numeric" })
}

/** ₱82k / ₱83.5k / ₱950 */
export function compactPeso(amount: number): string {
  if (amount >= 1000) {
    const k = amount / 1000
    return `₱${Number.isInteger(k) ? k : k.toFixed(1)}k`
  }
  return `₱${Math.round(amount)}`
}
