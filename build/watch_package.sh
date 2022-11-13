#!/bin/bash -x

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )

while [[ true ]];
do
    date
    echo "Watching filesystem for changes..."
    fswatch $SCRIPT_DIR/../extension | $SCRIPT_DIR/package.sh
    sleep 0 # ease interrupt
done
