#!/usr/bin/env bash
set -euo pipefail

if docker info >/dev/null 2>&1; then
  echo "[docker-bootstrap] Docker daemon already running"
  exit 0
fi

echo "[docker-bootstrap] Starting Docker daemon (vfs storage, iptables disabled for restricted VMs)"
sudo dockerd \
  --iptables=false \
  --ip6tables=false \
  --storage-driver=vfs \
  >/tmp/dockerd.log 2>&1 &

for _ in $(seq 1 30); do
  if docker info >/dev/null 2>&1; then
    echo "[docker-bootstrap] Docker is ready"
    exit 0
  fi
  sleep 1
done

echo "[docker-bootstrap] Docker failed to start. See /tmp/dockerd.log"
exit 1
