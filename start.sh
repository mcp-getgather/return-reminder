#!/bin/sh
set -e

if [ -n "${TAILSCALE_AUTHKEY}" ]; then
    echo "Starting Tailscale daemon..."
    /app/tailscaled --state=/var/lib/tailscale/tailscaled.state --socket=/var/run/tailscale/tailscaled.sock &

    # CRITICAL: Wait for daemon to start
    echo "Waiting for tailscaled..."
    sleep 5

    echo "Authenticating with Tailscale..."
    /app/tailscale up --authkey="${TAILSCALE_AUTHKEY}" --hostname=return-reminder --accept-routes

    # CRITICAL: Wait for connection
    sleep 3

    # CRITICAL: Show status so we can see in logs
    echo "=== Tailscale Status ==="
    /app/tailscale status
else
    echo "TAILSCALE_AUTHKEY not set, skipping Tailscale setup"
fi

echo "Starting Node app..."
npm start
