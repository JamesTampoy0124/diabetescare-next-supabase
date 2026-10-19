// Creates the first administrator (staff cannot register themselves).
//
//   npm run create-admin -- you@clinic.com "A-strong-password" "Your Name"
//
// Missing values are asked for. Needs NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local.
import { createClient } from "@supabase/supabase-js";
import readline from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceKey || url.includes("YOUR_PROJECT_ID") || serviceKey.includes("YOUR_SERVICE_ROLE_KEY")) {
  console.error("Fill in NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local first.");
  process.exit(1);
}

let [email, password, ...nameParts] = process.argv.slice(2);
let name = nameParts.join(" ");

if (!email || !password || !name) {
  const rl = readline.createInterface({ input, output });
  email = email || (await rl.question("Administrator email: "));
  name = name || (await rl.question("Full name: "));
  password = password || (await rl.question("Password (min. 8 characters): "));
  rl.close();
}

email = email.trim().toLowerCase();
name = name.trim();

if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
  console.error("That is not a valid email address.");
  process.exit(1);
}
if (password.length < 8) {
  console.error("The password must contain at least 8 characters.");
  process.exit(1);
}
if (name.length < 2) {
  console.error("Please enter a full name.");
  process.exit(1);
}

const admin = createClient(url, serviceKey, { auth: { autoRefreshToken: false, persistSession: false } });

const { error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
  user_metadata: { full_name: name },
  // app_metadata can only be written with the service-role key; the database trigger turns it into the admin profile.
  app_metadata: { role: "admin" },
});

if (error) {
  console.error("Could not create the administrator:", error.message);
  process.exit(1);
}

console.log(`Administrator created: ${email}. You can log in at /login.`);
