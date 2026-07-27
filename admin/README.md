# Fillr Admin Dashboard

This is a small static dashboard for managing administrator-granted Fillr Plus access.

## Open Locally

Open `admin/index.html` in a browser. No build step is required.

## Connect

Enter the backend API URL, such as a local development server URL, and the admin API key for that backend.

The admin key is held only in JavaScript memory for the current page session. It is not stored in source files, localStorage, cookies, or query strings. Use **Disconnect** to clear the key and selected user data from memory.

## Railway CORS

The backend only allows browser requests from origins listed in `ALLOWED_FRONTEND_ORIGINS`.

When this dashboard is hosted at the admin subdomain, add this origin to the Railway backend environment variable:

```text
ALLOWED_FRONTEND_ORIGINS=https://admin.getfillr.app
```

If there are already allowed origins, keep them and add `https://admin.getfillr.app` as a comma-separated value.

Do not put `FILLR_ADMIN_API_KEY` or any other secret in frontend configuration.

## Future GitHub Pages Hosting

The `admin/` folder can later be published with GitHub Pages by configuring Pages to serve this directory, or by copying these static files into the Pages publishing branch. The dashboard still requires the backend origin to be present in `ALLOWED_FRONTEND_ORIGINS`.
