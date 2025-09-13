# apps/web

React + Vite SPA (TypeScript). The web app talks only to the BFF and never handles OIDC tokens directly. Use Redux Toolkit Query for all API calls, configured with `credentials: 'include'` and an `X-CSRF-Token` header.

Dev setup
- Create `.env.local` with `VITE_BFF_BASE_URL=http://localhost:4000` (or your BFF origin).
- Configure Vite dev server proxy to forward `/api` calls to the BFF and preserve cookies.

Notes
- Do not expose OIDC tokens in the browser; the BFF manages HttpOnly session cookies.
- Use `react-router-dom` for routing: `/login`, `/albums/:id`, `/cart`, `/checkout/result`.
- Use `@reduxjs/toolkit` for state and RTK Query for BFF API calls. Configure `fetchBaseQuery` with `baseUrl=VITE_BFF_BASE_URL`, `credentials: 'include'`, and an `X-CSRF-Token` header.
