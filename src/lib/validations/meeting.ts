import { z } from "zod";

// Meeting providers accepted for the "Meeting link" box (a host also matches its subdomains, e.g. us02web.zoom.us).
// Add a provider here to allow it.
export const MEETING_HOSTS = [
  "zoom.us",
  "zoom.com",
  "meet.google.com",
  "teams.microsoft.com",
  "teams.live.com",
  "webex.com",
  "whereby.com",
  "meet.jit.si",
];

/** Empty, or an https link to a known meeting provider. Stored without spaces. */
export const meetingLinkField = z
  .string()
  .trim()
  .max(500, "The meeting link is too long.")
  .refine((value) => {
    if (value === "") return true;

    try {
      const url = new URL(value);
      if (url.protocol !== "https:") return false;
      return MEETING_HOSTS.some((h) => url.hostname === h || url.hostname.endsWith("." + h));
    } catch {
      return false;
    }
  }, "Use an https meeting link from Zoom, Google Meet, Microsoft Teams, Webex, Whereby or Jitsi.");
