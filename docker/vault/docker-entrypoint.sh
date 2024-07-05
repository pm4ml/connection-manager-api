#!/usr/bin/dumb-init /bin/sh
set -e

# Note above that we run dumb-init as PID 1 in order to reap zombie processes
# as well as forward signals to all processes in its session. Normally, sh
# wouldn't do either of these functions so we'd leak zombies as well as do
# unclean termination of all our sub-processes.

# Prevent core dumps
ulimit -c 0

# Allow setting VAULT_REDIRECT_ADDR and VAULT_CLUSTER_ADDR using an interface
# name instead of an IP address. The interface name is specified using
# VAULT_REDIRECT_INTERFACE and VAULT_CLUSTER_INTERFACE environment variables. If
# VAULT_*_ADDR is also set, the resulting URI will combine the protocol and port
# number with the IP of the named interface.
get_addr () {
    local if_name=$1
    local uri_template=$2
    ip addr show dev $if_name | awk -v uri=$uri_template '/\s*inet\s/ { \
      ip=gensub(/(.+)\/.+/, "\\1", "g", $2); \
      print gensub(/^(.+:\/\/).+(:.+)$/, "\\1" ip "\\2", "g", uri); \
      exit}'
}

if [ -n "$VAULT_REDIRECT_INTERFACE" ]; then
    export VAULT_REDIRECT_ADDR=$(get_addr $VAULT_REDIRECT_INTERFACE ${VAULT_REDIRECT_ADDR:-"http://0.0.0.0:8200"})
    echo "Using $VAULT_REDIRECT_INTERFACE for VAULT_REDIRECT_ADDR: $VAULT_REDIRECT_ADDR"
fi
if [ -n "$VAULT_CLUSTER_INTERFACE" ]; then
    export VAULT_CLUSTER_ADDR=$(get_addr $VAULT_CLUSTER_INTERFACE ${VAULT_CLUSTER_ADDR:-"https://0.0.0.0:8201"})
    echo "Using $VAULT_CLUSTER_INTERFACE for VAULT_CLUSTER_ADDR: $VAULT_CLUSTER_ADDR"
fi

rm -f /tmp/service_started

# VAULT_CONFIG_DIR isn't exposed as a volume but you can compose additional
# config files in there if you use this image as a base, or use
# VAULT_LOCAL_CONFIG below.
VAULT_CONFIG_DIR=/vault/config

# You can also set the VAULT_LOCAL_CONFIG environment variable to pass some
# Vault configuration JSON without having to bind any volumes.
if [ -n "$VAULT_LOCAL_CONFIG" ]; then
    echo "$VAULT_LOCAL_CONFIG" > "$VAULT_CONFIG_DIR/local.json"
fi

# If the user is trying to run Vault directly with some arguments, then
# pass them to Vault.
if [ "${1:0:1}" = '-' ]; then
    set -- vault "$@"
fi

# Look for Vault subcommands.
if [ "$1" = 'server' ]; then
    shift
    set -- vault server \
        -config="$VAULT_CONFIG_DIR" \
        -dev-root-token-id="$VAULT_DEV_ROOT_TOKEN_ID" \
        -dev-listen-address="${VAULT_DEV_LISTEN_ADDRESS:-"0.0.0.0:8200"}" \
        "$@"
elif [ "$1" = 'version' ]; then
    # This needs a special case because there's no help output.
    set -- vault "$@"
elif vault --help "$1" 2>&1 | grep -q "vault $1"; then
    # We can't use the return code to check for the existence of a subcommand, so
    # we have to use grep to look for a pattern in the help output.
    set -- vault "$@"
fi

# If we are running Vault, make sure it executes as the proper user.
if [ "$1" = 'vault' ]; then
    if [ -z "$SKIP_CHOWN" ]; then
        # If the config dir is bind mounted then chown it
        if [ "$(stat -c %u /vault/config)" != "$(id -u vault)" ]; then
            chown -R vault:vault /vault/config || echo "Could not chown /vault/config (may not have appropriate permissions)"
        fi

        # If the logs dir is bind mounted then chown it
        if [ "$(stat -c %u /vault/logs)" != "$(id -u vault)" ]; then
            chown -R vault:vault /vault/logs
        fi

        # If the file dir is bind mounted then chown it
        if [ "$(stat -c %u /vault/file)" != "$(id -u vault)" ]; then
            chown -R vault:vault /vault/file
        fi
    fi

    if [ -z "$SKIP_SETCAP" ]; then
        # Allow mlock to avoid swapping Vault memory to disk
        setcap cap_ipc_lock=+ep $(readlink -f $(which vault))

        # In the case vault has been started in a container without IPC_LOCK privileges
        if ! vault -version 1>/dev/null 2>/dev/null; then
            >&2 echo "Couldn't start vault with IPC_LOCK. Disabling IPC_LOCK, please use --privileged or --cap-add IPC_LOCK"
            setcap cap_ipc_lock=-ep $(readlink -f $(which vault))
        fi
    fi

    if [ "$(id -u)" = '0' ]; then
      set -- su-exec vault "$@"
    fi
fi

"$@" &


sleep 3

export VAULT_TOKEN=$VAULT_DEV_ROOT_TOKEN_ID

vault auth enable approle
vault write auth/approle/role/my-role secret_id_ttl=1000m token_ttl=1000m token_max_ttl=1000m
vault read -field role_id auth/approle/role/my-role/role-id > /vault/tmp/role-id
vault write -field secret_id -f auth/approle/role/my-role/secret-id > /vault/tmp/secret-id
# ROLE_ID=$(vault read -field role_id auth/approle/role/my-role/role-id)
# SECRET_ID=$(vault write -field secret_id -f auth/approle/role/my-role/secret-id)
vault secrets enable -path=pki pki
vault secrets enable -path=secrets kv
vault secrets tune -max-lease-ttl=97600h pki
vault write -field=certificate pki/root/generate/internal \
        common_name="example.com" \
        ttl=97600h
vault write pki/config/urls \
    issuing_certificates="http://127.0.0.1:8233/v1/pki/ca" \
    crl_distribution_points="http://127.0.0.1:8233/v1/pki/crl"
vault write pki/roles/example.com allowed_domains=example.com allow_subdomains=true allow_any_name=true allow_localhost=true enforce_hostnames=false max_ttl=97600h

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

vault policy write test-policy policy.hcl

vault write auth/approle/role/my-role policies=test-policy ttl=1h

vault secrets enable -path=pki_int pki
vault secrets tune -max-lease-ttl=43800h pki_int
vault write pki_int/roles/example.com allowed_domains=example.com allow_subdomains=true require_cn=false allow_any_name=true allow_localhost=true enforce_hostnames=false max_ttl=600h

touch /tmp/service_started

tail -f /dev/null