#!/usr/bin/env bash
# Join this Cloud Agent VM to the user's tailnet. Idempotent.
# Requires environment secret TS_AUTHKEY (reusable + ephemeral). Never Funnel.
set -euo pipefail

HOSTNAME_DEFAULT="${TS_HOSTNAME:-deltalytix-cloud}"
SOCKET="${TS_SOCKET:-/var/run/tailscale/tailscaled.sock}"
STATE_DIR="${TS_STATE_DIR:-/var/lib/tailscale}"
LOG_DIR="${TS_LOG_DIR:-/var/log/tailscale}"
STATE_FILE="${STATE_DIR}/tailscaled.state"

if ! command -v tailscale >/dev/null 2>&1 || ! command -v tailscaled >/dev/null 2>&1; then
  echo "[cloud-tailscale] tailscale is not installed; run scripts/cloud-tailscale-install.sh first"
  exit 0
fi

if [ -z "${TS_AUTHKEY:-}" ]; then
  echo "[cloud-tailscale] TS_AUTHKEY is not set; skipping tailnet join"
  echo "[cloud-tailscale] Add a reusable + ephemeral auth key as environment secret TS_AUTHKEY"
  echo "[cloud-tailscale] Tailscale admin → Settings → Keys → Generate auth key (Reusable + Ephemeral)"
  exit 0
fi

sudo mkdir -p /var/run/tailscale "$STATE_DIR" "$LOG_DIR"

backend_state() {
  tailscale --socket="$SOCKET" status --json 2>/dev/null \
    | python3 -c 'import json,sys; print(json.load(sys.stdin).get("BackendState",""))' 2>/dev/null \
    || true
}

tailscaled_running() {
  if pgrep -x tailscaled >/dev/null 2>&1 && [ -S "$SOCKET" ]; then
    return 0
  fi
  return 1
}

TAILSCALED_PID=""

stop_tailscaled() {
  if [ -n "${TAILSCALED_PID}" ] && sudo kill -0 "${TAILSCALED_PID}" 2>/dev/null; then
    sudo kill "${TAILSCALED_PID}" 2>/dev/null || true
    local i
    for i in $(seq 1 20); do
      if ! sudo kill -0 "${TAILSCALED_PID}" 2>/dev/null; then
        break
      fi
      sleep 0.1
    done
  fi
  TAILSCALED_PID=""
}

start_tailscaled() {
  local tun_mode="$1"
  local extra=""
  if [ "$tun_mode" = "userspace" ]; then
    extra="--tun=userspace-networking"
  fi

  echo "[cloud-tailscale] starting tailscaled (${tun_mode})"
  # systemd is offline on Cloud Agent VMs (PID 1 is tini).
  TAILSCALED_PID="$(
    sudo bash -c "nohup tailscaled --state='$STATE_FILE' --socket='$SOCKET' --port=41641 $extra >'${LOG_DIR}/tailscaled.log' 2>&1 & echo \$!"
  )"

  local i
  for i in $(seq 1 40); do
    if [ -S "$SOCKET" ]; then
      return 0
    fi
    sleep 0.25
  done
  return 1
}

if ! tailscaled_running; then
  if ! start_tailscaled kernel; then
    echo "[cloud-tailscale] kernel TUN start failed; retrying userspace-networking"
    stop_tailscaled
    sleep 1
    if ! start_tailscaled userspace; then
      echo "[cloud-tailscale] tailscaled failed to start. Last log lines:" >&2
      sudo tail -n 40 "${LOG_DIR}/tailscaled.log" >&2 || true
      exit 1
    fi
  fi
fi

state="$(backend_state)"
if [ "$state" = "Running" ]; then
  echo "[cloud-tailscale] already connected"
else
  echo "[cloud-tailscale] joining tailnet as ${HOSTNAME_DEFAULT}"
  keyfile="$(mktemp)"
  chmod 600 "$keyfile"
  printf '%s' "$TS_AUTHKEY" >"$keyfile"
  set +e
  sudo tailscale --socket="$SOCKET" up \
    --auth-key="file:${keyfile}" \
    --hostname="${HOSTNAME_DEFAULT}" \
    --accept-dns=true \
    --reset \
    --timeout=60s
  up_status=$?
  set -e
  rm -f "$keyfile"
  if [ "$up_status" -ne 0 ]; then
    echo "[cloud-tailscale] tailscale up failed (status=${up_status})" >&2
    exit "$up_status"
  fi
fi

# Never enable Funnel. Serve is optional and is skipped unless already allowed.
# Port 3000 is reachable on the tailnet if the app binds 0.0.0.0:3000 (scripts/dev.sh).

ipv4="$(tailscale --socket="$SOCKET" ip -4 2>/dev/null || true)"
dns_name="$(
  tailscale --socket="$SOCKET" status --json 2>/dev/null \
    | python3 -c 'import json,sys; print(json.load(sys.stdin).get("Self",{}).get("DNSName","").rstrip("."))' 2>/dev/null \
    || true
)"

echo "[cloud-tailscale] hostname=${HOSTNAME_DEFAULT}"
if [ -n "$ipv4" ]; then
  echo "[cloud-tailscale] tailnet IPv4=${ipv4}"
fi
if [ -n "$dns_name" ]; then
  echo "[cloud-tailscale] MagicDNS=${dns_name}"
  echo "[cloud-tailscale] iPhone URL: http://${dns_name}:3000/fr/dashboard"
  echo "[cloud-tailscale] short URL:  http://${HOSTNAME_DEFAULT}:3000/fr/dashboard"
else
  echo "[cloud-tailscale] MagicDNS name not available yet; try: tailscale status"
fi
