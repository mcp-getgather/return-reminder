#!/bin/sh
set -e

if [ -n "${TAILSCALE_AUTHKEY}" ]; then
    echo "Starting Tailscale daemon..."
    /app/tailscaled --state=/var/lib/tailscale/tailscaled.state --socket=/var/run/tailscale/tailscaled.sock &

    echo "Authenticating with Tailscale..."
    /app/tailscale up --authkey="${TAILSCALE_AUTHKEY}" --hostname=return-reminder --accept-routes &
else
    echo "TAILSCALE_AUTHKEY not set, skipping Tailscale setup"
fi

echo "Starting Node app..."
npm start
