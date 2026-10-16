# CoreFair — GitHub Pages Demo

A responsive static marketplace demo for GitHub Pages. Includes sample products, category/search filters, browser-local cart, demo checkout/orders, demo registration/login, community posts/likes, seller product listings, and service/business listings.

## Deploy to GitHub Pages

1. Create a new GitHub repository, for example `corefair`.
2. Upload **all files and folders inside this project** to the repository root. `index.html` must be at the root.
3. Open **Settings → Pages**.
4. Under **Build and deployment**, choose **Deploy from a branch**.
5. Select branch `main` and folder `/ (root)`, then click **Save**.
6. Wait for the Pages URL to appear. Open that URL (not the repository URL) to view the website.

## Important limitations

This GitHub Pages version is a **front-end demo**, not a production backend. GitHub Pages serves static files only; it does not run Node.js/Express or a server-side JSON database. Demo data is saved in the visitor's browser using `localStorage`, so it is not shared across devices/users and may be cleared by the browser. Login is a demonstration only; do not use real passwords or sensitive data. Checkout creates a local demo order and does not charge money.

For a real marketplace with shared accounts, secure authentication, persistent database, admin dashboard, uploads, shipping and bKash/Nagad/card payments, deploy the backend separately (for example, a Node hosting platform) and connect it to a managed database.

## Branding

The supplied CoreFair logo is included at `assets/corefair-logo.png` and is used in the header and footer.

## Files

- `index.html` — website entry point
- `assets/style.css` — responsive styles
- `assets/app.js` — front-end demo interactions and localStorage data
