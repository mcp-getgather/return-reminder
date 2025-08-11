#!/bin/sh
set -e

echo "Starting Tailscale daemon..."
/app/tailscaled --state=/var/lib/tailscale/tailscaled.state --socket=/var/run/tailscale/tailscaled.sock &

# CRITICAL: Wait for daemon to start
echo "Waiting for tailscaled..."
sleep 5

echo "Authenticating with Tailscale..."
/app/tailscale up --authkey="${TAILSCALE_AUTHKEY}" --hostname=return-reminder-tailscale --accept-routes

# CRITICAL: Wait for connection
sleep 3

# CRITICAL: Show status so we can see in logs
echo "=== Tailscale Status ==="
/app/tailscale status

echo "Starting Node app..."
npm start
