#!/bin/bash
# A script for uploading game
if [[ $# -lt 1 ]] || [[ $# -gt 2 ]]; then
    printf "Usage: sh upload.sh {local|dev|prod} [<filePath>]\n"
    printf "Example: sh upload.sh dev\n"
    printf "\n"
    exit
fi
printf "\n[[[[[ upload.sh ]]]]]\n\n"

API_SERVER=""
if [[ "$1" = 'local' ]]; then
    API_SERVER=$(ipconfig getifaddr en0)
elif [[ "$1" = 'dev' ]]; then
    API_SERVER="miniegg-plus-backend-dev.ainize.ai"
elif [[ "$1" = 'prod' ]]; then
    API_SERVER="miniegg-plus-backend.ainize.ai"
else
    printf "Invalid project argument: $1\n"
    exit
fi

printf "API_SERVER: $API_SERVER"
export API_SERVER=$API_SERVER

if [[ ! -z "$2" ]] ; then
    FILE_PATH=$2 npm run upload
else
    npm run upload
fi