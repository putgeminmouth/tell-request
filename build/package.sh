#!/bin/bash -x

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
ROOT=$(dirname $SCRIPT_DIR)
EXTENSION=$ROOT/extension
TARGET=$ROOT/target
WORK=

function clean {
    rm -rf $TARGET
}

function build_v3 {
    WORK=$TARGET/v3

    mkdir -p $WORK

    cp -R $EXTENSION $WORK
    pushd $WORK

    pushd extension
    ln -s manifest.v3.json manifest.json
    popd

    zip -r extension.zip extension
}

function build_v2 {
    WORK=$TARGET/v2

    mkdir -p $WORK

    cp -R $EXTENSION $WORK
    pushd $WORK

    pushd extension
    ln -s manifest.v2.json manifest.json
    popd

    zip -r extension.zip extension
}

clean
build_v2
build_v3
