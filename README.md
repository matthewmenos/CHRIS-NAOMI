# Chris & Naomi

A wedding RSVP and SMS app built with Next.js, TypeScript, Neon Postgres, and mNotify. Guests can RSVP on the public page; admins and ushers can manage the attendee list; admins can manage ushers and edit/send the program SMS.

## Run locally

1. Install Node.js 20 or newer and run `npm install`.
2. Copy `.env.example` to `.env.local` and fill in the values:
   - `DATABASE_URL`: Neon Postgres connection string.
   - `SESSION_SECRET`: a random secret of at least 32 characters.
   - `MNOTIFY_API_KEY`: API key from the BMS/mNotify developer settings.
   - `MNOTIFY_SENDER_ID`: approved sender ID (up to 11 characters).
3. Apply the database schema:

   ```powershell
   npm run db:deploy
   ```

4. Set `ADMIN_EMAIL` and `ADMIN_PASSWORD` in `.env.local`, then create the first admin:

   ```powershell
   npm run seed:admin
   ```

   The script creates the account if it doesn't exist, or updates its password if it does.
5. Start the app with `npm run dev`. Welcome is at `/`, RSVP at `/rsvp`, the wedding program at `/program`, and staff sign in at `/admin/login`.

## Features

- Public RSVP form with name, phone, guest count, and clear SMS consent disclosure.
- An invitation-inspired, two-panel public wedding program booklet. Admins edit the welcome, event schedule, functionaries, and photography credits directly in the same layout, with changes published when saved. The editor supports up to 30 events and 30 entries in each credits section.
- A non-scrolling wedding welcome page with a live days/hours/minutes/seconds countdown. Admins can update the event date and time in the dashboard; the invitation defaults to 21 November 2026 at 10:00 AM Ghana time.
- Public RSVP records are stored in Neon for admin review and later SMS sending. Usher accounts get a focused attendee-entry screen; each new attendee they save is sent the current program template immediately by SMS.
- Staff sign-in with admin and usher roles. Admins can create usher accounts and manage settings. Ushers can search the guest directory, check in whole parties, correct their own entries, and view their daily activity.
- Admins can edit the program SMS template, send it to pending/failed RSVPs, or resend an updated program to all saved guests.
- SMS credentials and all provider requests stay on the server.

Templates support `{name}` and `{guests}` placeholders. Add the actual ceremony and reception details to the template before sending. Each usher entry triggers a paid SMS, so ushers should confirm the guest agrees to receive it before submitting. Phone numbers are visible to signed-in ushers in the guest directory. Phone numbers are stored as supplied after whitespace removal; mNotify receives the digits only. The quick-SMS endpoint follows mNotify's supported-country limits; international recipients may require an approved international template. Check that the sender ID and message content are approved for your account before sending real messages.

## Deploy to Vercel

Push this repository to GitHub, import it into Vercel, and add the environment variables from `.env.example` in the project settings. With your production `DATABASE_URL`, run `npm run db:deploy` and `npm run seed:admin` locally. Re-run `npm run db:deploy` after pulling schema changes for the countdown, wedding program, or attendee tracking. Never commit `.env.local` or share provider credentials.
