#!/bin/bash
# A script for uploading game
if [[ $# -lt 1 ]] || [[ $# -gt 2 ]]; then
    printf "Usage: bash upload.sh {local|dev|prod} [<filePath>]\n"
    printf "Example: bash upload.sh dev\n"
    printf "\n"
    exit
fi
printf "\n[[[[[ upload.sh ]]]]]\n\n"


if [[ ! -z "$2" ]] ; then
    FILE_PATH=$2 npm run upload
else
    npm run upload
fi