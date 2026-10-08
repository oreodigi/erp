# GitHub and cPanel deployment

## Required GitHub setup

1. Create or authorize a private repository for this ERP.
2. Add a deploy key or GitHub token with the minimum required scope.
3. Configure the cPanel account's Git Version Control repository to track `main`.
4. Configure the GitHub webhook to the cPanel deployment webhook shown by cPanel.
5. Confirm the webhook runs as the `tejum` account and deploys only to `/home/tejum/public_html`.

## cPanel deployment boundary

The frontend can be built and copied by `.cpanel.yml`. The private Node API on port 3107 should remain managed by its systemd service; deployment must run a controlled API restart after a reviewed API change. Do not put `private.env` or PostgreSQL credentials in the Git repository.

## Verification after a deployment

- `https://tejum.in/` loads the current hashed frontend bundle.
- `/health` on the private API reports healthy through the server check.
- Unauthenticated API calls return `401`.
- Login, role menus, communication access, and PostgreSQL persistence are tested.
- API journal logs contain no startup or transaction errors.
