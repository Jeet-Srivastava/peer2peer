#!/usr/bin/env bash
set -euo pipefail

if [ "$#" -ne 2 ]; then
    echo "Usage: $0 <template-file> <output-file>" >&2
    exit 1
fi

TEMPLATE_FILE="$1"
OUTPUT_FILE="$2"

required_vars=(
    AWS_REGION
    AWS_ACCOUNT_ID
    EXECUTION_ROLE_ARN
    BACKEND_TASK_FAMILY
    FRONTEND_TASK_FAMILY
    BACKEND_CONTAINER_NAME
    FRONTEND_CONTAINER_NAME
    BACKEND_PORT
    FRONTEND_PORT
    BACKEND_LOG_GROUP
    FRONTEND_LOG_GROUP
    SSM_PREFIX
)

for required_var in "${required_vars[@]}"; do
    if [ -z "${!required_var:-}" ]; then
        echo "Missing required environment variable: ${required_var}" >&2
        exit 1
    fi
done

escape_for_sed() {
    printf '%s' "$1" | sed -e 's/[\/&|]/\\&/g'
}

mkdir -p "$(dirname "${OUTPUT_FILE}")"

sed \
    -e "s|__AWS_REGION__|$(escape_for_sed "${AWS_REGION}")|g" \
    -e "s|__AWS_ACCOUNT_ID__|$(escape_for_sed "${AWS_ACCOUNT_ID}")|g" \
    -e "s|__EXECUTION_ROLE_ARN__|$(escape_for_sed "${EXECUTION_ROLE_ARN}")|g" \
    -e "s|__BACKEND_TASK_FAMILY__|$(escape_for_sed "${BACKEND_TASK_FAMILY}")|g" \
    -e "s|__FRONTEND_TASK_FAMILY__|$(escape_for_sed "${FRONTEND_TASK_FAMILY}")|g" \
    -e "s|__BACKEND_CONTAINER_NAME__|$(escape_for_sed "${BACKEND_CONTAINER_NAME}")|g" \
    -e "s|__FRONTEND_CONTAINER_NAME__|$(escape_for_sed "${FRONTEND_CONTAINER_NAME}")|g" \
    -e "s|__BACKEND_PORT__|$(escape_for_sed "${BACKEND_PORT}")|g" \
    -e "s|__FRONTEND_PORT__|$(escape_for_sed "${FRONTEND_PORT}")|g" \
    -e "s|__BACKEND_LOG_GROUP__|$(escape_for_sed "${BACKEND_LOG_GROUP}")|g" \
    -e "s|__FRONTEND_LOG_GROUP__|$(escape_for_sed "${FRONTEND_LOG_GROUP}")|g" \
    -e "s|__SSM_PREFIX__|$(escape_for_sed "${SSM_PREFIX}")|g" \
    "${TEMPLATE_FILE}" > "${OUTPUT_FILE}"
