# CoreFair — Supabase-backed website

This package contains the CoreFair front end, your CF logo, Supabase client configuration, and SQL for real accounts and database-backed posts.

## 1. Create a Supabase project
1. Create a project at https://supabase.com/dashboard.
2. Open **Project Settings → API** (or Connect) and copy the Project URL and the **anon/public** or **publishable** key.
3. Open `supabase-config.js` and replace:
   - `https://YOUR_PROJECT_ID.supabase.co`
   - `YOUR_SUPABASE_ANON_OR_PUBLISHABLE_KEY`
4. Never put a `service_role` or secret key in frontend code.

## 2. Create the database and security policies
1. In Supabase, open **SQL Editor → New query**.
2. Copy all of `supabase/schema.sql`, paste it, and run it.
3. Confirm tables `profiles`, `posts`, `post_likes`, and `comments` exist.
4. The script enables RLS and installs policies so each signed-in user can only create/update/delete their own posts, likes, and comments. Public profile rows contain no email field; emails remain in Supabase Auth.

## 3. Configure authentication
In Supabase Dashboard → **Authentication → URL Configuration**:
- Set the Site URL to your deployed website URL.
- Add your local development URL and deployed URL to Redirect URLs as needed.
- For email/password auth, keep email confirmation enabled for production.
- If you want Google sign-in, configure Google OAuth credentials in Authentication → Providers → Google. The Google button will not work until provider setup is complete.

## 4. Run locally
Open this folder in a code editor. A local server is recommended (opening `index.html` via `file://` may prevent auth redirects from working):
- Python: `python -m http.server 8000`
- Visit `http://localhost:8000`

## 5. What works after setup
- Secure Supabase email/password signup and login.
- Session persistence and logout.
- Password reset email.
- Public database-backed post feed.
- Authenticated post creation and author-only deletion.
- Real likes and comments.
- Search and category filtering.
- The public browser key is protected by database Row Level Security policies.

## Security notes
- The browser key is not a secret; RLS is the security boundary.
- Do not disable RLS on public tables.
- Never expose service-role credentials.
- Before production launch, review your project’s Auth settings, allowed redirect URLs, rate limits, backups, and moderation needs.

## Scope
This starter currently implements auth and posts/likes/comments. Messaging, business profiles, notifications, and image file uploads are still UI placeholders and need additional tables/storage policies and implementation before launch.
