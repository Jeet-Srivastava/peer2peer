#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"

require_command() {
    if ! command -v "$1" >/dev/null 2>&1; then
        echo "Missing required command: $1" >&2
        exit 1
    fi
}

info() {
    printf '[INFO] %s\n' "$1" >&2
}

ok() {
    printf '[OK] %s\n' "$1" >&2
}

warn() {
    printf '[WARN] %s\n' "$1" >&2
}

discover_network() {
    ALB_ARN="$(aws elbv2 describe-load-balancers \
        --names "${ALB_NAME}" \
        --region "${AWS_REGION}" \
        --query 'LoadBalancers[0].LoadBalancerArn' \
        --output text)"

    ALB_DNS_NAME="$(aws elbv2 describe-load-balancers \
        --names "${ALB_NAME}" \
        --region "${AWS_REGION}" \
        --query 'LoadBalancers[0].DNSName' \
        --output text)"

    VPC_ID="$(aws elbv2 describe-load-balancers \
        --names "${ALB_NAME}" \
        --region "${AWS_REGION}" \
        --query 'LoadBalancers[0].VpcId' \
        --output text)"

    SUBNETS_CSV="$(aws elbv2 describe-load-balancers \
        --names "${ALB_NAME}" \
        --region "${AWS_REGION}" \
        --query 'LoadBalancers[0].AvailabilityZones[].SubnetId' \
        --output text | tr '\t' ',')"

    SERVICE_SG_ID="$(aws ec2 describe-security-groups \
        --region "${AWS_REGION}" \
        --filters "Name=vpc-id,Values=${VPC_ID}" "Name=group-name,Values=${ECS_SERVICE_SECURITY_GROUP_NAME}" \
        --query 'SecurityGroups[0].GroupId' \
        --output text)"

    BACKEND_TARGET_GROUP_ARN="$(aws elbv2 describe-target-groups \
        --names "${BACKEND_TARGET_GROUP_NAME}" \
        --region "${AWS_REGION}" \
        --query 'TargetGroups[0].TargetGroupArn' \
        --output text)"

    FRONTEND_TARGET_GROUP_ARN="$(aws elbv2 describe-target-groups \
        --names "${FRONTEND_TARGET_GROUP_NAME}" \
        --region "${AWS_REGION}" \
        --query 'TargetGroups[0].TargetGroupArn' \
        --output text)"
}

render_task_definition() {
    local service_key="$1"
    local template_file="$2"
    local output_file="$3"
    local image_uri="$4"
    local placeholder="$5"

    "${PROJECT_ROOT}/scripts/render-task-definition-template.sh" "${template_file}" "${output_file}"
    sed -i.bak "s|${placeholder}|${image_uri}|g" "${output_file}"
    rm -f "${output_file}.bak"
    ok "Rendered ${service_key} task definition."
}

deploy_service() {
    local service_name="$1"
    local task_definition_file="$2"
    local container_name="$3"
    local container_port="$4"
    local target_group_arn="$5"
    local health_check_grace_period="$6"

    local task_definition_arn
    local service_status

    task_definition_arn="$(aws ecs register-task-definition \
        --cli-input-json "file://${task_definition_file}" \
        --region "${AWS_REGION}" \
        --query 'taskDefinition.taskDefinitionArn' \
        --output text)"

    service_status="$(aws ecs describe-services \
        --cluster "${ECS_CLUSTER}" \
        --services "${service_name}" \
        --region "${AWS_REGION}" \
        --query 'services[0].status' \
        --output text 2>/dev/null || true)"

    if [ "${service_status}" = "ACTIVE" ]; then
        aws ecs update-service \
            --cluster "${ECS_CLUSTER}" \
            --service "${service_name}" \
            --task-definition "${task_definition_arn}" \
            --region "${AWS_REGION}" \
            --force-new-deployment >/dev/null
        ok "Updated ECS service '${service_name}'."
    else
        aws ecs create-service \
            --cluster "${ECS_CLUSTER}" \
            --service-name "${service_name}" \
            --task-definition "${task_definition_arn}" \
            --desired-count 1 \
            --launch-type FARGATE \
            --platform-version LATEST \
            --health-check-grace-period-seconds "${health_check_grace_period}" \
            --load-balancers "targetGroupArn=${target_group_arn},containerName=${container_name},containerPort=${container_port}" \
            --network-configuration "awsvpcConfiguration={subnets=[${SUBNETS_CSV}],securityGroups=[${SERVICE_SG_ID}],assignPublicIp=ENABLED}" \
            --region "${AWS_REGION}" >/dev/null
        ok "Created ECS service '${service_name}'."
    fi

    aws ecs wait services-stable \
        --cluster "${ECS_CLUSTER}" \
        --services "${service_name}" \
        --region "${AWS_REGION}"
    ok "ECS service '${service_name}' is stable."
}

require_command aws
require_command docker
require_command sed

: "${AWS_REGION:=us-east-1}"
: "${ALB_NAME:=peer2peer-alb}"
: "${ECS_CLUSTER:=peer2peer-cluster}"
: "${EXECUTION_ROLE_NAME:=LabRole}"
: "${SSM_PREFIX:=/peer2peer}"
: "${BACKEND_TASK_FAMILY:=peer2peer-backend-task}"
: "${FRONTEND_TASK_FAMILY:=peer2peer-frontend-task}"
: "${BACKEND_CONTAINER_NAME:=peer2peer-backend}"
: "${FRONTEND_CONTAINER_NAME:=peer2peer-frontend}"
: "${BACKEND_PORT:=8000}"
: "${FRONTEND_PORT:=80}"
: "${BACKEND_LOG_GROUP:=/ecs/peer2peer-backend}"
: "${FRONTEND_LOG_GROUP:=/ecs/peer2peer-frontend}"
: "${BACKEND_ECR_REPOSITORY:=peer2peer-backend}"
: "${FRONTEND_ECR_REPOSITORY:=peer2peer-frontend}"
: "${BACKEND_TARGET_GROUP_NAME:=peer2peer-backend-tg}"
: "${FRONTEND_TARGET_GROUP_NAME:=peer2peer-frontend-tg}"
: "${BACKEND_SERVICE_NAME:=peer2peer-backend-service}"
: "${FRONTEND_SERVICE_NAME:=peer2peer-frontend-service}"
: "${ECS_SERVICE_SECURITY_GROUP_NAME:=peer2peer-ecs-service-sg}"
: "${IMAGE_TAG:=$(git -C "${PROJECT_ROOT}" rev-parse HEAD)}"

cd "${PROJECT_ROOT}"

AWS_ACCOUNT_ID="$(aws sts get-caller-identity --query 'Account' --output text)"
EXECUTION_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/${EXECUTION_ROLE_NAME}"
BACKEND_IMAGE_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${BACKEND_ECR_REPOSITORY}:${IMAGE_TAG}"
FRONTEND_IMAGE_URI="${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${FRONTEND_ECR_REPOSITORY}:${IMAGE_TAG}"

info "Using AWS account ${AWS_ACCOUNT_ID} in ${AWS_REGION}."
discover_network

aws ecr get-login-password --region "${AWS_REGION}" | docker login --username AWS --password-stdin "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com" >/dev/null
ok "Logged in to Amazon ECR."

docker buildx inspect >/dev/null 2>&1 || docker buildx create --use --name peer2peer-builder >/dev/null

docker buildx build \
    --platform linux/amd64 \
    --provenance=false \
    --sbom=false \
    -f backend/Dockerfile \
    -t "${BACKEND_IMAGE_URI}" \
    -t "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${BACKEND_ECR_REPOSITORY}:latest" \
    --push \
    ./backend
ok "Built and pushed backend image."

docker buildx build \
    --platform linux/amd64 \
    --provenance=false \
    --sbom=false \
    -f frontend/Dockerfile \
    --build-arg VITE_API_URL=/api \
    -t "${FRONTEND_IMAGE_URI}" \
    -t "${AWS_ACCOUNT_ID}.dkr.ecr.${AWS_REGION}.amazonaws.com/${FRONTEND_ECR_REPOSITORY}:latest" \
    --push \
    ./frontend
ok "Built and pushed frontend image."

export AWS_REGION
export AWS_ACCOUNT_ID
export EXECUTION_ROLE_ARN
export BACKEND_TASK_FAMILY
export FRONTEND_TASK_FAMILY
export BACKEND_CONTAINER_NAME
export FRONTEND_CONTAINER_NAME
export BACKEND_PORT
export FRONTEND_PORT
export BACKEND_LOG_GROUP
export FRONTEND_LOG_GROUP
export SSM_PREFIX

BACKEND_TASK_DEFINITION_FILE="$(mktemp)"
FRONTEND_TASK_DEFINITION_FILE="$(mktemp)"

render_task_definition \
    backend \
    ecs/backend-task-definition.json.template \
    "${BACKEND_TASK_DEFINITION_FILE}" \
    "${BACKEND_IMAGE_URI}" \
    "__BACKEND_IMAGE__"

render_task_definition \
    frontend \
    ecs/frontend-task-definition.json.template \
    "${FRONTEND_TASK_DEFINITION_FILE}" \
    "${FRONTEND_IMAGE_URI}" \
    "__FRONTEND_IMAGE__"

deploy_service \
    "${BACKEND_SERVICE_NAME}" \
    "${BACKEND_TASK_DEFINITION_FILE}" \
    "${BACKEND_CONTAINER_NAME}" \
    "${BACKEND_PORT}" \
    "${BACKEND_TARGET_GROUP_ARN}" \
    60

deploy_service \
    "${FRONTEND_SERVICE_NAME}" \
    "${FRONTEND_TASK_DEFINITION_FILE}" \
    "${FRONTEND_CONTAINER_NAME}" \
    "${FRONTEND_PORT}" \
    "${FRONTEND_TARGET_GROUP_ARN}" \
    30

rm -f "${BACKEND_TASK_DEFINITION_FILE}" "${FRONTEND_TASK_DEFINITION_FILE}"

cat <<SUMMARY

Deployment complete.

Frontend URL:
  http://${ALB_DNS_NAME}

Backend API base:
  http://${ALB_DNS_NAME}/api
SUMMARY
