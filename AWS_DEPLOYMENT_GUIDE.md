# XMarket Backend - AWS Deployment Guide

## 📋 Prerequisites

Before deploying to AWS, ensure you have:
- ✅ AWS Account set up
- ✅ GitHub repository created
- ✅ Domain name (optional, but recommended)

## 🎯 AWS Services We'll Use

### Core Services:
1. **AWS EC2** - Host the NestJS backend
2. **AWS RDS (PostgreSQL)** - Managed database
3. **AWS S3** - Static file storage (if needed)
4. **AWS CloudWatch** - Monitoring and logs
5. **GitHub Actions** - CI/CD automation

### Optional Services:
- **AWS LoadBalancer** - For high availability
- **AWS CloudFront** - CDN for better performance
- **AWS Route 53** - DNS management

## 🚀 Step-by-Step Deployment Guide

### Phase 1: Database Setup (AWS RDS)

1. **Create RDS PostgreSQL Instance**:
   ```bash
   # Go to AWS Console > RDS > Create Database
   # Choose PostgreSQL
   # Select "Free tier" for testing or "Production" for live
   # Configure:
   ```
   - **Engine**: PostgreSQL 15+
   - **Instance Class**: db.t3.micro (free tier) or db.t3.small (production)
   - **Storage**: 20 GB (free tier) or more for production
   - **Username**: `admin`
   - **Password**: Strong password (save this!)
   - **Database Name**: `university_marketplace`
   - **VPC**: Default VPC
   - **Security Group**: Create new (we'll configure later)

2. **Configure Security Group**:
   - Edit the RDS security group
   - Add inbound rule:
     - Type: PostgreSQL
     - Port: 5432
     - Source: Your EC2 security group (we'll create this next)

### Phase 2: EC2 Instance Setup

1. **Launch EC2 Instance**:
   ```bash
   # Go to AWS Console > EC2 > Launch Instance
   # Configure:
   ```
   - **AMI**: Ubuntu Server 22.04 LTS
   - **Instance Type**: t2.micro (free tier) or t3.small (production)
   - **Key Pair**: Create new key pair (download the .pem file!)
   - **Security Group**: Create new with these rules:
     - SSH (22) - Your IP
     - HTTP (80) - Anywhere
     - HTTPS (443) - Anywhere
     - Custom TCP (3001) - Anywhere (for API)

2. **Connect to EC2 Instance**:
   ```bash
   # From your local machine:
   chmod 400 your-key-pair.pem
   ssh -i "your-key-pair.pem" ubuntu@your-ec2-public-ip
   ```

3. **Setup EC2 Environment**:
   ```bash
   # Update system
   sudo apt update && sudo apt upgrade -y
   
   # Install Node.js 20
   curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
   sudo apt-get install -y nodejs
   
   # Install PM2 for process management
   sudo npm install -g pm2
   
   # Install Git
   sudo apt install git -y
   
   # Install PostgreSQL client (for testing connection)
   sudo apt install postgresql-client -y
   
   # Install Nginx (for reverse proxy)
   sudo apt install nginx -y
   ```

### Phase 3: Deploy Backend Code

1. **Clone Your Repository**:
   ```bash
   # On EC2 instance
   git clone https://github.com/your-username/your-backend-repo.git
   cd your-backend-repo
   ```

2. **Setup Environment**:
   ```bash
   # Copy production environment file
   cp .env.production .env
   
   # Edit with your actual values
   nano .env
   ```
   Update these values:
   - `DATABASE_HOST` - Your RDS endpoint
   - `DATABASE_PASSWORD` - Your RDS password
   - `JWT_SECRET` - Generate a secure secret
   - `FRONTEND_URL` - Your frontend domain
   - `CLOUDINARY_*` - Your Cloudinary credentials

3. **Install Dependencies and Build**:
   ```bash
   npm ci --only=production
   npm run build
   ```

4. **Start Application with PM2**:
   ```bash
   # Create PM2 ecosystem file
   cat > ecosystem.config.js << 'EOF'
   module.exports = {
     apps: [{
       name: 'xmarket-backend',
       script: 'dist/main.js',
       instances: 1,
       exec_mode: 'cluster',
       env: {
         NODE_ENV: 'production',
         PORT: 3001
       },
       error_file: './logs/err.log',
       out_file: './logs/out.log',
       log_file: './logs/combined.log',
       time: true
     }]
   };
   EOF
   
   # Create logs directory
   mkdir -p logs
   
   # Start application
   pm2 start ecosystem.config.js
   pm2 save
   pm2 startup
   ```

### Phase 4: Setup Nginx Reverse Proxy

1. **Configure Nginx**:
   ```bash
   sudo nano /etc/nginx/sites-available/xmarket-backend
   ```
   
   Add this configuration:
   ```nginx
   server {
       listen 80;
       server_name your-domain.com;  # Replace with your domain or IP
       
       location / {
           proxy_pass http://localhost:3001;
           proxy_http_version 1.1;
           proxy_set_header Upgrade $http_upgrade;
           proxy_set_header Connection 'upgrade';
           proxy_set_header Host $host;
           proxy_set_header X-Real-IP $remote_addr;
           proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
           proxy_set_header X-Forwarded-Proto $scheme;
           proxy_cache_bypass $http_upgrade;
       }
   }
   ```

2. **Enable Nginx Configuration**:
   ```bash
   sudo ln -s /etc/nginx/sites-available/xmarket-backend /etc/nginx/sites-enabled/
   sudo nginx -t
   sudo systemctl restart nginx
   ```

### Phase 5: Setup SSL (Optional but Recommended)

1. **Install Certbot**:
   ```bash
   sudo apt install snapd
   sudo snap install core; sudo snap refresh core
   sudo snap install --classic certbot
   sudo ln -s /snap/bin/certbot /usr/bin/certbot
   ```

2. **Get SSL Certificate**:
   ```bash
   sudo certbot --nginx -d your-domain.com
   ```

### Phase 6: GitHub Actions CI/CD Setup

1. **Create GitHub Secrets**:
   Go to GitHub Repository > Settings > Secrets and variables > Actions
   Add these secrets:
   - `AWS_EC2_HOST` - Your EC2 public IP
   - `AWS_EC2_USER` - ubuntu
   - `AWS_EC2_KEY` - Content of your .pem file
   - `DATABASE_PASSWORD` - Your RDS password
   - `JWT_SECRET` - Your JWT secret

2. **Create GitHub Actions Workflow**:
   Create `.github/workflows/deploy.yml`:
   ```yaml
   name: Deploy to AWS EC2
   
   on:
     push:
       branches: [ main ]
   
   jobs:
     deploy:
       runs-on: ubuntu-latest
       
       steps:
       - uses: actions/checkout@v3
       
       - name: Setup Node.js
         uses: actions/setup-node@v3
         with:
           node-version: '20'
           
       - name: Install dependencies
         run: npm ci
         
       - name: Build application
         run: npm run build
         
       - name: Deploy to EC2
         uses: appleboy/ssh-action@v0.1.5
         with:
           host: ${{ secrets.AWS_EC2_HOST }}
           username: ${{ secrets.AWS_EC2_USER }}
           key: ${{ secrets.AWS_EC2_KEY }}
           script: |
             cd /home/ubuntu/your-backend-repo
             git pull origin main
             npm ci --only=production
             npm run build
             pm2 restart xmarket-backend
   ```

## 🔧 Testing Your Deployment

1. **Test Database Connection**:
   ```bash
   psql -h your-rds-endpoint -U admin -d university_marketplace
   ```

2. **Test API Endpoints**:
   ```bash
   curl http://your-domain.com/api
   curl http://your-domain.com/categories
   ```

3. **Check Application Logs**:
   ```bash
   pm2 logs xmarket-backend
   ```

## 📊 Monitoring and Maintenance

1. **PM2 Monitoring**:
   ```bash
   pm2 status
   pm2 monit
   ```

2. **Nginx Logs**:
   ```bash
   sudo tail -f /var/log/nginx/access.log
   sudo tail -f /var/log/nginx/error.log
   ```

3. **System Resources**:
   ```bash
   htop
   df -h
   free -h
   ```

## 💰 Cost Optimization Tips

1. **Free Tier Resources** (12 months):
   - EC2 t2.micro: 750 hours/month
   - RDS db.t3.micro: 750 hours/month
   - 20GB storage

2. **Production Scaling**:
   - Start small (t3.small)
   - Use CloudWatch to monitor
   - Scale based on actual usage

## 🚨 Security Best Practices

1. **Keep Instance Updated**:
   ```bash
   sudo apt update && sudo apt upgrade -y
   ```

2. **Firewall Setup**:
   ```bash
   sudo ufw enable
   sudo ufw allow ssh
   sudo ufw allow 'Nginx Full'
   ```

3. **Regular Backups**:
   - Enable RDS automated backups
   - Create EC2 snapshots weekly

## 🎯 Next Steps After Deployment

1. **Update Frontend Environment**:
   Update your frontend `.env.production` with your backend URL:
   ```env
   NEXT_PUBLIC_API_BASE_URL=https://your-backend-domain.com
   ```

2. **Test Full Integration**:
   - Test user registration/login
   - Test image uploads
   - Test all API endpoints

3. **Set Up Monitoring**:
   - CloudWatch alarms
   - PM2 monitoring
   - Database performance insights

## 🆘 Troubleshooting

### Common Issues:

1. **Can't connect to database**:
   - Check security group rules
   - Verify RDS endpoint
   - Test with psql

2. **Application not starting**:
   ```bash
   pm2 logs xmarket-backend
   ```

3. **Nginx 502 errors**:
   ```bash
   sudo nginx -t
   sudo systemctl status nginx
   ```

4. **Port issues**:
   ```bash
   sudo netstat -tulpn | grep :3001
   ```

---

## 📞 Support

If you encounter any issues during deployment, check:
1. Application logs: `pm2 logs`
2. Nginx logs: `sudo tail -f /var/log/nginx/error.log`
3. System logs: `sudo journalctl -f`

Your backend will be accessible at:
- **API Documentation**: `https://your-domain.com/api`
- **Health Check**: `https://your-domain.com/categories`

Good luck with your deployment! 🚀
