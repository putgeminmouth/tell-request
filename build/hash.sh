#!/bin/bash

find . -type f | sort -n | xargs sha256sum | sha256sum | awk '{print $1}'
