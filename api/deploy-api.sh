#!/usr/bin/env bash
set -euo pipefail
API_DIR=/home/tejum/sk-erp-staging/api
ENV_FILE="$API_DIR/private.env"
test "$(id -u)" -eq 0 || { echo "Run as root with sudo"; exit 1; }
test -s "$ENV_FILE" || { echo "Missing private.env"; exit 1; }
python3 - "$ENV_FILE" <<'PY'
import pathlib,subprocess,sys
p=pathlib.Path(sys.argv[1])
settings=dict(line.split('=',1) for line in p.read_text().splitlines() if '=' in line)
password=settings['SK_DB_PASSWORD']
assert len(password)>=32 and "'" not in password
sql="ALTER ROLE sk_erp_reader WITH PASSWORD '"+password+"';"
subprocess.run(['runuser','-u','postgres','--','psql','-d','sk_translines','-v','ON_ERROR_STOP=1','-q'],input=sql,universal_newlines=True,check=True)
print('PostgreSQL reader credential applied')
PY
chown -R tejum:tejum "$API_DIR"
chmod 700 "$API_DIR"
chmod 600 "$ENV_FILE"
cat > /etc/systemd/system/sk-erp-api.service <<'UNIT'
[Unit]
Description=SK Translines ERP private API
After=network.target postgresql.service
Requires=postgresql.service
[Service]
Type=simple
User=tejum
Group=tejum
WorkingDirectory=/home/tejum/sk-erp-staging/api
EnvironmentFile=/home/tejum/sk-erp-staging/api/private.env
ExecStart=/usr/bin/node /home/tejum/sk-erp-staging/api/server.mjs
Restart=on-failure
RestartSec=3
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=full
ProtectHome=false
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
# Stop only the prior manually launched ERP API, never unrelated Node processes.
for pid in $(fuser -n tcp 3107 2>/dev/null || true); do
  if tr '\0' ' ' < "/proc/$pid/cmdline" | grep -Fq '/home/tejum/sk-erp-staging/api/server.mjs'; then
    kill "$pid"
  else
    echo "Port 3107 is occupied by an unrelated process: $pid" >&2
    exit 1
  fi
done
systemctl enable --now sk-erp-api
systemctl restart sk-erp-api
sleep 2
curl -fsS http://127.0.0.1:3107/health
echo
python3 - "$ENV_FILE" <<'PY'
import pathlib,sys,urllib.request,json
p=pathlib.Path(sys.argv[1])
e=dict(line.split('=',1) for line in p.read_text().splitlines() if '=' in line)
req=urllib.request.Request('http://127.0.0.1:3107/internal/dashboard',headers={'x-internal-token':e['SK_INTERNAL_TOKEN']})
with urllib.request.urlopen(req,timeout=10) as r:
    data=json.load(r)
print('Dashboard verified:',data['source'],data['counts'])
PY
echo "Deployment verification passed; API remains localhost-only."
