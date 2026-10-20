# CoreFair dedicated pages update

## Files
- `index.html` — updated main navigation.
- `login.html`, `login.js` — dedicated Supabase sign-in/sign-up page.
- `explore.html` — separate Explore page.
- `stock-footage.html` — separate Stock Footage category page.
- `create.html` — separate Create/Publish page.
- `creators.html`, `plans.html`, `how-it-works.html` — separate navigation pages.
- `.htaccess` — routes clean URLs to these pages.
- `app.js` — your existing app code preserved.

## Upload
Upload these files to the same Hostinger `public_html` folder where your existing `index.html`, `app.js`, `styles.css`, and `assets/` folder are located. Keep your existing `styles.css` and `assets/` folder; they are not replaced by this package.

## Important
- The Supabase publishable key is intended for browser use; never add a `service_role`/secret key.
- Real product listings, upload storage, payments, and creator earnings need database/storage/payment configuration. The new category pages clearly label non-live content.
- If `/login` still shows the homepage after upload, confirm `.htaccess` is in `public_html` and that the hosting plan supports Apache rewrite rules. Clear site/browser cache.
