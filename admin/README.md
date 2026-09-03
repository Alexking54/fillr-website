# Fillr Admin Dashboard

This is a small static dashboard with three sections:

- **Accounts** — search users, view their cloud data, grant and revoke administrator-granted Fillr Plus.
- **Notifications** — compose a notification, preview how many devices it would reach, send or schedule it, and review what has been sent.
- **Auto Rules** — define condition-based notifications (for example "hasn't opened Fillr in 30 days"), preview their reach, enable them, and run one on demand.

## Open Locally

Open `admin/index.html` in a browser. No build step is required.

## Connect

Enter the backend API URL, such as a local development server URL, and the admin API key for that backend.

The admin key is held only in JavaScript memory for the current page session. It is not stored in source files, localStorage, cookies, or query strings. Use **Disconnect** to clear the key and selected user data from memory.

## Railway CORS

The backend only allows browser requests from origins listed in `ALLOWED_FRONTEND_ORIGINS`.

**An origin is scheme + host only — the path is not part of it.** So if this
dashboard is served at `https://getfillr.app/admin`, the origin to allow is:

```text
ALLOWED_FRONTEND_ORIGINS=https://getfillr.app
```

and if it is served from the admin subdomain instead:

```text
ALLOWED_FRONTEND_ORIGINS=https://admin.getfillr.app
```

Getting this wrong is the most likely cause of "the dashboard is broken" — every
request fails in the browser with a CORS error that looks like a backend outage.
If there are already allowed origins, keep them and add the new one as a
comma-separated value.

Do not put `FILLR_ADMIN_API_KEY` or any other secret in frontend configuration.

## Future GitHub Pages Hosting

The `admin/` folder can later be published with GitHub Pages by configuring Pages to serve this directory, or by copying these static files into the Pages publishing branch. The dashboard still requires the backend origin to be present in `ALLOWED_FRONTEND_ORIGINS`.

## Sending a Notification

Send is deliberately disabled until you have pressed **Preview Audience**, and
any edit afterwards disables it again — so the number you confirmed is always
the number you are about to reach. The confirmation dialog quotes both.

A notification goes out as a push *and* into the in-app inbox. Someone who has
muted that category still gets the inbox copy; they just are not interrupted.

Sends are idempotent: the console generates a message id per previewed message,
so a double-click or a retried request cannot broadcast twice.

## Auto Rules

New rules are always created **disabled**. Preview the match count first, then
enable it.

Rules are evaluated by `npm run notifications:run` in the backend, which is
meant to run from a Railway cron service (hourly is plenty). If that service is
not set up or has stopped, rules simply never fire — so the rules list shows
each rule's last run in red once it is more than two days stale. **Run now** on
a rule is always safe to press: each delivery carries a dedupe key, so a person
can only be reached once per cooldown window however many times it runs.
