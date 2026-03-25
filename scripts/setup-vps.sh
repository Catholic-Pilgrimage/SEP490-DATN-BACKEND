#!/bin/bash

# VPS Initial Setup Script
echo "Setting up VPS for deployment..."

# Update system
echo "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Install Docker
if ! command -v docker &> /dev/null; then
    echo "Installing Docker..."
    curl -fsSL https://get.docker.com -o get-docker.sh
    sudo sh get-docker.sh
    sudo usermod -aG docker $USER
    rm get-docker.sh
else
    echo "Docker already installed"
fi

# Install Docker Compose
if ! command -v docker-compose &> /dev/null; then
    echo "Installing Docker Compose..."
    sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
    sudo chmod +x /usr/local/bin/docker-compose
else
    echo "Docker Compose already installed"
fi

# Setup swap (important for 6GB RAM VPS)
if [ ! -f /swapfile ]; then
    echo "Setting up 4GB swap..."
    sudo fallocate -l 4G /swapfile
    sudo chmod 600 /swapfile
    sudo mkswap /swapfile
    sudo swapon /swapfile
    echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
else
    echo "Swap already configured"
fi

# Install useful tools
echo "Installing monitoring tools..."
sudo apt install -y htop curl git

# Setup firewall (optional but recommended)
echo "Configuring firewall..."
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP
sudo ufw allow 443/tcp   # HTTPS
sudo ufw allow 3000/tcp  # App port (adjust if needed)
sudo ufw --force enable

echo "VPS setup complete!"
echo "WARNING: You may need to logout and login again for Docker permissions to take effect"
echo "Next steps:"
echo "   1. Upload your project files to VPS"
echo "   2. Configure .env file"
echo "   3. Run ./deploy.sh to start the application"
