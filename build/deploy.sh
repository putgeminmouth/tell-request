#!/bin/bash -x

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

$SCRIPT_DIR/package.sh

function die {
    echo "$@" >&2
    exit 1
}

VERSION="$(cat $(find . -name manifest.json | head -1) | jq -r .version)"
COMMIT="$(find . -name commit.txt | head -1 | xargs cat)"
TAG="v${VERSION}"

git tag "$TAG" "$COMMIT" && git push origin "$TAG" || [[ "$(git rev-parse "$TAG")" == "$COMMIT" ]] || die "add tag: fail"


