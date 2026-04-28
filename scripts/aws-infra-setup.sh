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

join_by_comma() {
    local joined=""
    local item

    for item in "$@"; do
        if [ -z "${joined}" ]; then
            joined="${item}"
        else
            joined="${joined},${item}"
        fi
    done

    printf '%s' "${joined}"
}

discover_default_vpc_id() {
    aws ec2 describe-vpcs \
        --region "${AWS_REGION}" \
        --filters "Name=isDefault,Values=true" \
        --query 'Vpcs[0].VpcId' \
        --output text
}

discover_default_subnets() {
    local vpc_id="$1"

    aws ec2 describe-subnets \
        --region "${AWS_REGION}" \
        --filters "Name=vpc-id,Values=${vpc_id}" "Name=default-for-az,Values=true" \
        --query 'Subnets[].SubnetId' \
        --output text
}

ensure_ecr_repository() {
    local repository_name="$1"

    if aws ecr describe-repositories \
        --repository-names "${repository_name}" \
        --region "${AWS_REGION}" >/dev/null 2>&1; then
        ok "ECR repository '${repository_name}' already exists."
        return
    fi

    aws ecr create-repository \
        --repository-name "${repository_name}" \
        --region "${AWS_REGION}" \
        --image-scanning-configuration scanOnPush=true \
        --image-tag-mutability MUTABLE >/dev/null
    ok "Created ECR repository '${repository_name}'."
}

ensure_log_group() {
    local log_group_name="$1"

    if aws logs describe-log-groups \
        --log-group-name-prefix "${log_group_name}" \
        --region "${AWS_REGION}" \
        --query "logGroups[?logGroupName=='${log_group_name}'].logGroupName" \
        --output text | grep -Fxq "${log_group_name}"; then
        ok "CloudWatch log group '${log_group_name}' already exists."
    else
        aws logs create-log-group \
            --log-group-name "${log_group_name}" \
            --region "${AWS_REGION}" >/dev/null
        ok "Created CloudWatch log group '${log_group_name}'."
    fi

    aws logs put-retention-policy \
        --log-group-name "${log_group_name}" \
        --retention-in-days "${LOG_RETENTION_DAYS}" \
        --region "${AWS_REGION}" >/dev/null
    ok "Ensured ${LOG_RETENTION_DAYS}-day retention on '${log_group_name}'."
}

ensure_execution_role() {
    local trust_policy_file
    local inline_policy_file

    if aws iam get-role --role-name "${EXECUTION_ROLE_NAME}" >/dev/null 2>&1; then
        ok "IAM role '${EXECUTION_ROLE_NAME}' already exists."
    else
        trust_policy_file="$(mktemp)"
        cat > "${trust_policy_file}" <<'JSON'
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
JSON

        aws iam create-role \
            --role-name "${EXECUTION_ROLE_NAME}" \
            --assume-role-policy-document "file://${trust_policy_file}" >/dev/null
        rm -f "${trust_policy_file}"
        ok "Created IAM role '${EXECUTION_ROLE_NAME}'."
    fi

    if aws iam attach-role-policy \
        --role-name "${EXECUTION_ROLE_NAME}" \
        --policy-arn "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy" >/dev/null 2>&1; then
        ok "Ensured AmazonECSTaskExecutionRolePolicy is attached."
    else
        warn "Could not attach AmazonECSTaskExecutionRolePolicy to '${EXECUTION_ROLE_NAME}'. Continuing with existing role permissions."
    fi

    inline_policy_file="$(mktemp)"
    cat > "${inline_policy_file}" <<JSON
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath"
      ],
      "Resource": "arn:aws:ssm:${AWS_REGION}:${AWS_ACCOUNT_ID}:parameter${SSM_PREFIX}*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "kms:Decrypt"
      ],
      "Resource": "*"
    }
  ]
}
JSON

    if aws iam put-role-policy \
        --role-name "${EXECUTION_ROLE_NAME}" \
        --policy-name "${APP_NAME}-ecs-ssm-access" \
        --policy-document "file://${inline_policy_file}" >/dev/null 2>&1; then
        ok "Ensured inline SSM/KMS access policy is attached."
    else
        warn "Could not update inline SSM/KMS access policy on '${EXECUTION_ROLE_NAME}'. Continuing with existing role permissions."
    fi
    rm -f "${inline_policy_file}"
}

ensure_ssm_parameter() {
    local parameter_name="$1"
    local parameter_value="$2"
    local create_mode="$3"

    if aws ssm get-parameter \
        --name "${parameter_name}" \
        --region "${AWS_REGION}" >/dev/null 2>&1; then
        ok "SSM parameter '${parameter_name}' already exists."
        return
    fi

    case "${create_mode}" in
        required)
            if [ -n "${parameter_value}" ]; then
                aws ssm put-parameter \
                    --name "${parameter_name}" \
                    --type SecureString \
                    --value "${parameter_value}" \
                    --region "${AWS_REGION}" >/dev/null
                ok "Created required SSM parameter '${parameter_name}'."
            else
                warn "Missing required SSM parameter '${parameter_name}'."
            fi
            ;;
        generated)
            aws ssm put-parameter \
                --name "${parameter_name}" \
                --type SecureString \
                --value "${parameter_value}" \
                --region "${AWS_REGION}" >/dev/null
            ok "Created generated SSM parameter '${parameter_name}'."
            ;;
        optional)
            aws ssm put-parameter \
                --name "${parameter_name}" \
                --type SecureString \
                --value "${parameter_value}" \
                --region "${AWS_REGION}" >/dev/null
            ok "Created optional SSM parameter '${parameter_name}'."
            ;;
        *)
            echo "Unsupported SSM parameter mode: ${create_mode}" >&2
            exit 1
            ;;
    esac
}

ensure_ecs_cluster() {
    if aws ecs describe-clusters \
        --clusters "${ECS_CLUSTER_NAME}" \
        --region "${AWS_REGION}" \
        --query "clusters[?clusterName=='${ECS_CLUSTER_NAME}' && status=='ACTIVE'].clusterName" \
        --output text | grep -Fxq "${ECS_CLUSTER_NAME}"; then
        ok "ECS cluster '${ECS_CLUSTER_NAME}' already exists."
        return
    fi

    aws ecs create-cluster \
        --cluster-name "${ECS_CLUSTER_NAME}" \
        --region "${AWS_REGION}" >/dev/null
    ok "Created ECS cluster '${ECS_CLUSTER_NAME}'."
}

ensure_security_group() {
    local group_name="$1"
    local description="$2"

    local group_id
    group_id="$(aws ec2 describe-security-groups \
        --region "${AWS_REGION}" \
        --filters "Name=vpc-id,Values=${VPC_ID}" "Name=group-name,Values=${group_name}" \
        --query 'SecurityGroups[0].GroupId' \
        --output text 2>/dev/null || true)"

    if [ -n "${group_id}" ] && [ "${group_id}" != "None" ]; then
        printf '%s' "${group_id}"
        return
    fi

    aws ec2 create-security-group \
        --group-name "${group_name}" \
        --description "${description}" \
        --vpc-id "${VPC_ID}" \
        --region "${AWS_REGION}" \
        --query 'GroupId' \
        --output text
}

ensure_cidr_ingress_rule() {
    local group_id="$1"
    local port="$2"
    local cidr_block="$3"

    aws ec2 authorize-security-group-ingress \
        --group-id "${group_id}" \
        --protocol tcp \
        --port "${port}" \
        --cidr "${cidr_block}" \
        --region "${AWS_REGION}" >/dev/null 2>&1 || true
}

ensure_source_group_ingress_rule() {
    local group_id="$1"
    local source_group_id="$2"
    local port="$3"

    aws ec2 authorize-security-group-ingress \
        --group-id "${group_id}" \
        --protocol tcp \
        --port "${port}" \
        --source-group "${source_group_id}" \
        --region "${AWS_REGION}" >/dev/null 2>&1 || true
}

ensure_load_balancer() {
    local existing_arn

    existing_arn="$(aws elbv2 describe-load-balancers \
        --names "${ALB_NAME}" \
        --region "${AWS_REGION}" \
        --query 'LoadBalancers[0].LoadBalancerArn' \
        --output text 2>/dev/null || true)"

    if [ -n "${existing_arn}" ] && [ "${existing_arn}" != "None" ]; then
        ALB_ARN="${existing_arn}"
    else
        ALB_ARN="$(aws elbv2 create-load-balancer \
            --name "${ALB_NAME}" \
            --region "${AWS_REGION}" \
            --scheme internet-facing \
            --type application \
            --ip-address-type ipv4 \
            --security-groups "${ALB_SECURITY_GROUP_ID}" \
            --subnets "${SUBNET_ARRAY[@]}" \
            --query 'LoadBalancers[0].LoadBalancerArn' \
            --output text)"
        aws elbv2 wait load-balancer-available \
            --load-balancer-arns "${ALB_ARN}" \
            --region "${AWS_REGION}"
        ok "Created Application Load Balancer '${ALB_NAME}'."
    fi

    ALB_DNS_NAME="$(aws elbv2 describe-load-balancers \
        --load-balancer-arns "${ALB_ARN}" \
        --region "${AWS_REGION}" \
        --query 'LoadBalancers[0].DNSName' \
        --output text)"
    ok "Ensured Application Load Balancer '${ALB_NAME}'."
}

ensure_target_group() {
    local target_group_name="$1"
    local port="$2"
    local health_check_path="$3"
    local target_group_arn

    target_group_arn="$(aws elbv2 describe-target-groups \
        --names "${target_group_name}" \
        --region "${AWS_REGION}" \
        --query 'TargetGroups[0].TargetGroupArn' \
        --output text 2>/dev/null || true)"

    if [ -z "${target_group_arn}" ] || [ "${target_group_arn}" = "None" ]; then
        target_group_arn="$(aws elbv2 create-target-group \
            --name "${target_group_name}" \
            --protocol HTTP \
            --port "${port}" \
            --target-type ip \
            --vpc-id "${VPC_ID}" \
            --health-check-protocol HTTP \
            --health-check-path "${health_check_path}" \
            --matcher HttpCode=200-399 \
            --region "${AWS_REGION}" \
            --query 'TargetGroups[0].TargetGroupArn' \
            --output text)"
        ok "Created target group '${target_group_name}'."
    fi

    aws elbv2 modify-target-group \
        --target-group-arn "${target_group_arn}" \
        --health-check-protocol HTTP \
        --health-check-path "${health_check_path}" \
        --health-check-port traffic-port \
        --health-check-interval-seconds 30 \
        --health-check-timeout-seconds 5 \
        --healthy-threshold-count 2 \
        --unhealthy-threshold-count 3 \
        --matcher HttpCode=200-399 \
        --region "${AWS_REGION}" >/dev/null

    printf '%s' "${target_group_arn}"
}

ensure_http_listener() {
    local listener_arn

    listener_arn="$(aws elbv2 describe-listeners \
        --load-balancer-arn "${ALB_ARN}" \
        --region "${AWS_REGION}" \
        --query "Listeners[?Port==\`${HTTP_LISTENER_PORT}\`].ListenerArn | [0]" \
        --output text 2>/dev/null || true)"

    if [ -z "${listener_arn}" ] || [ "${listener_arn}" = "None" ]; then
        listener_arn="$(aws elbv2 create-listener \
            --load-balancer-arn "${ALB_ARN}" \
            --protocol HTTP \
            --port "${HTTP_LISTENER_PORT}" \
            --default-actions "Type=forward,TargetGroupArn=${FRONTEND_TARGET_GROUP_ARN}" \
            --region "${AWS_REGION}" \
            --query 'Listeners[0].ListenerArn' \
            --output text)"
        ok "Created HTTP listener on port ${HTTP_LISTENER_PORT}."
    else
        aws elbv2 modify-listener \
            --listener-arn "${listener_arn}" \
            --default-actions "Type=forward,TargetGroupArn=${FRONTEND_TARGET_GROUP_ARN}" \
            --region "${AWS_REGION}" >/dev/null
        ok "Ensured HTTP listener default action points to '${FRONTEND_TARGET_GROUP_NAME}'."
    fi

    HTTP_LISTENER_ARN="${listener_arn}"
}

ensure_backend_routing_rule() {
    local existing_rule_arn

    existing_rule_arn="$(aws elbv2 describe-rules \
        --listener-arn "${HTTP_LISTENER_ARN}" \
        --region "${AWS_REGION}" \
        --query "Rules[?Priority=='${BACKEND_RULE_PRIORITY}'].RuleArn | [0]" \
        --output text 2>/dev/null || true)"

    if [ -z "${existing_rule_arn}" ] || [ "${existing_rule_arn}" = "None" ]; then
        aws elbv2 create-rule \
            --listener-arn "${HTTP_LISTENER_ARN}" \
            --priority "${BACKEND_RULE_PRIORITY}" \
            --conditions "Field=path-pattern,Values=/api/*,/uploads/*" \
            --actions "Type=forward,TargetGroupArn=${BACKEND_TARGET_GROUP_ARN}" \
            --region "${AWS_REGION}" >/dev/null
        ok "Created backend routing rule for '/api/*' and '/uploads/*'."
        return
    fi

    aws elbv2 modify-rule \
        --rule-arn "${existing_rule_arn}" \
        --conditions "Field=path-pattern,Values=/api/*,/uploads/*" \
        --actions "Type=forward,TargetGroupArn=${BACKEND_TARGET_GROUP_ARN}" \
        --region "${AWS_REGION}" >/dev/null
    ok "Ensured backend routing rule for '/api/*' and '/uploads/*'."
}

require_command aws

: "${AWS_REGION:=us-east-1}"
: "${APP_NAME:=peer2peer}"
: "${BACKEND_ECR_REPOSITORY:=peer2peer-backend}"
: "${FRONTEND_ECR_REPOSITORY:=peer2peer-frontend}"
: "${ECS_CLUSTER_NAME:=peer2peer-cluster}"
: "${EXECUTION_ROLE_NAME:=LabRole}"
: "${SSM_PREFIX:=/peer2peer}"
: "${LOG_RETENTION_DAYS:=30}"
: "${ALB_NAME:=peer2peer-alb}"
: "${ALB_SECURITY_GROUP_NAME:=peer2peer-alb-sg}"
: "${ECS_SERVICE_SECURITY_GROUP_NAME:=peer2peer-ecs-service-sg}"
: "${FRONTEND_TARGET_GROUP_NAME:=peer2peer-frontend-tg}"
: "${BACKEND_TARGET_GROUP_NAME:=peer2peer-backend-tg}"
: "${HTTP_LISTENER_PORT:=80}"
: "${BACKEND_RULE_PRIORITY:=100}"
: "${BACKEND_PORT:=8000}"
: "${FRONTEND_PORT:=80}"
: "${BACKEND_LOG_GROUP:=/ecs/peer2peer-backend}"
: "${FRONTEND_LOG_GROUP:=/ecs/peer2peer-frontend}"
: "${MONGO_URI_VALUE:=}"
: "${JWT_SECRET_VALUE:=}"
: "${STRIPE_SECRET_KEY_VALUE:=sk_test_placeholder}"

AWS_ACCOUNT_ID="${AWS_ACCOUNT_ID:-$(aws sts get-caller-identity --query 'Account' --output text)}"
JWT_SECRET_GENERATED_VALUE="${JWT_SECRET_VALUE:-$(openssl rand -hex 32)}"
EXECUTION_ROLE_ARN="arn:aws:iam::${AWS_ACCOUNT_ID}:role/${EXECUTION_ROLE_NAME}"

VPC_ID="${VPC_ID:-$(discover_default_vpc_id)}"
if [ -z "${VPC_ID}" ] || [ "${VPC_ID}" = "None" ]; then
    echo "Could not discover a default VPC. Export VPC_ID and SUBNET_IDS before rerunning." >&2
    exit 1
fi

SUBNET_IDS_RAW="${SUBNET_IDS:-$(discover_default_subnets "${VPC_ID}")}"
read -r -a SUBNET_ARRAY <<< "${SUBNET_IDS_RAW}"
if [ "${#SUBNET_ARRAY[@]}" -lt 2 ]; then
    echo "Need at least two subnets for the Application Load Balancer. Export SUBNET_IDS and rerun." >&2
    exit 1
fi

cd "${PROJECT_ROOT}"

info "Project root: ${PROJECT_ROOT}"
info "AWS account: ${AWS_ACCOUNT_ID}"
info "AWS region: ${AWS_REGION}"
info "Execution role ARN: ${EXECUTION_ROLE_ARN}"

ensure_ecr_repository "${BACKEND_ECR_REPOSITORY}"
ensure_ecr_repository "${FRONTEND_ECR_REPOSITORY}"

ensure_log_group "${BACKEND_LOG_GROUP}"
ensure_log_group "${FRONTEND_LOG_GROUP}"

ensure_execution_role
ensure_ecs_cluster

ensure_ssm_parameter "${SSM_PREFIX}/MONGO_URI" "${MONGO_URI_VALUE}" required
ensure_ssm_parameter "${SSM_PREFIX}/JWT_SECRET" "${JWT_SECRET_GENERATED_VALUE}" generated
ensure_ssm_parameter "${SSM_PREFIX}/STRIPE_SECRET_KEY" "${STRIPE_SECRET_KEY_VALUE}" optional

ALB_SECURITY_GROUP_ID="$(ensure_security_group "${ALB_SECURITY_GROUP_NAME}" "Public ALB for ${APP_NAME}")"
ECS_SERVICE_SECURITY_GROUP_ID="$(ensure_security_group "${ECS_SERVICE_SECURITY_GROUP_NAME}" "ECS service access for ${APP_NAME}")"
ok "Ensured security groups '${ALB_SECURITY_GROUP_NAME}' and '${ECS_SERVICE_SECURITY_GROUP_NAME}'."

ensure_cidr_ingress_rule "${ALB_SECURITY_GROUP_ID}" "${HTTP_LISTENER_PORT}" "0.0.0.0/0"
ensure_source_group_ingress_rule "${ECS_SERVICE_SECURITY_GROUP_ID}" "${ALB_SECURITY_GROUP_ID}" "${FRONTEND_PORT}"
ensure_source_group_ingress_rule "${ECS_SERVICE_SECURITY_GROUP_ID}" "${ALB_SECURITY_GROUP_ID}" "${BACKEND_PORT}"
ok "Ensured security-group ingress rules for ALB and ECS services."

ensure_load_balancer

FRONTEND_TARGET_GROUP_ARN="$(ensure_target_group "${FRONTEND_TARGET_GROUP_NAME}" "${FRONTEND_PORT}" "/health")"
BACKEND_TARGET_GROUP_ARN="$(ensure_target_group "${BACKEND_TARGET_GROUP_NAME}" "${BACKEND_PORT}" "/health")"
ok "Ensured frontend and backend target groups."

ensure_http_listener
ensure_backend_routing_rule

cat <<SUMMARY

Bootstrap complete.

Cluster:
  ${ECS_CLUSTER_NAME}

Load balancer:
  http://${ALB_DNS_NAME}

Target groups:
  ${FRONTEND_TARGET_GROUP_NAME}
  ${BACKEND_TARGET_GROUP_NAME}

Expected GitHub deployment services:
  peer2peer-frontend-service
  peer2peer-backend-service

Required GitHub secrets:
  AWS_ACCESS_KEY_ID
  AWS_SECRET_ACCESS_KEY
  AWS_SESSION_TOKEN   (required for most learner/lab accounts)

Optional GitHub secret:
  AWS_ROLE_TO_ASSUME  (use this instead of access keys if your account allows GitHub OIDC)

Required runtime SSM parameters:
  ${SSM_PREFIX}/MONGO_URI
  ${SSM_PREFIX}/JWT_SECRET
  ${SSM_PREFIX}/STRIPE_SECRET_KEY

Notes:
  - The script is idempotent and safe to rerun.
  - ECS services are created by the GitHub Actions deployment workflow on first deploy.
SUMMARY
