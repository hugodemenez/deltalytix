#!/usr/bin/env bash
set -euo pipefail

docker_ready() {
  docker info >/dev/null 2>&1 || sudo docker info >/dev/null 2>&1
}

wait_for_docker() {
  local label=$1
  echo "[docker-bootstrap] ${label}"
  for _ in $(seq 1 30); do
    if docker_ready; then
      echo "[docker-bootstrap] Docker is ready"
      return 0
    fi
    sleep 1
  done
  return 1
}

if docker_ready; then
  echo "[docker-bootstrap] Docker daemon already running"
  exit 0
fi

# Another start (or the snapshot) may already be bringing dockerd up. Wait
# for that process instead of launching a second daemon that fails on the pid file.
existing_pid=""
if [ -f /var/run/docker.pid ]; then
  existing_pid="$(tr -d '[:space:]' < /var/run/docker.pid || true)"
fi
if [ -z "${existing_pid}" ]; then
  existing_pid="$(pgrep -x dockerd | head -n 1 || true)"
fi

if [ -n "${existing_pid}" ] && kill -0 "${existing_pid}" 2>/dev/null; then
  if wait_for_docker "Waiting for existing dockerd (pid ${existing_pid})"; then
    exit 0
  fi
  echo "[docker-bootstrap] Existing dockerd did not become ready. See /tmp/dockerd.log"
  exit 1
fi

if [ -f /var/run/docker.pid ]; then
  echo "[docker-bootstrap] Removing stale /var/run/docker.pid"
  sudo rm -f /var/run/docker.pid
fi

echo "[docker-bootstrap] Starting Docker daemon (vfs storage, iptables disabled for restricted VMs)"
sudo dockerd \
  --iptables=false \
  --ip6tables=false \
  --storage-driver=vfs \
  >/tmp/dockerd.log 2>&1 &

if wait_for_docker "Waiting for new dockerd"; then
  exit 0
fi

echo "[docker-bootstrap] Docker failed to start. See /tmp/dockerd.log"
exit 1
