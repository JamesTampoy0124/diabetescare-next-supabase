/** Age in whole years from a birth date, both as YYYY-MM-DD. Pure string maths, so it works in the browser and on the server. */
export function ageFromBirthDate(birthDate: string, today: string): number | null {
  const b = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate);
  const t = /^(\d{4})-(\d{2})-(\d{2})$/.exec(today);
  if (!b || !t) return null;

  let age = Number(t[1]) - Number(b[1]);
  if (t[2] < b[2] || (t[2] === b[2] && t[3] < b[3])) age -= 1;

  return age >= 0 ? age : null;
}

export function ageLabel(age: number | null): string {
  if (age === null) return "";
  return `${age} year${age === 1 ? "" : "s"} old`;
}

/** 012345678901 -> 01-234567890-1 */
export function formatPhilhealth(digits: string): string {
  return /^\d{12}$/.test(digits) ? `${digits.slice(0, 2)}-${digits.slice(2, 11)}-${digits.slice(11)}` : digits;
}
