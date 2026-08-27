#!/usr/bin/env bash
set -euo pipefail

# Bring up Tailscale on Cloud Agent VMs. These VMs have no systemd, so we run
# tailscaled ourselves and (when TS_AUTHKEY is set) join the tailnet.
#
# Cloud Agent hosts do not always expose /dev/net/tun. Kernel TUN mode needs it
# to create the tailscale0 interface, so we fall back to userspace networking
# when the device is missing — otherwise `tailscale up` fails to bring up a link.

if ! command -v tailscaled >/dev/null 2>&1; then
  echo "[tailscale-bootstrap] tailscaled not installed; skipping"
  exit 0
fi

SOCKET="/var/run/tailscale/tailscaled.sock"

if ! pgrep -x tailscaled >/dev/null 2>&1; then
  sudo mkdir -p /var/run/tailscale /var/lib/tailscale

  # Kernel mode uses a real TUN interface (default name tailscale0); the special
  # value "userspace-networking" needs no /dev/net/tun.
  tun_arg="tailscale0"
  if [ ! -c /dev/net/tun ]; then
    echo "[tailscale-bootstrap] /dev/net/tun missing; using userspace networking"
    tun_arg="userspace-networking"
  fi

  # shellcheck disable=SC2024
  sudo tailscaled \
    --tun="$tun_arg" \
    --state=/var/lib/tailscale/tailscaled.state \
    --socket="$SOCKET" \
    --port=41641 \
    >/tmp/tailscaled.log 2>&1 &

  for _ in $(seq 1 20); do
    [ -S "$SOCKET" ] && break
    sleep 0.5
  done
fi

if [ ! -S "$SOCKET" ]; then
  echo "[tailscale-bootstrap] tailscaled socket not ready; see /tmp/tailscaled.log"
  exit 1
fi

if sudo tailscale status >/dev/null 2>&1; then
  echo "[tailscale-bootstrap] Already connected to tailnet"
elif [ -n "${TS_AUTHKEY:-}" ]; then
  echo "[tailscale-bootstrap] Joining tailnet"
  sudo tailscale up \
    --auth-key="$TS_AUTHKEY" \
    --hostname="deltalytix-${HOSTNAME:-cloud-agent}" \
    --accept-dns=false \
    --operator="$(id -un)" \
    --timeout=30s
else
  echo "[tailscale-bootstrap] TS_AUTHKEY not set; tailscaled running, tailnet not joined"
fi
