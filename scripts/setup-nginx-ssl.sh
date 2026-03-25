#!/bin/bash

echo "========================================="
echo "Setup Nginx + SSL for VPS"
echo "========================================="
echo ""

DOMAIN="api.catholicpilgrimage.id.vn"
EMAIL="noreply@catholicpilgrimage.id.vn"

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
  echo "Please run as root (use sudo)"
  exit 1
fi

echo "Step 1: Installing Nginx..."
apt update
apt install -y nginx

echo ""
echo "Step 2: Configuring Nginx reverse proxy..."
cat > /etc/nginx/sites-available/api <<EOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
        
        # WebSocket support
        proxy_read_timeout 86400;
    }
}
EOF

# Enable site
ln -sf /etc/nginx/sites-available/api /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test nginx config
nginx -t

echo ""
echo "Step 3: Starting Nginx..."
systemctl restart nginx
systemctl enable nginx

echo ""
echo "Step 4: Installing Certbot for SSL..."
apt install -y certbot python3-certbot-nginx

echo ""
echo "Step 5: Obtaining SSL certificate..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos -m $EMAIL --redirect

echo ""
echo "Step 6: Setting up auto-renewal..."
systemctl enable certbot.timer
systemctl start certbot.timer

echo ""
echo "========================================="
echo "Setup completed successfully"
echo "========================================="
echo ""
echo "Your API is now available at:"
echo "https://$DOMAIN"
echo ""
echo "SSL certificate will auto-renew every 60 days"
echo ""
