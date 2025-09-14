#!/bin/bash
set -e

echo "Setting environment variables... ($1)"
while [ "$#" -gt 0 ]; do
    case $1 in
        -fe|--forceEnvironment) forceEnvironment="1"; shift ;;
        *) echo "Unknown parameter passed: $1"; exit 1 ;;
    esac
    shift
done

echo "forceEnvironment: $forceEnvironment"

environmentName=${FMORK_SITE_ENVIRONMENT_NAME}

if [ -z "$environmentName" ]
then
    echo Resolving stage name
    # First, check if this is a dependabot build
    environmentName=${CODEBUILD_WEBHOOK_HEAD_REF}
    echo
    if [[ "$environmentName" == *"dependabot"* ]];
    then
        environmentName="dependabot"
    else
        environmentName=${CODEBUILD_WEBHOOK_HEAD_REF##*/}
        if [ -z $environmentName ];
        then
            environmentName=${CODEBUILD_WEBHOOK_TRIGGER##*/}
        fi

        if [ -z "$environmentName" ];
        then
            environmentName=$(echo $STAGE | cut -f2 -d/)
        fi
    fi

    if [ -z $environmentName ];
    then
        environmentName="local_build"
    fi

fi

if [ "$forceEnvironment" == "1" ]
then
    # FMORK_SITE_DOMAIN_NAME should be set up in the build environment
    if [ -z "$FMORK_SITE_DOMAIN_NAME" ]
    then
        echo "Please configure the build environment to have FMORK_SITE_DOMAIN_NAME set"
        exit 1
    fi

    # FMORK_SITE_OIDC_CLIENT_ID should be set up in the build environment
    if [ -z "$FMORK_SITE_OIDC_CLIENT_ID" ]
    then
        echo "Please configure the build environment to have FMORK_SITE_OIDC_CLIENT_ID set"
        exit 1
    fi

    # FMORK_SITE_OIDC_CLIENT_SECRET should be set up in the build environment
    if [ -z "$FMORK_SITE_OIDC_CLIENT_SECRET" ]
    then
        echo "Please configure the build environment to have FMORK_SITE_OIDC_CLIENT_SECRET set"
        exit 1
    fi

    # FMORK_SITE_OIDC_AUTHORITY should be set up in the build environment
    if [ -z "$FMORK_SITE_OIDC_AUTHORITY" ]
    then
        echo "Please configure the build environment to have FMORK_SITE_OIDC_AUTHORITY set"
        exit 1
    fi
fi

if [ "$environmentName" == "main" ]
then
    environmentName="prod"
    apiHostName="api.$FMORK_SITE_DOMAIN_NAME"
    staticHostName="static.$FMORK_SITE_DOMAIN_NAME"
else
    apiHostName="$environmentName-api.$FMORK_SITE_DOMAIN_NAME"
    staticHostName="$environmentName-static.$FMORK_SITE_DOMAIN_NAME"
fi

export FMORK_SITE_AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
export FMORK_SITE_AWS_REGION=$AWS_DEFAULT_REGION
export FMORK_SITE_ENVIRONMENT_NAME=$environmentName
export FMORK_SITE_API_HOST_NAME=$apiHostName
export FMORK_SITE_STATIC_HOST_NAME=$staticHostName

echo "Environment name is '$FMORK_SITE_ENVIRONMENT_NAME'"
