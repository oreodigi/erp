# Security and repository rules

- Do not commit `api/private.env`, credentials files, password lists, PostgreSQL dumps, production backups, or session tokens.
- Passwords are stored as scrypt hashes in PostgreSQL. Existing passwords cannot be displayed; Super Admin reset shows a generated password once.
- Database credentials remain server-side. The frontend uses bearer sessions and never receives database credentials.
- Administrative communication oversight is role-protected by the API, not only by the menu.
- Every production migration requires a backup and a review of grants.
- GitHub deploy keys and cPanel credentials must be stored in GitHub/cPanel secret stores, never in this repository.
