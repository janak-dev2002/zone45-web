#!/bin/sh
set -e

# ── Bootstrap TLS certs if they don't exist yet ────────────────────────────
# On first deploy, Let's Encrypt certs haven't been issued. Nginx refuses to
# start when ssl_certificate files are missing. We create a self-signed
# placeholder so nginx can start and serve port 80 (needed for the ACME
# HTTP-01 challenge). Certbot then replaces these with real certs, and the
# 12-hour reload loop below picks them up.
CERT_DIR="/etc/letsencrypt/live/zoneforty5.tech"
if [ ! -f "$CERT_DIR/fullchain.pem" ]; then
    echo "[entrypoint] No TLS certs found — creating self-signed placeholder"
    mkdir -p "$CERT_DIR"
    openssl req -x509 -nodes -newkey rsa:2048 -days 1 \
        -keyout "$CERT_DIR/privkey.pem" \
        -out    "$CERT_DIR/fullchain.pem" \
        -subj   "/CN=localhost" 2>/dev/null
    cp "$CERT_DIR/fullchain.pem" "$CERT_DIR/chain.pem"
    echo "[entrypoint] Self-signed cert created — run certbot to get real certs"
fi

# ── Start nginx ────────────────────────────────────────────────────────────
nginx -g "daemon off;" &
NGINX_PID=$!

# ── Reload every 12 hours to pick up renewed Let's Encrypt certs ───────────
(
    while true; do
        sleep 43200
        echo "[entrypoint] sending reload signal to nginx"
        nginx -s reload || true
    done
) &

wait "$NGINX_PID"