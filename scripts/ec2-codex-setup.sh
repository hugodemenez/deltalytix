#!/usr/bin/env bash
# Install Codex CLI on the self-hosted EC2 instance (run on the server as root).
# Remote: bash scripts/ec2-ssm-exec.sh --wait 'curl -fsSL ... | sudo bash -s'
# Or copy from repo after git pull on EC2.
set -euo pipefail

export DEBIAN_FRONTEND=noninteractive

apt-get update -qq
apt-get install -y -qq bubblewrap curl ca-certificates

CODEX_URL="https://github.com/openai/codex/releases/latest/download/codex-x86_64-unknown-linux-musl.tar.gz"
tmpdir="/tmp/codex-install-$$"
mkdir -p "$tmpdir"
trap 'rm -rf "$tmpdir"' EXIT

curl -fsSL "$CODEX_URL" -o "$tmpdir/codex.tar.gz"
tar -xzf "$tmpdir/codex.tar.gz" -C "$tmpdir"
install -m 0755 "$tmpdir/codex-x86_64-unknown-linux-musl" /usr/local/bin/codex

usermod -aG docker ubuntu 2>/dev/null || true

sudo -u ubuntu mkdir -p /home/ubuntu/.codex
sudo -u ubuntu bash -lc 'codex --version'

echo "[ec2-codex] installed: $(command -v codex)"
echo "[ec2-codex] next: ssh to EC2 as ubuntu and run: codex login --device-auth"
