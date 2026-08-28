#!/usr/bin/env bash
# Install the Tailscale client. Idempotent. Does not join a tailnet.
# Auth keys must never be passed to this script or committed to git.
set -euo pipefail

if command -v tailscale >/dev/null 2>&1 && command -v tailscaled >/dev/null 2>&1; then
  echo "[cloud-tailscale] already installed ($(tailscale version | head -n 1))"
  exit 0
fi

echo "[cloud-tailscale] installing via official install.sh"
# The official script may try to start a systemd unit. Cloud Agent VMs use
# tini as PID 1, so that start can fail even when the package is installed.
set +e
curl -fsSL https://tailscale.com/install.sh | sudo sh
install_status=${PIPESTATUS[0]}
set -e

if command -v tailscale >/dev/null 2>&1 && command -v tailscaled >/dev/null 2>&1; then
  echo "[cloud-tailscale] installed ($(tailscale version | head -n 1))"
  exit 0
fi

echo "[cloud-tailscale] official installer failed (status=${install_status:-unknown}); trying apt repo"
. /etc/os-release
codename="${VERSION_CODENAME:-noble}"
curl -fsSL "https://pkgs.tailscale.com/stable/ubuntu/${codename}.noarmor.gpg" \
  | sudo tee /usr/share/keyrings/tailscale-archive-keyring.gpg >/dev/null
curl -fsSL "https://pkgs.tailscale.com/stable/ubuntu/${codename}.tailscale-keyring.list" \
  | sudo tee /etc/apt/sources.list.d/tailscale.list >/dev/null
sudo apt-get update
sudo DEBIAN_FRONTEND=noninteractive apt-get install -y tailscale

if ! command -v tailscale >/dev/null 2>&1 || ! command -v tailscaled >/dev/null 2>&1; then
  echo "[cloud-tailscale] Tailscale install failed" >&2
  exit 1
fi

echo "[cloud-tailscale] installed ($(tailscale version | head -n 1))"
