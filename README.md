# SK Translines ERP

Production ERP for SK Translines. The repository contains the React/Vite frontend, Node.js API, PostgreSQL migrations, deployment configuration, and implementation-status documentation.

## Layout

- `source/sk-erp/` — React + Vite + TypeScript frontend
- `api/` — authenticated Node.js API
- `sql/` — safe PostgreSQL migrations
- `deploy/` — cPanel/public gateway deployment files
- `docs/` — feature coverage, production notes, and known limitations

## Local development

```bash
cd source/sk-erp
npm ci
npm run build
```

The API reads its database configuration from a private environment file. Never commit credentials, dumps, generated bundles, or production password files.

## Production data

Production uses the `sk_translines` PostgreSQL database. Historical records are preserved in the `legacy` schema. Operational additions use the `app` schema. Run migrations only after taking a database backup.

## Deployment

The `.cpanel.yml` file describes the frontend deployment task. API service deployment remains a controlled server operation because the API is a private systemd service and must not expose database credentials to cPanel or the browser.

See `docs/DEPLOYMENT.md` before enabling GitHub-to-cPanel deployment.
