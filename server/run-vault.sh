set -e

export VAULT_ADDR='http://127.0.0.1:8233'
export VAULT_TOKEN=myroot

# TEMP_DIR=/tmp/vault.$(echo $0 | md5sum | cut -d ' ' -f1)
TEMP_DIR=.vault
mkdir -p $TEMP_DIR

./kill-vault.sh

cd $TEMP_DIR
if [ ! -f vault ]; then
	wget https://releases.hashicorp.com/vault/1.8.1/vault_1.8.1_linux_amd64.zip -N -q --show-progress
	unzip vault*.zip
fi
VAULT_DEV_ROOT_TOKEN_ID=$VAULT_TOKEN VAULT_DEV_LISTEN_ADDRESS=0.0.0.0:8233 ./vault server -dev &
PID="$PID $!"
echo $PID > pid

sleep 3

./vault auth enable approle
./vault write auth/approle/role/my-role secret_id_ttl=1000m token_ttl=1000m token_max_ttl=1000m
./vault read -field role_id auth/approle/role/my-role/role-id > role-id
./vault write -field secret_id -f auth/approle/role/my-role/secret-id > secret-id
# ROLE_ID=$(./vault read -field role_id auth/approle/role/my-role/role-id)
# SECRET_ID=$(./vault write -field secret_id -f auth/approle/role/my-role/secret-id)
./vault secrets enable -path=pki pki
./vault secrets enable -path=secrets kv
./vault secrets tune -max-lease-ttl=97600h pki
./vault write -field=certificate pki/root/generate/internal \
        common_name="example.com" \
        ttl=97600h
./vault write pki/config/urls \
    issuing_certificates="http://127.0.0.1:8200/v1/pki/ca" \
    crl_distribution_points="http://127.0.0.1:8200/v1/pki/crl"
./vault write pki/roles/example.com allowed_domains=example.com allow_subdomains=true allow_any_name=true allow_localhost=true enforce_hostnames=false max_ttl=97600h

tee policy.hcl <<EOF
# List, create, update, and delete key/value secrets
path "secrets/*"
{
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}

path "kv/*"
{
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}

path "pki/*"
{
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}

path "pki_int/*"
{
  capabilities = ["create", "read", "update", "delete", "list", "sudo"]
}

EOF

./vault policy write test-policy policy.hcl

./vault write auth/approle/role/my-role policies=test-policy ttl=1h

./vault secrets enable -path=pki_int pki
./vault secrets tune -max-lease-ttl=43800h pki_int
./vault write pki_int/roles/example.com allowed_domains=example.com allow_subdomains=true allow_any_name=true allow_localhost=true enforce_hostnames=false max_ttl=600h

export VAULT_AUTH_METHOD=APP_ROLE
export VAULT_ROLE_ID_FILE=$(realpath role-id)
export VAULT_ROLE_SECRET_ID_FILE=$(realpath secret-id)

# trap "kill -TERM $PID &> /dev/null" TERM INT
# wait $PID || true
# trap - TERM INT
# wait $PID
