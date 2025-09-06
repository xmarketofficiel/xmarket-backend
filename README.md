# XMarket Backend - Production Ready

A production-optimized NestJS backend for the University Marketplace application.

## 🚀 Quick Deploy to AWS

### Prerequisites
- AWS Account
- Domain name (optional)
- GitHub repository

### Deploy in 3 Steps:

1. **Run the deployment script**:
   ```bash
   ./deploy.sh
   ```

2. **Follow the AWS setup guide**:
   ```bash
   # Read the complete guide
   cat AWS_DEPLOYMENT_GUIDE.md
   ```

3. **Push to GitHub main branch**:
   ```bash
   git add .
   git commit -m "Production deployment ready"
   git push origin main
   ```

## 📦 What's Included

### Production Optimizations:
- ✅ Production Dockerfile
- ✅ PM2 process management
- ✅ GitHub Actions CI/CD
- ✅ Nginx configuration
- ✅ SSL setup guide
- ✅ Environment management
- ✅ Security hardening

### Removed Development Files:
- ❌ Documentation (Ghost folder)
- ❌ Test files
- ❌ Development configurations
- ❌ SQL scripts
- ❌ Build tools configs

## 🏗️ Architecture

```
AWS Infrastructure:
├── EC2 Instance (Ubuntu 22.04)
│   ├── Node.js 20
│   ├── PM2 Process Manager
│   └── Nginx Reverse Proxy
├── RDS PostgreSQL Database
├── CloudWatch Monitoring
└── GitHub Actions CI/CD
```

## 🔧 Local Development

```bash
# Install dependencies
npm install

# Start development server
npm run start:dev

# Build for production
npm run build

# Start production server
npm run start:prod
```

## 🌐 API Documentation

Once deployed, access Swagger documentation at:
```
https://your-domain.com/api
```

## 📊 Monitoring

- **Application**: `pm2 monit`
- **Logs**: `pm2 logs xmarket-backend`
- **System**: AWS CloudWatch

## 🔒 Security Features

- JWT authentication
- CORS protection
- Rate limiting
- Input validation
- SQL injection prevention
- XSS protection

## 🚀 Scaling Options

1. **Horizontal**: Multiple EC2 instances + Load Balancer
2. **Vertical**: Larger EC2 instance types
3. **Database**: RDS scaling + read replicas
4. **CDN**: CloudFront for static assets

## 💰 Cost Estimate

**Free Tier (12 months)**:
- EC2 t2.micro: $0
- RDS db.t3.micro: $0
- Total: ~$0/month

**Production Ready**:
- EC2 t3.small: ~$15/month
- RDS db.t3.small: ~$25/month
- Total: ~$40/month

## 📞 Support

For deployment issues:
1. Check `pm2 logs xmarket-backend`
2. Verify nginx: `sudo nginx -t`
3. Test database: `psql -h your-rds-endpoint -U admin -d university_marketplace`

---

## Environment Variables

Copy `.env.example` to `.env` and update with your values:

```bash
cp .env.example .env
nano .env
```

Required variables:
- `DATABASE_HOST` - Your RDS endpoint
- `DATABASE_PASSWORD` - Strong password
- `JWT_SECRET` - 32+ character secret
- `CLOUDINARY_*` - Image storage credentials
- `SMTP_*` - Email service credentials

---

Ready for production! 🎉
