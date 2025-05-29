#!/usr/bin/env bash

# {{{ Bash settings
# abort on nonzero exitstatus
  set -o errexit
# don't hide errors within pipes
  set -o pipefail
# }}}

# {{{ Variables
  # local
  readonly script_name=$(basename "${0}")
  readonly script_dir=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

  # from exports
  readonly GIT_URL=${GIT_URL:-"https://github.com/pm4ml/connection-manager-api.git"}
  readonly GIT_TAG=${GIT_TAG:-"v2.10.3"}
  readonly TARGET_DIR=${TARGET_DIR:-"/tmp/tests"}
  IFS=$'\t\n'   # Split on newlines and tabs (but not on spaces)
# }}}

echo "Cloning $GIT_URL"
# Make directory
mkdir -p $TARGET_DIR
cd $TARGET_DIR

git clone $GIT_URL .

# git checkout feature/functional-tests

echo "Switching to $GIT_TAG"
git checkout tags/$GIT_TAG

npm ci
npm run backend:start
export TEST=true
export TEST_INT=true
export SWITCH_ID=switch
npm run start

cd ./test/functional-tests

echo "Installing dependencies"

npm i

echo "Executing Functional Tests for $GIT_TAG"

npm test
