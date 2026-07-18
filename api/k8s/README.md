# Kubernetes deployment (DOKS)

Sanitized manifests — **no secret values live in this folder**. Secrets are created
at deploy time from the gitignored `api/.env` and `api/serviceAccountKey.json` by
`create-secrets.ps1`, as three standard Kubernetes `Secret` objects:

| Secret | Keys | Consumed by |
|---|---|---|
| `db-credentials` | `POSTGRES_USER/PASSWORD/DB`, `DATABASE_URL` | `db`, `backend-service` (env `secretKeyRef`) |
| `flashcard-gen-secret` | `API_KEY` | `flashcard-gen` (env `secretKeyRef`) |
| `firebase-service-account` | `serviceAccountKey.json` | `backend-service` (Secret volume at `/app/serviceAccountKey.json`) |

## Deploy (order matters)

```powershell
# 1. Point kubectl at the cluster
doctl kubernetes cluster kubeconfig save <cluster-name>

# 2. Create the Secrets FIRST (pods fail with CreateContainerConfigError otherwise)
./create-secrets.ps1

# 3. Apply everything
kubectl apply -f .

# 4. Wait for rollout
kubectl rollout status deployment/backend-service deployment/db deployment/flashcard-gen deployment/nginx

# 5. Public IP
kubectl get svc nginx
```

## Updating a secret value

Edit `api/.env` (or replace `api/serviceAccountKey.json`), re-run `create-secrets.ps1`,
then restart the consumers — env vars and subPath mounts do **not** live-update:

```powershell
kubectl rollout restart deployment/backend-service deployment/flashcard-gen
```

Note: `POSTGRES_PASSWORD` only takes effect at first database init; on an existing
volume, change it with `ALTER USER` inside postgres first, then update `.env`.

## Notes

- CI (`.github/workflows/api-ghcr.yml`) only runs `kubectl set image deployment/backend-service ...`; it never applies these manifests.
- `api/kompose/` is gitignored kompose scratch output — do not commit it, and never commit a kubeconfig.
