#!/usr/bin/env bash
# Run a shell command on the self-hosted EC2 instance via AWS SSM (no SSH key).
#
# Requires: AWS CLI + credentials (AWS_ACCESS_KEY / AWS_SECRET_ACCESS_KEY / AWS_REGION)
#
# Usage:
#   bash scripts/ec2-ssm-exec.sh 'cd /opt/deltalytix && sudo docker compose ps'
#   bash scripts/ec2-ssm-exec.sh --wait 'cd /opt/deltalytix && sudo docker compose up --build -d app'
#
set -euo pipefail

INSTANCE_ID="${EC2_INSTANCE_ID:-i-0343addd1ab65ff12}"
WAIT_SECS=8

if [[ "${1:-}" == "--wait" ]]; then
  WAIT_SECS=120
  shift
fi

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 [--wait] <remote-shell-command>" >&2
  exit 1
fi

REMOTE_CMD="$1"

if [[ -z "${AWS_ACCESS_KEY_ID:-}" && -n "${AWS_ACCESS_KEY:-}" ]]; then
  export AWS_ACCESS_KEY_ID="${AWS_ACCESS_KEY}"
fi
if [[ -z "${AWS_SECRET_ACCESS_KEY:-}" ]]; then
  export AWS_SECRET_ACCESS_KEY="${AWS_SECRET_ACCESS_KEY:-}"
fi
export AWS_DEFAULT_REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-}}"

if [[ -z "${AWS_ACCESS_KEY_ID:-}" || -z "${AWS_SECRET_ACCESS_KEY:-}" || -z "${AWS_DEFAULT_REGION:-}" ]]; then
  echo "Missing AWS credentials. Set AWS_ACCESS_KEY, AWS_SECRET_ACCESS_KEY, AWS_REGION." >&2
  exit 1
fi

CMD_ID=$(aws ssm send-command \
  --instance-ids "$INSTANCE_ID" \
  --document-name "AWS-RunShellScript" \
  --parameters "commands=[$(python3 -c "import json,sys; print(json.dumps(sys.argv[1]))" "$REMOTE_CMD")]" \
  --query Command.CommandId \
  --output text)

echo "[ec2-ssm] instance=$INSTANCE_ID command=$CMD_ID"

deadline=$((SECONDS + WAIT_SECS))
status="Pending"

while [[ $SECONDS -lt $deadline ]]; do
  invocation=$(aws ssm get-command-invocation \
    --command-id "$CMD_ID" \
    --instance-id "$INSTANCE_ID" \
    --output json)

  status=$(python3 -c "import json,sys; print(json.load(sys.stdin)['Status'])" <<<"$invocation")

  case "$status" in
    Success)
      printf '%s' "$invocation" | python3 -c '
import json, sys
d = json.load(sys.stdin)
out = d.get("StandardOutputContent") or ""
err = d.get("StandardErrorContent") or ""
if out:
    sys.stdout.write(out if out.endswith("\n") else out + "\n")
if err:
    sys.stderr.write(err if err.endswith("\n") else err + "\n")
'
      exit 0
      ;;
    Failed|Cancelled|TimedOut)
      echo "[ec2-ssm] status=$status" >&2
      python3 -c "import json,sys; d=json.load(sys.stdin); print((d.get('StandardOutputContent') or '') + (d.get('StandardErrorContent') or ''))" <<<"$invocation" >&2
      exit 1
      ;;
  esac
  sleep 2
done

echo "[ec2-ssm] timed out after ${WAIT_SECS}s (last status=$status)" >&2
exit 1
