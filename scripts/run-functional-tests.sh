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
  readonly GIT_URL=${GIT_URL:-"https://github.com/modusbox/connection-manager-api.git"}
  readonly GIT_TAG=${GIT_TAG:-"v13.1.0"}
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

cd ./test/functional-tests

echo "Installing dependencies"

if [[ -f ".nvmrc" ]]; then
    nvm install $(cat .nvmrc)
    nvm use
fi

npm i

echo "Executong Functional Tests for $GIT_TAG"

npm test
