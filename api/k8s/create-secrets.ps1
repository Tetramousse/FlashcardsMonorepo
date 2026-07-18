# Creates/updates the Kubernetes Secrets consumed by the manifests in this folder.
# Reads values from the gitignored api/.env and api/serviceAccountKey.json — never
# commit those files or any output of this script.
#
# Idempotent: re-run after changing values, then restart the consumers (see note at the end).

$ErrorActionPreference = "Stop"

$apiDir  = Split-Path -Parent $PSScriptRoot
$envFile = Join-Path $apiDir ".env"
$saKey   = Join-Path $apiDir "serviceAccountKey.json"

if (-not (Test-Path $envFile)) { throw ".env not found at $envFile" }
if (-not (Test-Path $saKey))   { throw "serviceAccountKey.json not found at $saKey" }

# Parse .env (supports both KEY="value" and KEY = "value")
$vars = @{}
foreach ($line in Get-Content $envFile) {
    if ($line -match '^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$') {
        $vars[$Matches[1]] = $Matches[2].Trim().Trim('"').Trim("'")
    }
}

foreach ($k in @("AI_API_KEY", "DATABASE_URL", "POSTGRES_USER", "POSTGRES_PASSWORD", "POSTGRES_DB")) {
    if (-not $vars[$k]) { throw "Missing $k in $envFile" }
}
if ($vars["DATABASE_URL"] -notmatch '@db[:/]') {
    throw "DATABASE_URL in .env does not point at the in-cluster host 'db' (got a different host). Fix .env before applying."
}

kubectl create secret generic db-credentials `
    --from-literal=POSTGRES_USER=$($vars["POSTGRES_USER"]) `
    --from-literal=POSTGRES_PASSWORD=$($vars["POSTGRES_PASSWORD"]) `
    --from-literal=POSTGRES_DB=$($vars["POSTGRES_DB"]) `
    --from-literal=DATABASE_URL=$($vars["DATABASE_URL"]) `
    --dry-run=client -o yaml | kubectl apply -f -
if ($LASTEXITCODE -ne 0) { throw "failed to apply db-credentials" }

kubectl create secret generic flashcard-gen-secret `
    --from-literal=API_KEY=$($vars["AI_API_KEY"]) `
    --dry-run=client -o yaml | kubectl apply -f -
if ($LASTEXITCODE -ne 0) { throw "failed to apply flashcard-gen-secret" }

kubectl create secret generic firebase-service-account `
    --from-file=serviceAccountKey.json=$saKey `
    --dry-run=client -o yaml | kubectl apply -f -
if ($LASTEXITCODE -ne 0) { throw "failed to apply firebase-service-account" }

Write-Host ""
Write-Host "Secrets applied. Env vars and subPath mounts do NOT pick up new values automatically;"
Write-Host "if you changed values on an already-running cluster, restart the consumers:"
Write-Host "  kubectl rollout restart deployment/backend-service deployment/flashcard-gen deployment/db"
