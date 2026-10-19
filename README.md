# CoreFair Full Marketplace — Windows starter

Premium navy + blue responsive digital asset marketplace, using the provided CF logo when available. Includes:
- Homepage, asset grid, category and price/rating sorting, client-side search
- Responsive desktop/tablet/mobile styling
- English/Bengali language toggle for key navigation and hero copy
- Sign-in/sign-up UI with Supabase Auth integration points
- Cart UI, saved/favorite UI, creator call-to-action
- Subscription plan presentation
- Review UI placeholder
- Supabase schema for profiles, categories, assets, orders, download entitlements, reviews, subscriptions, affiliate profiles/referrals and reports
- Windows launcher

## Run on Windows
1. Extract the ZIP file.
2. Double-click `start_windows.bat`.
3. For development, open this folder in VS Code and run it using the Live Server extension. For production, host the static frontend on a secure HTTPS host.

Internet is required for the Supabase JavaScript library and remote demo images.

## Configure Supabase
1. Create a project at https://supabase.com/.
2. Copy the Project URL and browser-safe `anon` / publishable key from Project Settings → API.
3. Open `app.js` in VS Code or Notepad and set `SUPABASE_URL` and `SUPABASE_ANON_KEY`.
4. In Authentication settings, enable Email provider and configure Site URL / Redirect URLs.
5. Open Supabase SQL Editor and run `supabase-schema.sql`.
6. Test account registration, email confirmation and login.
7. Set up Storage buckets as documented in the SQL file.

Never put a `service_role` key in `app.js`, HTML, GitHub or any browser code.

## Before public launch — critical
This is a frontend starter with integration points, not a finished production marketplace. Demo assets/prices are illustrative and must be replaced by licensed creator uploads. Cart checkout, actual subscription billing, affiliate commission settlement, AI search, admin moderation, secure downloads, and verified-purchase reviews require server-side implementation.

- Payments: implement a provider checkout + signed webhook/verification. Do not accept client claims that an order is paid.
- Downloads: keep original files in a private bucket; issue short-lived signed URLs only after server-side entitlement checks.
- Admin: assign admin permissions using trusted server-side claims; never let a user edit their own role.
- Affiliate: calculate commissions only from verified paid orders; add fraud/refund handling and payout review.
- AI search: add a server-side embedding/search service after a real asset catalog exists; never expose AI provider keys in the browser.
- Subscription: use a recurring-billing provider that supports your business, and handle renewals/cancellations via verified webhooks.
- Reviews: enforce a paid-order check on the server/database.
- Legal: publish licenses, copyright/takedown, refund, privacy and terms pages.
- Security: enable RLS, test policies as buyer/creator/admin, add rate limits, monitoring, backups and abuse reporting.

## Included files
- `index.html` — main UI
- `styles.css` — responsive visual design
- `app.js` — UI interactions and Supabase Auth connection point
- `supabase-schema.sql` — starter database schema and RLS policies
- `supabase/functions/*/README.md` — server-side security contracts
- `start_windows.bat` — Windows launcher

## Notes
Plan prices and demo products are examples, not active offers. Creator income is not guaranteed.


## New in Admin + Realtime version
- **Admin panel:** click the gear icon after signing in as an admin. Edit site name, homepage headline/description, brand colors, contact email and upload a CF logo. Admins can publish/reject pending asset listings.
- **Realtime messages:** click the envelope icon, enter another user's Supabase profile UUID and open the conversation. Messages are persisted in `direct_messages` and updated via Supabase Realtime.
- **Voice/video calls:** choose voice or video and click Start call. Calls use browser WebRTC with STUN signaling; both participants need HTTPS (or localhost), a supported browser and mic/camera permissions. Some networks require a TURN server for reliable calls.
- **Migration:** run the full updated `supabase-schema.sql` in SQL Editor on a fresh project. If the old schema is already installed, create a backup and apply the new admin/realtime section as a migration; do not blindly rerun all non-idempotent policies.
- **Realtime publication:** in Supabase Dashboard → Database → Publications, enable `direct_messages` and `call_signals` for `supabase_realtime`.
- **Brand storage:** create a public Storage bucket named `brand-assets`. Add a Storage policy allowing authenticated admins to upload under their own UUID folder, and public read access for logo delivery. Keep it limited to non-sensitive branding images.
- **Promote your first admin:** after creating your own account, run this in SQL Editor, replacing the email with the exact account email: `update public.profiles p set role='admin' from auth.users u where p.id=u.id and u.email='YOUR-LOGIN-EMAIL';` Do not expose service-role keys in the frontend.

## Hosting notes (GitHub + Hostinger)
1. Commit the project files to the repository root (including `index.html`, `styles.css`, `app.js`, `assets/`, and SQL migration). Never commit secrets.
2. Set `SUPABASE_URL` and the browser-safe publishable/anon key in `app.js`; this is a public browser key and is protected by RLS, not a secret.
3. Upload/deploy the same updated files to the Hostinger website document root. GitHub Pages and Hostinger are separate deployments unless you configure a deployment workflow; pushing to GitHub alone does not guarantee Hostinger updates.
4. Configure Supabase Auth Site URL and Redirect URLs for the live Hostinger domain and any development localhost URL.

## Important limitations
This is an integration starter, not a fully audited production system. Voice/video call signaling is a minimal WebRTC prototype (no ringing/accept/reject UI, no TURN service, and no call-history retention policy). Add abuse prevention, rate limits, message reporting, retention controls, signed-in user discovery and a trusted payment backend before public launch. Site settings and the logo update dynamically in the current browser session; settings are also stored in Supabase for subsequent visits.
