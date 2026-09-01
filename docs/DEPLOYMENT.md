# Deployment — Fpilot UI (fpilot.faip.pro)

CI/CD mirrors the sibling stacks on the same EC2 host (`54.66.53.9`):
GitHub Actions builds a Docker image, pushes it to Docker Hub, then SSHes in
and restarts a Compose stack. TLS + public routing is done by the host-level
Cloudflare Tunnel.

| Piece | Value |
|---|---|
| Repo | `ai-nes/crm-chatbot-ai`, branch `main` |
| Image | `annguyen11/crm-chatbot:<sha>` + `:latest` |
| Server dir | `/opt/crm-chatbot-ai` |
| Container | `crm-chatbot-prod-web-1`, listens `127.0.0.1:8095 -> 5173` |
| Public URL | `https://fpilot.faip.pro` (Cloudflare Tunnel) |
| Workflow | `.github/workflows/deploy.yml` (push to `main` or manual) |

## Pipeline

1. `build-and-push` — `docker build` (multi-stage, Next `output: standalone`),
   inlining the `NEXT_PUBLIC_*` values from the workflow `env:` block as build
   args, then push `:latest` and `:<sha>`.
2. `deploy-ec2` — `scp` the compose file to `/opt/crm-chatbot-ai/docker/`,
   `docker compose pull` + `up -d` with `CHATBOT_IMAGE=<sha>`, wait for the
   container healthcheck (`/api/health`), fail on `unhealthy`.

`docker/.env` on the server is **never** in git and never uploaded by CI — it
holds only server-side secrets.

## One-time setup

### 1. GitHub — `production` environment secrets

Repo → Settings → Environments → `production`:

| Secret | Value |
|---|---|
| `DOCKER_USERNAME` | `annguyen11` (same Docker Hub account as the other stacks) |
| `DOCKER_PASSWORD` | Docker Hub access token with push rights |
| `EC2_SSH_KEY` | private key contents of `crm.pem` (the `ubuntu@54.66.53.9` key) |

`EC2_HOST` / `EC2_USER` are hardcoded in the workflow `env:` block.

### 2. Server — create the stack dir and env file

```bash
ssh -i crm.pem ubuntu@54.66.53.9
sudo install -d -m 755 /opt/crm-chatbot-ai/docker
sudo tee /opt/crm-chatbot-ai/docker/.env >/dev/null <<'EOF'
CHATBOT_IMAGE=annguyen11/crm-chatbot:latest
HTTP_PORT=8095
CHAT_API_KEY=<same value as API_KEY in /opt/ai-crm/.env>
OPENAI_API_KEY=
EOF
sudo chmod 600 /opt/crm-chatbot-ai/docker/.env
```

Template: [`docker/.env.example`](../docker/.env.example).

### 3. Cloudflare Tunnel — add the public hostname

The tunnel runs remotely-managed (`--token-file`), so ingress is configured in
the dashboard, not on the box.

Cloudflare Zero Trust → Networks → Tunnels → (the running tunnel) →
Public Hostname → **Add**:

- Subdomain `fpilot`, Domain `faip.pro`
- Service: `HTTP`  →  `localhost:8095`

Save. Cloudflare creates the `fpilot.faip.pro` proxied DNS record itself.

### 4. First deploy

Push to `main` (or run the workflow manually). Then verify:

```bash
curl -fsS https://fpilot.faip.pro/api/health      # {"status":"ok",...}
```

## Configuration notes

- **`NEXT_PUBLIC_*` are build-time.** Changing any of them (API URL, cookie
  domain, embed allowlist) means editing `.github/workflows/deploy.yml` and
  redeploying — the running container cannot pick up new values.
- **`NEXT_PUBLIC_API_URL`** is `https://crm.faip.pro/` — the chat route proxies
  `POST {API_URL}/api/v1/chat` server-side with the `x-api-key` header.
- **`CHAT_API_KEY`** must match `API_KEY` in `/opt/ai-crm/.env`, otherwise the
  agent backend returns 401.
- **Embed origins** (`NEXT_PUBLIC_EMBED_ALLOWED_ORIGINS`) currently allow
  `crm.faip.pro` and `faip.pro`; add any other parent app that iframes
  `/embed/chatbot`.

## Rollback

```bash
ssh -i crm.pem ubuntu@54.66.53.9
cd /opt/crm-chatbot-ai
sudo CHATBOT_IMAGE=annguyen11/crm-chatbot:<previous-sha> \
  docker compose --env-file docker/.env -f docker/docker-compose.prod.yml up -d
```

## Local image test

```bash
docker build -t crm-chatbot:test \
  --build-arg NEXT_PUBLIC_API_URL=https://crm.faip.pro/ .
docker run --rm -p 8095:5173 -e CHAT_API_KEY=dummy crm-chatbot:test
curl -fsS http://localhost:8095/api/health
```
