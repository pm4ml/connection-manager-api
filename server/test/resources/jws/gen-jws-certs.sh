#!/bin/bash

# JWS Certificates

cat <<EOF |  cfssl genkey -config ca-config.json -initca - | cfssljson -bare ca -
{
  "hosts": ["ca.test.mojaloop.org"],
  "key": { "algo": "rsa", "size": 4096 },
  "names": [{ "O": "Mojaloop", "OU": "Connection Manager", "L": "-", "ST": "-", "C": "-" }]
}
EOF


cat <<EOF | cfssl gencert -ca ca.pem -ca-key ca-key.pem - | cfssljson -bare hub-jws -
{
    "hosts": [
         "switch.test.mojaloop.org"
     ],
     "key": {
         "algo": "rsa",
         "size": 4096
     },
     "names": [
         {
             "O": "Mojaloop",
             "OU": "Connection Manager",
             "C": "-",
             "L": "-",
             "ST": "-"
         }
     ]
 }
EOF


cat <<EOF | cfssl gencert -ca ca.pem -ca-key ca-key.pem - | cfssljson -bare hub-update-jws -
{
    "hosts": [
         "switch.test.mojaloop.org"
     ],
     "key": {
         "algo": "rsa",
         "size": 4096
     },
     "names": [
         {
             "O": "Mojaloop",
             "OU": "Connection Manager",
             "C": "-",
             "L": "-",
             "ST": "-"
         }
     ]
 }
EOF

cat <<EOF | cfssl gencert -ca ca.pem -ca-key ca-key.pem - | cfssljson -bare dfsp1-jws -
{
    "hosts": [
         "dfsp1.test.mojaloop.org"
     ],
     "key": {
         "algo": "rsa",
         "size": 4096
     },
     "names": [
         {
             "O": "Mojaloop",
             "OU": "DFSP 1",
             "C": "-",
             "L": "-",
             "ST": "-"
         }
     ]
 }
EOF

cat <<EOF | cfssl gencert -ca ca.pem -ca-key ca-key.pem - | cfssljson -bare dfsp1-update-jws -
{
    "hosts": [
         "dfsp1.test.mojaloop.org"
     ],
     "key": {
         "algo": "rsa",
         "size": 4096
     },
     "names": [
         {
             "O": "Mojaloop",
             "OU": "DFSP 1",
             "C": "-",
             "L": "-",
             "ST": "-"
         }
     ]
 }
EOF


# short key


cat <<EOF | cfssl gencert -ca ca.pem -ca-key ca-key.pem - | cfssljson -bare dfsp-short-jws -
{
    "hosts": [
         "switch.test.mojaloop.org"
     ],
     "key": {
         "algo": "ecdsa",
         "size": 256
     },
     "names": [
         {
             "O": "Mojaloop",
             "OU": "Connection Manager",
             "C": "-",
             "L": "-",
             "ST": "-"
         }
     ]
 }
EOF

