#!/bin/sh
set -e

# Start nginx in the foreground (background within this script)
nginx -g "daemon off;" &
NGINX_PID=$!

# Reload nginx every 12 hours so renewed Let's Encrypt certs are picked up
# without requiring Docker socket access in the certbot container.
(
    while true; do
        sleep 43200
        echo "[entrypoint] sending reload signal to nginx"
        nginx -s reload || true
    done
) &

wait "$NGINX_PID"
