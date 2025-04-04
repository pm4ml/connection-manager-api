#!/bin/sh

mkdir -p /opt/keycloak/data/import

cp /tmp/dfsps-realm-template.json /opt/keycloak/data/import/dfsps-realm.json

# Process realm configuration file with environment variables
sed -i 's/${DFSP_ADMIN_CLIENT_SECRET}/'${DFSP_ADMIN_CLIENT_SECRET}'/g' /opt/keycloak/data/import/dfsps-realm.json

exec /opt/keycloak/bin/kc.sh start-dev --import-realm
