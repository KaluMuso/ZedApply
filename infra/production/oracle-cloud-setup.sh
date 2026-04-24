#!/bin/bash
# ─── Oracle Cloud Free Tier — Server Bootstrapping ───
# Run this on a fresh Oracle Cloud ARM instance (Ampere A1, 4 OCPU / 24GB RAM).
#
# Usage:
#   ssh ubuntu@YOUR_SERVER_IP
#   curl -sSL https://raw.githubusercontent.com/YOUR_REPO/main/infra/production/oracle-cloud-setup.sh | bash
#
# Or copy this file to the server and run: chmod +x oracle-cloud-setup.sh && ./oracle-cloud-setup.sh

set -e
echo "=== Zed CV — Oracle Cloud Server Setup ==="

# ── 1. System updates ──
echo "→ Updating system packages..."
sudo apt-get update && sudo apt-get upgrade -y

# ── 2. Install Docker ──
echo "→ Installing Docker..."
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER

# ── 3. Install Docker Compose v2 ──
echo "→ Installing Docker Compose..."
sudo apt-get install -y docker-compose-plugin

# ── 4. Open firewall ports ──
echo "→ Opening firewall ports (80, 443, 5678)..."
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 80 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 443 -j ACCEPT
sudo iptables -I INPUT 6 -m state --state NEW -p tcp --dport 5678 -j ACCEPT
sudo netfilter-persistent save

# ── 5. Create swap (Oracle free tier can be tight on memory) ──
echo "→ Creating 2GB swap file..."
if [ ! -f /swapfile ]; then
    sudo fallocate -l 2G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
fi

# ── 6. Create app directory ──
echo "→ Setting up app directory..."
mkdir -p ~/zedcv
cd ~/zedcv

echo ""
echo "✓ Server is ready!"
echo ""
echo "Next steps:"
echo "  1. Log out and back in (for docker group to take effect)"
echo "  2. Clone your repo:  git clone https://github.com/YOUR_USER/zed-cv.git ~/zedcv"
echo "  3. Create .env:      cp apps/backend/.env.production.example apps/backend/.env"
echo "  4. Fill in secrets:   nano apps/backend/.env"
echo "  5. Set up SSL:        cd infra/production && ./setup-ssl.sh api.zedcv.com you@email.com"
echo "  6. Launch:            docker compose -f docker-compose.prod.yml up -d --build"
echo ""
