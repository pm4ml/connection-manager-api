#!/bin/bash
openssl req -new \
-newkey rsa:4096 \
-sha256 \
-nodes \
-subj "/emailAddress=connection-manager@modusbox.com/CN=modusbox.com/O=DFSP1/OU=DFSP1/L=XX/ST=YY/C=ZZ" \
-reqexts v3_ca -config <(echo "[req]"; echo distinguished_name=req; echo x509_extensions = v3_ca; echo "[ v3_ca ]"; echo "keyUsage = digitalSignature, keyEncipherment, dataEncipherment"; echo "extendedKeyUsage = clientAuth" ) \
-out sha256-4096bits.csr \
-keyout sha256-4096bits.key

openssl req -new \
-newkey rsa:2048 \
-sha256 \
-nodes \
-subj "/emailAddress=connection-manager@modusbox.com/CN=modusbox.com/O=DFSP1/OU=DFSP1/L=XX/ST=YY/C=ZZ" \
-reqexts v3_ca -config <(echo "[req]"; echo distinguished_name=req; echo x509_extensions = v3_ca; echo "[ v3_ca ]"; echo "keyUsage = digitalSignature, keyEncipherment, dataEncipherment"; echo "extendedKeyUsage = clientAuth" ) \
-out sha256-2048bits.csr \
-keyout sha256-2048bits.key
