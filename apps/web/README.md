# apps/web

React + Vite SPA (TypeScript). The web app talks only to the BFF and never handles OIDC tokens directly. Use `credentials: 'include'` and an `X-CSRF-Token` header on all API calls.

Dev setup
- Create `.env.local` with `VITE_BFF_BASE_URL=http://localhost:4000` (or your BFF origin).
- Configure Vite dev server proxy to forward `/api` calls to the BFF and preserve cookies.

Notes
- Do not expose OIDC tokens in the browser; the BFF manages HttpOnly session cookies.
- Use `react-router-dom` for routing: `/login`, `/albums/:id`, `/cart`, `/checkout/result`.
