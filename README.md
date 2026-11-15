# Chris & Naomi

A wedding RSVP and SMS app built with Next.js, TypeScript, Neon Postgres, and mNotify. Guests can RSVP on the public page; admins and ushers can manage the attendee list; admins can manage ushers and edit/send the program SMS.

## Run locally

1. Install Node.js 20 or newer and run `npm install`.
2. Copy `.env.example` to `.env.local` and fill in the values:
   - `DATABASE_URL`: Neon Postgres connection string.
   - `SESSION_SECRET`: a random secret of at least 32 characters.
   - `MNOTIFY_API_KEY`: API key from the BMS/mNotify developer settings.
   - `MNOTIFY_SENDER_ID`: approved sender ID (up to 11 characters).
3. Run the SQL in [`database/schema.sql`](./database/schema.sql) in the Neon SQL Editor.
4. Create the first admin using:

   ```powershell
   node --env-file=.env.local scripts/seed-admin.mjs
   ```

   Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env.local` first. The script creates the account if it doesn't exist, or updates its password if it does.
5. Start the app with `npm run dev`. RSVP is at `/`; staff sign in at `/admin/login`.

## Features

- Public RSVP form with name, phone, guest count, and SMS consent.
- Attendee records stored in Neon and queued for an admin to review and send the program SMS (avoids sending paid messages directly from a public form).
- Staff sign-in with admin and usher roles. Admins can create usher accounts.
- Admins can edit the program SMS template, send it to pending/failed RSVPs, or resend an updated program to all saved guests.
- SMS credentials and all provider requests stay on the server.

Templates support `{name}` and `{guests}` placeholders. Add the actual ceremony and reception details to the template before sending; the wedding date and venue have not been supplied yet. Phone numbers are stored as supplied after whitespace removal; mNotify receives the digits only. The quick-SMS endpoint follows mNotify's supported-country limits; international recipients may require an approved international template. Check that the sender ID and message content are approved for your account before sending real messages.

## Deploy to Vercel

Push this repository to GitHub, import it into Vercel, and add the environment variables from `.env.example` in the project settings. Run `database/schema.sql` against the production Neon database, then run the seed-admin script locally with the production `DATABASE_URL`, `ADMIN_EMAIL`, and `ADMIN_PASSWORD`. Never commit `.env.local` or share provider credentials.
