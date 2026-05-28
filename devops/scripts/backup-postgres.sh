#!/usr/bin/env bash
# Nightly PostgreSQL backup to S3
# Runs as a cron job on the EC2 host (not inside a container).
# Schedule: 0 2 * * * /usr/local/bin/backup-postgres >> /var/log/backup-postgres.log 2>&1
#
# Environment: loaded from /etc/backup-postgres.env
# Required vars: POSTGRES_CONTAINER, POSTGRES_USER, POSTGRES_DB,
#                S3_BUCKET, AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY,
#                AWS_DEFAULT_REGION

set -euo pipefail

TIMESTAMP=$(date -u +"%Y-%m-%dT%H-%M-%SZ")
BACKUP_FILE="/tmp/zf45-db-${TIMESTAMP}.sql.gz"
S3_KEY="postgres/${TIMESTAMP}.sql.gz"

# Load environment
if [ -f /etc/backup-postgres.env ]; then
    set -a
    # shellcheck source=/dev/null
    source /etc/backup-postgres.env
    set +a
fi

: "${POSTGRES_CONTAINER:?Required env var POSTGRES_CONTAINER is unset}"
: "${POSTGRES_USER:?Required env var POSTGRES_USER is unset}"
: "${POSTGRES_DB:?Required env var POSTGRES_DB is unset}"
: "${S3_BUCKET:?Required env var S3_BUCKET is unset}"

echo "[$(date -u)] Starting backup: ${POSTGRES_DB} → s3://${S3_BUCKET}/${S3_KEY}"

# Dump and compress in one pipeline — avoids uncompressed temp file
docker exec "${POSTGRES_CONTAINER}" \
    pg_dump -U "${POSTGRES_USER}" "${POSTGRES_DB}" \
    | gzip -9 > "${BACKUP_FILE}"

DUMP_SIZE=$(du -sh "${BACKUP_FILE}" | cut -f1)
echo "[$(date -u)] Dump complete: ${DUMP_SIZE}"

# Upload to S3
aws s3 cp "${BACKUP_FILE}" "s3://${S3_BUCKET}/${S3_KEY}" \
    --storage-class STANDARD \
    --no-progress

echo "[$(date -u)] Uploaded to s3://${S3_BUCKET}/${S3_KEY}"

# Clean up local temp file
rm -f "${BACKUP_FILE}"

echo "[$(date -u)] Backup complete."
