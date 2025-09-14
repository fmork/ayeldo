#!/bin/bash
set -e

if [[ $BASH_SOURCE = */* ]]; then
    bundledir=${BASH_SOURCE%/*}/
else
    bundledir=./
fi

source "${bundledir}set-environment.sh" --forceEnvironment true

if [ -z "$FMORK_SITE_ENVIRONMENT_NAME" ]
then
    echo "No environment name set. Skipping deploy."
    exit 0
fi

if [[ "$FMORK_SITE_ENVIRONMENT_NAME" == "dependabot" ]]
then
    echo "This is a dependabot build. Skipping deploy."
    exit 0
fi

echo "Deploying environment '$FMORK_SITE_ENVIRONMENT_NAME' in region '$FMORK_SITE_AWS_REGION' in account '$FMORK_SITE_AWS_ACCOUNT_ID'"

cd apps/web

# Create .env file
echo "VITE_BFF_BASE_URL=https://$FMORK_SITE_API_HOST_NAME" >> .env
echo "VITE_STATIC_SITE_URL=https://$FMORK_SITE_STATIC_HOST_NAME" >> .env

echo
echo ".env-----"
cat .env
echo "-----"

cd ../..
# Prebuild deployment artifacts (Lambdas + web assets)
pnpm run build:artifacts

echo
echo Deploying...
cd infra/cdk
pnpm run synth
pnpm run deploy

echo
echo Done.
