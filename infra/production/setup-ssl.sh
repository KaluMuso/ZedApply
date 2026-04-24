#!/bin/bash
# ─── Zed CV — First-time SSL Setup for Oracle Cloud ───
# Run this ONCE after pointing your domain DNS to the server IP.
#
# Prerequisites:
#   - Domain DNS A record pointing to this server's public IP
#   - Ports 80 and 443 open in Oracle Cloud security list
#   - Docker and docker-compose installed
#
# Usage:
#   chmod +x setup-ssl.sh
#   ./setup-ssl.sh api.zedcv.com your@email.com

set -e

DOMAIN="${1:?Usage: ./setup-ssl.sh DOMAIN EMAIL}"
EMAIL="${2:?Usage: ./setup-ssl.sh DOMAIN EMAIL}"

echo "=== Zed CV SSL Setup ==="
echo "Domain: $DOMAIN"
echo "Email:  $EMAIL"
echo ""

# Step 1: Start nginx with HTTP only (for ACME challenge)
echo "→ Starting nginx (HTTP only)..."

# Create a temporary nginx config that only serves HTTP for the challenge
cat > /tmp/nginx-init.conf << 'INITEOF'
events { worker_connections 1024; }
http {
    server {
        listen 80;
        location /.well-known/acme-challenge/ {
            root /var/www/certbot;
        }
        location / {
            return 200 'Zed CV is setting up SSL...';
            add_header Content-Type text/plain;
        }
    }
}
INITEOF

docker run -d --name zedcv-nginx-init \
    -p 80:80 \
    -v /tmp/nginx-init.conf:/etc/nginx/nginx.conf:ro \
    -v zedcv_certbot_www:/var/www/certbot \
    nginx:alpine

# Step 2: Request certificate
echo "→ Requesting SSL certificate from Let's Encrypt..."
docker run --rm \
    -v zedcv_certbot_certs:/etc/letsencrypt \
    -v zedcv_certbot_www:/var/www/certbot \
    certbot/certbot certonly \
        --webroot -w /var/www/certbot \
        --email "$EMAIL" \
        --agree-tos \
        --no-eff-email \
        -d "$DOMAIN"

# Step 3: Clean up init container
echo "→ Cleaning up..."
docker stop zedcv-nginx-init && docker rm zedcv-nginx-init

echo ""
echo "✓ SSL certificate obtained for $DOMAIN"
echo "  Now run: docker compose -f docker-compose.prod.yml up -d"
echo ""
