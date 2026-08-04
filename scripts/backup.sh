#!/bin/bash
# ==============================================
# GS Backup Script
# Backs up MongoDB to S3 with 30-day retention
# ==============================================

set -euo pipefail

MONGODB_URI="${MONGODB_URI:-mongodb://admin:password@localhost:27017}"
S3_BUCKET="${AWS_S3_BUCKET:-GS-backups}"
BACKUP_DIR="/backups/mongo"
DATE=$(date +%Y%m%d-%H%M%S)
BACKUP_PATH="${BACKUP_DIR}/backup-${DATE}"

echo "🗄️  Starting backup: ${DATE}"

# Create backup directory
mkdir -p "${BACKUP_PATH}"

# Dump MongoDB
echo "📦 Dumping MongoDB..."
mongodump --uri="${MONGODB_URI}" --out="${BACKUP_PATH}" --gzip

# Compress backup
echo "🗜️  Compressing..."
tar -czf "${BACKUP_DIR}/backup-${DATE}.tar.gz" -C "${BACKUP_DIR}" "backup-${DATE}"
rm -rf "${BACKUP_PATH}"

# Upload to S3
echo "☁️  Uploading to S3..."
aws s3 cp \
  "${BACKUP_DIR}/backup-${DATE}.tar.gz" \
  "s3://${S3_BUCKET}/mongo/backup-${DATE}.tar.gz" \
  --storage-class STANDARD_IA

echo "✅ Backup uploaded: s3://${S3_BUCKET}/mongo/backup-${DATE}.tar.gz"

# Clean up local files older than 7 days
find "${BACKUP_DIR}" -name "*.tar.gz" -mtime +7 -delete
echo "🧹 Cleaned old local backups"

# Remove S3 backups older than 30 days
aws s3 ls "s3://${S3_BUCKET}/mongo/" | \
  awk '{print $4}' | \
  while read -r key; do
    file_date=$(echo "$key" | grep -oP '\d{8}')
    if [[ -n "$file_date" ]]; then
      cutoff=$(date -d "30 days ago" +%Y%m%d)
      if [[ "$file_date" < "$cutoff" ]]; then
        aws s3 rm "s3://${S3_BUCKET}/mongo/$key"
        echo "🗑️  Removed old backup: $key"
      fi
    fi
  done

echo "✨ Backup complete!"

# Cron setup:
# 0 2 * * * /app/scripts/backup.sh >> /var/log/GS/backup.log 2>&1
