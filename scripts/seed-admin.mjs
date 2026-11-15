import bcrypt from "bcryptjs";
import { neon } from "@neondatabase/serverless";

const { DATABASE_URL, ADMIN_EMAIL, ADMIN_PASSWORD } = process.env;

if (!DATABASE_URL || !ADMIN_EMAIL || !ADMIN_PASSWORD) {
  throw new Error("Set DATABASE_URL, ADMIN_EMAIL, and ADMIN_PASSWORD before seeding.");
}
if (ADMIN_PASSWORD.length < 12) {
  throw new Error("ADMIN_PASSWORD must be at least 12 characters.");
}

const sql = neon(DATABASE_URL);
const email = ADMIN_EMAIL.trim().toLowerCase();
const passwordHash = await bcrypt.hash(ADMIN_PASSWORD, 12);
await sql`
  INSERT INTO staff (name, email, password_hash, role)
  VALUES ('Wedding Admin', ${email}, ${passwordHash}, 'admin')
  ON CONFLICT (email) DO UPDATE
  SET password_hash = EXCLUDED.password_hash, role = 'admin'
`;
console.log(`Admin account ready for ${email}`);
