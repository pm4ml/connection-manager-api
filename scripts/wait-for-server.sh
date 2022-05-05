#!/bin/sh
# wait-for-server.sh

set -e

WAIT_FOR_SERVER_HOST=${WAIT_FOR_SERVER_HOST:-"localhost"}
WAIT_FOR_SERVER_PORT=${WAIT_FOR_SERVER_PORT:-"3001"}

function healthCheck() {  
  curl -s -X GET "http://$WAIT_FOR_SERVER_HOST:$WAIT_FOR_SERVER_PORT"
}

echo -n "Waiting for $WAIT_FOR_SERVER_HOST to startup";
until healthCheck; do
  echo -n '.' && sleep 1; 
done

echo "Successfully connected to $WAIT_FOR_SERVER_HOST!";
