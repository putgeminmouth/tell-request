#!/bin/bash -x

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
ROOT=$(dirname $SCRIPT_DIR)
EXTENSION=$ROOT/extension
TARGET=$ROOT/target
WORK=

function die {
    echo "$@" >&2
    exit 1
}

function clean {
    rm -rf $TARGET
}

function hash {
    $SCRIPT_DIR/hash.sh "$@"
}

function current_commit {
    git log -1 --format='%H'
}

function build_v3 {
    WORK=$TARGET/v3

    mkdir -p $WORK

    cp -R $EXTENSION $WORK
    pushd $WORK

    pushd extension

    mv manifest.v3.json manifest.json
    hash > checksum.txt
    current_commit > commit.txt
    zip -r ../extension.zip *
}

function build_v2 {
    WORK=$TARGET/v2

    mkdir -p $WORK

    cp -R $EXTENSION $WORK
    pushd $WORK

    pushd extension

    mv manifest.v2.json manifest.json
    hash > checksum.txt
    current_commit > commit.txt
    zip -r ../extension.zip *
}

function test {
    [[ "$(cat manifest.v2.json | jq -r .version)" == "$(cat manifest.v3.json | jq -r .version)" ]] || die "manifest version mismatch"
}

pushd $ROOT

clean
test || die "test: fail"
build_v2
build_v3

VERSION="$(cat $(find . -name manifest.json | head) | jq -r .version)"
COMMIT="$(current_commit)"
TAG="v${VERSION}"

git tag "$TAG" "$COMMIT" || die "add tag: fail"
git push origin "$TAG"

