# CoreFair — Full-feature business community starter

CoreFair is a responsive business community website built with HTML, CSS, JavaScript, and Supabase. It is designed to work well on mobile phones.

## Features
- Email/password signup, login, logout, session persistence, password reset
- Optional Google OAuth (requires Google provider setup in Supabase)
- Public post feed, search, category filters, create/delete own posts
- Likes and comments on posts
- Upload post images to Supabase Storage or use an image URL
- Public member profiles with editable name, username, bio, and avatar URL
- Business directory and editable business profiles
- Private member-to-member messages
- Activity notifications for likes and comments
- Account password settings
- Row Level Security policies for database tables and storage uploads
- Responsive layout and CoreFair logo

## Important: configure the backend before expecting real features to work
This project cannot have real user accounts, messages, or database records until it is connected to your own Supabase project. The repository does not include credentials, and no AI can safely invent them for you.

### 1. Create a Supabase project
1. Go to https://supabase.com/dashboard and create a project.
2. In Project Settings → API (or Connect), copy the Project URL and the **anon/public** or **publishable** key.
3. Open `supabase-config.js` and replace the two placeholder values with your own URL and public key.
4. Never put a `service_role` or secret key in frontend code.

### 2. Create database tables and policies
1. In Supabase, open **SQL Editor → New query**.
2. Open `supabase/schema.sql` in this project and copy all of it into the SQL editor.
3. Run the SQL and check that it finishes without errors. It creates the tables, Row Level Security policies, and `post-images` storage bucket.
4. If you already ran an older version of the CoreFair schema in this same Supabase project, review/migrate existing foreign keys before rerunning; a fresh project is the simplest path for a first-time setup.

### 3. Configure authentication URLs
In Supabase → Authentication → URL Configuration:
- Set **Site URL** to your deployed URL, for example `https://YOUR_GITHUB_USERNAME.github.io/YOUR_REPOSITORY/`.
- Add that URL to the allowed Redirect URLs.
- Email/password login works after configuration. Email confirmation may require confirming the signup email before login.
- Google sign-in works only after configuring Google OAuth credentials under Authentication → Providers → Google.

### 4. Publish with GitHub Pages
1. Upload the contents of the `corefair_website` folder to the root of your GitHub repository. `index.html` must be at the repository root.
2. In the repository, open **Settings → Pages**.
3. Choose **Deploy from a branch**, branch `main`, folder `/(root)`, then Save.
4. Wait for the published URL shown on the Pages screen. For a project repository, the URL usually follows `https://USERNAME.github.io/REPOSITORY/`.
5. Set the exact published URL in Supabase Authentication → URL Configuration.

### 5. Test before sharing
- Create a test account and confirm email if enabled.
- Create a post and upload a small image (maximum 5 MB).
- Test likes, comments, business profile editing, messaging between two test accounts, notifications, password change, and logout.
- Test in a private/incognito window to verify public pages and login flow.

## Security notes
- The browser anon/publishable key is intended to be public; Row Level Security is essential.
- Never expose Supabase service-role credentials.
- Business profiles and posts are public. Messages are visible only to sender and recipient.
- Public post images can be viewed by anyone; uploads are restricted to the authenticated user's own storage folder.
- This starter does not include a separate privileged admin dashboard, payment processing, or automated content moderation. Add these only with server-side authorization and additional testing.

## Local preview
A local web server is recommended instead of opening `index.html` directly:
- `python -m http.server 8000`
- Visit `http://localhost:8000`
