# Deployment

The chat UI (`https://fpilot.faip.pro`) runs in the `crm` VPS (LXD container on the `anuni` host) next to crm-backend and crm-ai.

## Pipeline

`.github/workflows/deploy.yml` runs on every push to `main`, on the self-hosted runner labelled `crm-anuni` inside the VPS (it only dials out to GitHub):

1. Build `crm-chatbot:<sha>` locally, baking the `NEXT_PUBLIC_*` values as build args.
2. Install `deploy/compose.prod.yaml` and `deploy/deploy.sh` into `/opt/crm-chatbot`.
3. `deploy.sh` starts the new image, waits for `/api/health`, records `.current-image`, prunes old images, and rolls back to the previous image if the new one is not healthy.

No registry, SSH key or Docker Hub secret is involved.

## One-time server setup

```bash
sudo install -d -o runner -g runner /opt/crm-chatbot
# copy deploy/deploy.vars.example to /opt/crm-chatbot/deploy.vars, fill it in, chmod 600
```

- `CRM_BACKEND_URL=https://api.faip.pro` — the `/api/chat` route relays to crm-backend with the user's Better Auth cookie.
- `BIND_ADDR=0.0.0.0`, `HTTP_PORT=8095` — the Cloudflare Tunnel hostname `fpilot.faip.pro` points at `http://<vps-ip>:8095`.

`deploy.vars` is never in git and never uploaded by CI.

## Related settings

- The Better Auth session cookie must be valid for `.faip.pro` so the chatbot can forward it.
- Add `https://fpilot.faip.pro` to crm-backend `TRUSTED_ORIGINS` if the browser calls the API directly from the chat UI.
