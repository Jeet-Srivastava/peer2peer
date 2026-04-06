# Deployment Guide

This guide explains how to deploy the peer2peer application to an AWS EC2 instance.

## Prerequisites
- An active AWS Account.
- An EC2 Instance (t2.micro is sufficient for testing) running Ubuntu 22.04 LTS.
- GitHub repository with GitHub Actions enabled.

## 1. Local/Initial Setup
1. Clone the repository.
2. Ensure you have Node.js and MongoDB installed locally for testing.
3. Use the idempotent script `scripts/setup.sh` to initialize your `.env` files.

## 2. Server Preparation (EC2)
1. **SSH into your instance:**
   ```bash
   ssh -i your-key.pem ubuntu@your-ec2-ip
   ```
2. **Install Node.js & NPM:**
   ```bash
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   ```
3. **Install MongoDB:** (Or use MongoDB Atlas)
   ```bash
   sudo apt-get install -y mongodb
   ```
4. **Install PM2 (Process Manager):**
   ```bash
   sudo npm install -g pm2
   ```
5. **Clone the repository:**
   ```bash
   git clone https://github.com/Jeet-Srivastava/peer2peer.git
   ```

## 3. GitHub Actions Integration
To utilize the automated deployment pipeline included in `.github/workflows/deploy.yml`, you must configure the following **GitHub Secrets** in your repository:

- `EC2_HOST`: The Public IP address of your EC2 instance.
- `EC2_USER`: The SSH username (usually `ubuntu`).
- `EC2_SSH_KEY`: The contents of your private `.pem` key used to access the instance.

## 4. Execution Flow
Once configured, every `git push` to the `main` branch will trigger the workflow:
1. GitHub Actions establishes an SSH connection.
2. It executes `git pull origin main`.
3. It runs `scripts/deploy.sh`, an idempotent script that installs dependencies, builds the frontend, and restarts the backend via PM2 seamlessly.
