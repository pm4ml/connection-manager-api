#!/bin/sh
# Render the Ory config templates, substituting the deployment parameters
# (domain, Keto endpoint, hub object) into the mounted config files.
set -e

apk add --no-cache gettext >/dev/null

cd /templates
find . -type f ! -name 'render-config.sh' | while read -r f; do
  dest="/rendered/${f#./}"
  mkdir -p "$(dirname "$dest")"
  envsubst '${COMPOSE_DOMAIN} ${MCM_FQDN} ${KETO_READ_URL} ${KETO_HUB_OBJECT}' < "$f" > "$dest"
done

mkdir -p /rendered/oathkeeper
envsubst '${MCM_FQDN} ${KETO_READ_URL} ${KETO_HUB_OBJECT}' \
  < /permissions/oathkeeper-rules.yml > /rendered/oathkeeper/access-rules.yml

echo "Rendered Ory config for domain: ${COMPOSE_DOMAIN}"
