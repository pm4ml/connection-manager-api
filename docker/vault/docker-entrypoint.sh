#!/usr/bin/dumb-init /bin/sh
# dumb-init is PID 1 so it reaps zombies and forwards signals to the
# backgrounded vault server.
set -e

# Marker lives on a tmpfs (see compose) so it is always absent on container
# start — the healthcheck only passes once this run finishes bootstrapping.
MARKER=/run/service_started
INIT_FILE=/vault/file/init.txt
export VAULT_ADDR=http://127.0.0.1:8233

vault server -config=/vault/config/vault.hcl &
VAULT_PID=$!

# Wait for the listener. `vault status` exits 1 on connection refused, and
# 0 (unsealed) or 2 (sealed) once the listener is up.
until vault status >/dev/null 2>&1 || [ "$?" = "2" ]; do sleep 1; done

# Initialize once. The unseal key and root token persist in the file-storage
# volume so a restart can re-unseal the same backend.
if [ ! -f "$INIT_FILE" ]; then
  vault operator init -key-shares=1 -key-threshold=1 > "$INIT_FILE"
fi
UNSEAL_KEY=$(awk '/Unseal Key 1:/ {print $NF}' "$INIT_FILE")
ROOT_TOKEN=$(awk '/Initial Root Token:/ {print $NF}' "$INIT_FILE")

vault operator unseal "$UNSEAL_KEY" >/dev/null
export VAULT_TOKEN="$ROOT_TOKEN"

vault auth list | grep -q '^approle/' || vault auth enable approle
vault write auth/approle/role/my-role secret_id_ttl=1000m token_ttl=1000m token_max_ttl=1000m
vault read -field role_id auth/approle/role/my-role/role-id > /vault/file/role-id
vault write -field secret_id -f auth/approle/role/my-role/secret-id > /vault/file/secret-id

vault secrets list | grep -q '^pki/' || vault secrets enable -path=pki pki
vault secrets list | grep -q '^secrets/' || vault secrets enable -path=secrets kv
vault secrets tune -max-lease-ttl=97600h pki
vault write pki/config/urls \
    issuing_certificates="$VAULT_ADDR/v1/pki/ca" \
    crl_distribution_points="$VAULT_ADDR/v1/pki/crl"
vault write pki/roles/example.com allowed_domains=example.com allow_subdomains=true allow_any_name=true allow_localhost=true enforce_hostnames=false max_ttl=720h

vault policy write test-policy - <<EOF
path "secrets/*" { capabilities = ["create", "read", "update", "delete", "list", "sudo"] }
path "kv/*"      { capabilities = ["create", "read", "update", "delete", "list", "sudo"] }
path "pki/*"     { capabilities = ["create", "read", "update", "delete", "list", "sudo"] }
path "pki_int/*" { capabilities = ["create", "read", "update", "delete", "list", "sudo"] }
EOF
vault write auth/approle/role/my-role policies=test-policy ttl=1h

vault secrets list | grep -q '^pki_int/' || vault secrets enable -path=pki_int pki
vault secrets tune -max-lease-ttl=43800h pki_int
vault write pki_int/roles/example.com allowed_domains=example.com allow_subdomains=true allow_any_name=true allow_localhost=true enforce_hostnames=false max_ttl=600h

touch "$MARKER"
wait "$VAULT_PID"
