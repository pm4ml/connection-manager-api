#############################################################################
# Copyright 2019 ModusBox, Inc.                                             #
#                                                                           #
# info@modusbox.com                                                         #
#                                                                           #
# Licensed under the Apache License, Version 2.0 (the "License");           #
# you may not use this file except in compliance with the License.          #
# You may obtain a copy of the License at                                   #
# http://www.apache.org/licenses/LICENSE-2.0                                #
#                                                                           #
# Unless required by applicable law or agreed to in writing, software       #
# distributed under the License is distributed on an "AS IS" BASIS,         #
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.  #
# See the License for the specific language governing permissions and       # 
# limitations under the License.                                            #
#############################################################################

#!/bin/bash

set -e

if [ -z $1 ] ; then
    echo "Usage: $0 VERSION local|devint|devintnoauth"
    exit
fi

VERSION="$1"
TARGET_ENV="$2"

SERVICE="connection-manager-api"
DOCKERFILE="Dockerfile"
ORG=${VARIABLE:-modusbox} 

# Get cfssl, THIS IS FOR NEW DOCKERFILES ONLY
#./getcfssl.sh
# Build

case "$TARGET_ENV" in
    local)
        docker build --no-cache --rm \
        -t "${ORG}/${SERVICE}:${VERSION}" \
        -f ${DOCKERFILE} .
        ;;
    devint)
        # ENV specific vars
        #APP_OAUTH_CLIENT_KEY=""
        #EMBEDDED_CERTIFICATE=""
        # P12_PASS_PHRASE=""
        #--build-arg EMBEDDED_CERTIFICATE="${EMBEDDED_CERTIFICATE}" \
        #AUTH_ENABLED=""
        #OAUTH2_ISSUER=""

        docker build --no-cache --rm \
        -t "${ORG}/${SERVICE}:${VERSION}" \
        -f ${DOCKERFILE} \
        --build-arg PORT="80" \
        --build-arg APP_OAUTH_CLIENT_KEY="${APP_OAUTH_CLIENT_KEY}" \
        --build-arg OAUTH2_ISSUER="${OAUTH2_ISSUER}" \
        --build-arg P12_PASS_PHRASE="${P12_PASS_PHRASE}" \
        --build-arg AUTH_ENABLED="TRUE" .

        docker push "${ORG}/${SERVICE}:${VERSION}"
        ;;
    devintnoauth)
        docker build --no-cache --rm \
        -t "${ORG}/${SERVICE}:${VERSION}" \
        -f ${DOCKERFILE} \
        --build-arg PORT="80" \
        --build-arg P12_PASS_PHRASE="SO_VERY_SECURE" \
        --build-arg AUTH_ENABLED="FALSE" .

        docker push "${ORG}/${SERVICE}:${VERSION}"
        ;;
    *) 
        echo "* ERROR this environment is not supported"
        exit
        ;;
esac

#sed -i '' "s|image: ${ORG}/${SERVICE}.*|image: ${ORG}/${SERVICE}:${VERSION}|g" ../helm/values.yaml
#sed -i '' "s|version:.*|version: ${VERSION}|g" ../helm/Chart.yaml
