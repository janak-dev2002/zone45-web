# Cloudflare — Manual Configuration Steps

All steps below are performed once by the founder in the Cloudflare dashboard.
None of these are automated — they are pre-requisites before the first deploy.

---

## 1. Add the domain to Cloudflare

1. Log in at https://dash.cloudflare.com
2. **Add a Site** → enter `zoneforty5.tech`
3. Select the **Free** plan
4. Cloudflare will scan existing DNS records. Proceed to the next step.
5. **Change nameservers** at your registrar to the two Cloudflare nameservers shown.
6. Wait for nameserver propagation (typically 5–30 minutes). Cloudflare will email you.

---

## 2. DNS Records

After the domain is active in Cloudflare, add or verify these records.

> **Critical:** Set the A records to **DNS Only** (grey cloud, NOT orange cloud).
> Let's Encrypt validates directly against the origin IP. If Cloudflare proxies the
> request, the TLS challenge will fail on a freshly-provisioned server.
> You can enable the orange cloud (proxy) later once certs are issued and tested,
> but it is not required and adds complexity.

### A Records

| Type | Name | Content | Proxy status | TTL |
|------|------|---------|-------------|-----|
| A | `@` | `<EC2 Elastic IP>` | DNS only | Auto |
| A | `www` | `<EC2 Elastic IP>` | DNS only | Auto |

Replace `<EC2 Elastic IP>` with the EIP assigned to the EC2 instance.

### R2 CDN (image uploads)

| Type | Name | Content | Proxy status | TTL |
|------|------|---------|-------------|-----|
| CNAME | `cdn` | `<R2 public bucket hostname>` | Proxied | Auto |

The R2 public hostname is found in: Cloudflare Dashboard → R2 → `zf45-uploads` → Settings → Public Access.
Example format: `pub-<hash>.r2.dev`

### Resend (transactional email DKIM/SPF)

Copy the exact values from the Resend dashboard (Account → Domains → `zoneforty5.tech`):

| Type | Name | Content |
|------|------|---------|
| TXT | `resend._domainkey` | `<DKIM value from Resend>` |
| MX | `@` | `feedback-smtp.us-east-1.amazonses.com` (priority 10) |

### SPF — Combined record (one TXT on apex)

Cloudflare Email Routing and Resend both require SPF entries.
Merge them into a **single** TXT record on `@`:

```
v=spf1 include:_spf.resend.com include:_spf.mx.cloudflare.net ~all
```

If a Cloudflare-managed SPF record already exists, edit it — do not add a second TXT.
Multiple SPF records on the same name cause SPF validation to fail.

### DMARC

| Type | Name | Content |
|------|------|---------|
| TXT | `_dmarc` | `v=DMARC1; p=quarantine; rua=mailto:hello@zoneforty5.tech` |

---

## 3. Cloudflare Email Routing

Sets up free inbound email forwarding: `hello@zoneforty5.tech` → founder Gmail.

1. Cloudflare Dashboard → **Email** → **Email Routing**
2. Enable Email Routing for `zoneforty5.tech`
3. Cloudflare will add its MX records automatically:
   ```
   route1.mx.cloudflare.net  priority 10
   route2.mx.cloudflare.net  priority 30
   route3.mx.cloudflare.net  priority 90
   ```
4. Add a routing rule:
   - **From:** `hello@zoneforty5.tech`
   - **To:** founder's Gmail address
5. Cloudflare sends a verification email to the Gmail address. Click the link.
6. Verify the setup: send a test email to `hello@zoneforty5.tech`.

---

## 4. Cloudflare Turnstile (bot protection — Q3)

Used on the contact form and admin login form.

1. Cloudflare Dashboard → **Turnstile**
2. **Add widget**
   - Name: `ZoneForty5 Website`
   - Domains: `zoneforty5.tech`
   - Widget type: **Managed** (recommended; invisible by default, challenges on suspicion)
3. Copy the **Site Key** (public) and **Secret Key** (private):
   - Site key → `TURNSTILE_SITE_KEY` in `.env` and `VITE_TURNSTILE_SITE_KEY` in the
     GitHub Actions secret (baked into the frontend build)
   - Secret key → `TURNSTILE_SECRET` in `.env` (server-side verification only)

> The same widget covers both `/api/contact` and `/api/auth/login` — Turnstile is
> domain-scoped, not path-scoped, so one widget is sufficient.

---

## 5. Cloudflare R2 (image uploads — Q5)

1. Cloudflare Dashboard → **R2**
2. **Create bucket** → name: `zf45-uploads`, region: automatic
3. **Public access:**
   - Bucket Settings → Public Access → **Allow Access**
   - This makes objects accessible at `<bucket>.r2.dev`
4. **Custom domain:**
   - Bucket Settings → Custom Domains → **Connect Domain**
   - Enter: `cdn.zoneforty5.tech`
   - Cloudflare adds the CNAME automatically (the record in §2 above is the result)
5. **CORS policy** (required for browser-initiated pre-signed PUT uploads):
   - Bucket Settings → CORS policy → Add rule:
   ```json
   [
     {
       "AllowedOrigins": ["https://zoneforty5.tech"],
       "AllowedMethods": ["PUT", "GET"],
       "AllowedHeaders": ["*"],
       "MaxAgeSeconds": 3600
     }
   ]
   ```
6. **API credentials:**
   - R2 → Manage API Tokens → **Create API Token**
   - Permissions: `Object Read & Write` on bucket `zf45-uploads`
   - Copy **Access Key ID** → `R2_ACCESS_KEY_ID` in `.env`
   - Copy **Secret Access Key** → `R2_SECRET_ACCESS_KEY` in `.env`
   - Copy **Account ID** (top-right of the R2 page) → `R2_ACCOUNT_ID` in `.env`
   - S3 endpoint: `https://<ACCOUNT_ID>.r2.cloudflarestorage.com` → `R2_ENDPOINT` in `.env`

---

## 6. Verify the full email flow

After all DNS records propagate (allow 24 hours for DKIM):

```bash
# SPF check
dig TXT zoneforty5.tech +short

# DKIM check
dig TXT resend._domainkey.zoneforty5.tech +short

# DMARC check
dig TXT _dmarc.zoneforty5.tech +short
```

Send a test email via the Resend dashboard (Domains → Send test email) and confirm
delivery to the founder's Gmail.

---

## Checklist

- [ ] Domain added to Cloudflare, nameservers switched
- [ ] A records for apex and www pointing to EC2 EIP (DNS only)
- [ ] CNAME for cdn.zoneforty5.tech pointing to R2 bucket (proxied)
- [ ] SPF TXT record (merged Resend + Cloudflare Email Routing)
- [ ] DKIM TXT record from Resend
- [ ] DMARC TXT record
- [ ] Cloudflare Email Routing enabled, rule `hello@` → founder Gmail, destination verified
- [ ] Turnstile widget created, site key + secret copied to .env and GitHub Secrets
- [ ] R2 bucket created, public access enabled, custom domain cdn.zoneforty5.tech bound
- [ ] R2 CORS policy set for https://zoneforty5.tech
- [ ] R2 API token created, credentials copied to .env
