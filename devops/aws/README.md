# AWS — Manual Configuration Steps

All steps below are performed once by the founder in the AWS console or CLI.
None of these are automated — they are pre-requisites before the first deploy.

---

## 1. EC2 — Provision t3.small

### Instance parameters

| Setting | Value |
|---------|-------|
| Instance type | `t3.small` (2 vCPU burst, 2 GiB RAM) |
| AMI | Ubuntu Server 24.04 LTS (Noble), x86_64 |
| Region | `ap-south-1` (Mumbai) |
| Volume | 30 GiB gp3, 3,000 IOPS |
| Key pair | Create new or reuse existing — download the `.pem` file |
| Security group | `zf45-web-sg` (see below) |

### Security group `zf45-web-sg`

Inbound rules:

| Type | Port | Source | Note |
|------|------|--------|------|
| SSH | 22 | `<founder static IP>/32` | Restrict to your home/office IP |
| HTTP | 80 | `0.0.0.0/0, ::/0` | Required for ACME challenge and HTTP→HTTPS redirect |
| HTTPS | 443 | `0.0.0.0/0, ::/0` | Public HTTPS traffic |

Outbound: allow all (required for Resend, GHCR, Let's Encrypt, S3).

### Elastic IP

1. EC2 → **Elastic IPs** → **Allocate Elastic IP address**
2. Associate it with the new EC2 instance
3. Note the EIP — this is the value for the DNS A records in `devops/cloudflare/README.md`

---

## 2. EC2 — Initial server setup

SSH into the instance after launch:

```bash
ssh -i /path/to/key.pem ubuntu@<EC2_EIP>
```

### Install Docker and Docker Compose v2

```bash
# Update package index
sudo apt-get update && sudo apt-get upgrade -y

# Install Docker via the official convenience script
curl -fsSL https://get.docker.com | sudo sh

# Add ubuntu user to docker group (re-login required after this)
sudo usermod -aG docker ubuntu
newgrp docker

# Verify
docker --version
docker compose version
```

### Install AWS CLI (for the backup script)

```bash
sudo apt-get install -y awscli
```

### Configure AWS CLI credentials for S3 backup uploads

```bash
aws configure
# Enter: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, region=ap-south-1, output=json
```

### Clone the repo

```bash
git clone https://github.com/janak-dev2002/zone45-web.git ~/zone45-web
cd ~/zone45-web
```

---

## 3. Initial TLS Bootstrap (Let's Encrypt)

This is a one-time sequence on the first deploy. The nginx container requires
TLS certificates to start; the certificates require nginx to serve the ACME
challenge on port 80. Break the chicken-and-egg as follows:

### Step 1 — Start only nginx on port 80 without TLS

The provided `conf.d/default.conf` serves `/.well-known/acme-challenge/` on port 80.
Start only nginx (and its dependencies) with TLS certs commented out:

```bash
# Temporarily: start only the services needed for the ACME challenge
docker compose -f devops/docker-compose.yml up -d postgres redis api nginx
```

If nginx fails because certs don't exist yet, temporarily create empty cert
directories to allow nginx to start (then obtain real certs):

```bash
sudo mkdir -p /var/lib/docker/volumes/devops_certbot_certs/_data/live/zoneforty5.tech
sudo openssl req -x509 -nodes -newkey rsa:4096 -days 1 \
  -keyout /var/lib/docker/volumes/devops_certbot_certs/_data/live/zoneforty5.tech/privkey.pem \
  -out    /var/lib/docker/volumes/devops_certbot_certs/_data/live/zoneforty5.tech/fullchain.pem \
  -subj '/CN=localhost'
# Also create chain.pem (can be a copy of fullchain.pem for this step)
sudo cp /var/lib/docker/volumes/devops_certbot_certs/_data/live/zoneforty5.tech/fullchain.pem \
        /var/lib/docker/volumes/devops_certbot_certs/_data/live/zoneforty5.tech/chain.pem
```

### Step 2 — Obtain the real certificate

```bash
docker compose -f devops/docker-compose.yml run --rm certbot \
  certbot certonly --webroot \
  -w /var/www/certbot \
  -d zoneforty5.tech \
  -d www.zoneforty5.tech \
  --email <CERTBOT_EMAIL> \
  --agree-tos \
  --no-eff-email \
  --force-renewal
```

### Step 3 — Restart nginx to load the real certs

```bash
docker compose -f devops/docker-compose.yml restart nginx
```

### Step 4 — Start certbot renewal loop

```bash
docker compose -f devops/docker-compose.yml up -d certbot
```

Verify TLS is working:

```bash
curl -I https://zoneforty5.tech/api/health
# Expected: HTTP/2 200
```

---

## 4. S3 Backup Bucket

### Create the bucket

```bash
aws s3api create-bucket \
  --bucket zf45-backups \
  --region ap-south-1 \
  --create-bucket-configuration LocationConstraint=ap-south-1
```

### Block public access

```bash
aws s3api put-public-access-block \
  --bucket zf45-backups \
  --public-access-block-configuration \
    "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

### Lifecycle policy — delete after 30 days

```bash
aws s3api put-bucket-lifecycle-configuration \
  --bucket zf45-backups \
  --lifecycle-configuration '{
    "Rules": [{
      "ID": "delete-after-30-days",
      "Status": "Enabled",
      "Filter": {"Prefix": ""},
      "Expiration": {"Days": 30}
    }]
  }'
```

### IAM user for backup uploads

Create a dedicated IAM user with minimal S3 permissions:

```bash
# Create user
aws iam create-user --user-name zf45-backup-agent

# Attach inline policy — PutObject + ListBucket on zf45-backups only
aws iam put-user-policy \
  --user-name zf45-backup-agent \
  --policy-name zf45-s3-backup-write \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": ["s3:PutObject", "s3:PutObjectAcl"],
        "Resource": "arn:aws:s3:::zf45-backups/*"
      },
      {
        "Effect": "Allow",
        "Action": "s3:ListBucket",
        "Resource": "arn:aws:s3:::zf45-backups"
      }
    ]
  }'

# Create access key
aws iam create-access-key --user-name zf45-backup-agent
```

Copy the `AccessKeyId` and `SecretAccessKey` into the EC2's `.env` file:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`

---

## 5. Nightly Backup Cron (EC2 host)

The backup script runs as a cron job on the EC2 host (not inside a container).
This ensures backups work even if the container stack is down.

### Install the backup script

```bash
sudo cp ~/zone45-web/devops/scripts/backup-postgres.sh /usr/local/bin/backup-postgres
sudo chmod +x /usr/local/bin/backup-postgres
```

### Configure environment variables for the script

```bash
sudo tee /etc/backup-postgres.env > /dev/null <<'EOF'
POSTGRES_CONTAINER=zf45-postgres
POSTGRES_USER=zf45
POSTGRES_DB=zf45
S3_BUCKET=zf45-backups
AWS_ACCESS_KEY_ID=<from IAM user above>
AWS_SECRET_ACCESS_KEY=<from IAM user above>
AWS_DEFAULT_REGION=ap-south-1
EOF
sudo chmod 600 /etc/backup-postgres.env
```

### Add the cron job (runs at 02:00 UTC daily)

```bash
sudo crontab -e
# Add this line:
# 0 2 * * * /usr/local/bin/backup-postgres >> /var/log/backup-postgres.log 2>&1
```

### Test the backup manually

```bash
sudo /usr/local/bin/backup-postgres
# Should complete without errors and upload to s3://zf45-backups/
aws s3 ls s3://zf45-backups/ --recursive
```

---

## 6. GitHub Actions Secrets

These secrets must be set in the GitHub repo before the deploy workflow can run.
GitHub → repo → Settings → Secrets and variables → Actions → New repository secret.

| Secret name | Value | Notes |
|-------------|-------|-------|
| `EC2_HOST` | `<EC2 Elastic IP or hostname>` | Used for SSH |
| `EC2_SSH_USER` | `ubuntu` | Default Ubuntu AMI user |
| `EC2_SSH_KEY` | Contents of the `.pem` private key | Paste the full key including headers |
| `TURNSTILE_SITE_KEY` | Cloudflare Turnstile site key | Baked into frontend build |
| `AWS_ACCESS_KEY_ID` | AWS IAM key (for S3 if needed in CI) | Optional; backup runs on host |
| `AWS_SECRET_ACCESS_KEY` | AWS IAM secret | Optional |

`GITHUB_TOKEN` is provided automatically — no need to add it manually.

---

## Deployment Procedure (subsequent deploys)

After the initial setup, every push to `main` triggers the deploy workflow automatically.

For a manual deploy:
```bash
# On EC2
cd ~/zone45-web
git pull
cp devops/docker-compose.yml docker-compose.yml
export IMAGE_TAG=<commit SHA or 'latest'>
docker compose pull
docker compose up -d --no-build
docker image prune -f
```

---

## Checklist

- [ ] EC2 t3.small provisioned in ap-south-1
- [ ] Security group `zf45-web-sg` configured (SSH restricted to founder IP, 80/443 open)
- [ ] Elastic IP allocated and associated
- [ ] Docker + Docker Compose v2 installed on EC2
- [ ] Repo cloned to ~/zone45-web on EC2
- [ ] `.env` file created from `devops/.env.example` and filled in
- [ ] Initial TLS bootstrap completed (self-signed → Let's Encrypt)
- [ ] S3 bucket `zf45-backups` created with 30-day lifecycle
- [ ] IAM user `zf45-backup-agent` created with minimal S3 write permissions
- [ ] Backup script installed at `/usr/local/bin/backup-postgres`
- [ ] Cron job configured for 02:00 UTC daily backup
- [ ] GitHub Actions secrets set in repo
- [ ] First GitHub Actions deploy triggered and passed
