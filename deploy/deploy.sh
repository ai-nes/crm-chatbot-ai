#!/usr/bin/env bash
# Runs on the server: start the new image, roll back if it is not healthy.
set -euo pipefail

cd "$(dirname "$0")"

image="${1:?chatbot image}"
export CHATBOT_IMAGE="$image"
compose=(docker compose -f compose.prod.yaml --env-file deploy.vars)

previous=""
[ -f .current-image ] && previous="$(cat .current-image)"

"${compose[@]}" up -d --remove-orphans web

# Keep only the running and the previous release so the host disk does not fill up.
prune_old_images() {
  docker image ls --format '{{.Repository}}:{{.Tag}}' | grep -E '^crm-chatbot:' |
    while read -r old; do
      case "$old" in
        "$image" | "$previous") continue ;;
      esac
      docker rmi "$old" >/dev/null 2>&1 || true
    done
  docker builder prune --force --filter until=48h >/dev/null 2>&1 || true
}

container="$("${compose[@]}" ps -q web)"
for _ in $(seq 1 40); do
  status="$(docker inspect --format '{{.State.Health.Status}}' "$container" 2>/dev/null || echo starting)"
  if [ "$status" = "healthy" ]; then
    echo "$image" > .current-image
    echo "deployed $image"
    prune_old_images
    exit 0
  fi
  sleep 3
done

echo "web did not become healthy" >&2
"${compose[@]}" logs --tail 80 web >&2 || true
if [ -n "$previous" ]; then
  CHATBOT_IMAGE="$previous" "${compose[@]}" up -d web
  echo "rolled back to $previous" >&2
fi
exit 1
