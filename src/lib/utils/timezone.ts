/** The clinic's time zone (set CLINIC_TIMEZONE in .env.local; default Asia/Manila). Server only. */
export function getClinicTimeZone(): string {
  return process.env.CLINIC_TIMEZONE || "Asia/Manila";
}
