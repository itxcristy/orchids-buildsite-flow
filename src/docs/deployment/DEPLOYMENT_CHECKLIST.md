# ✅ BuildFlow Deployment Checklist for Hostinger KVM

Use this checklist to ensure a smooth deployment with zero issues.

## 📋 Pre-Deployment

- [ ] Server has at least 4GB RAM, 20GB disk space
- [ ] Ubuntu 20.04+ or Debian 11+ installed
- [ ] Root/SSH access to server
- [ ] Domain name configured (optional but recommended)

## 🔧 Server Setup

- [ ] System updated (`apt update && apt upgrade -y`)
- [ ] Docker installed and running
- [ ] Docker Compose installed
- [ ] Firewall configured (ports 22, 80, 443, 3000)
- [ ] Project files uploaded/cloned to `/opt/buildflow`

## ⚙️ Configuration

- [ ] `.env.hostinger` file created from `.env.hostinger.example`
- [ ] `POSTGRES_PASSWORD` set (16+ characters, strong password)
- [ ] `REDIS_PASSWORD` set (16+ characters, strong password)
- [ ] `VITE_JWT_SECRET` generated and set (32+ characters)
  - Generate with: `openssl rand -base64 32`
- [ ] `VITE_API_URL` updated with actual server IP/domain
- [ ] `CORS_ORIGINS` updated with actual domains/IPs
- [ ] Email configuration set (SMTP or other provider)
- [ ] All placeholder values replaced (no `YOUR_SERVER_IP` or `CHANGE_THIS`)

## 🚀 Deployment

- [ ] Deployment script made executable (`chmod +x scripts/deploy-hostinger.sh`)
- [ ] Deployment script run successfully (`./scripts/deploy-hostinger.sh`)
- [ ] All services started without errors
- [ ] No error messages in deployment output

## ✅ Verification

- [ ] All services show as "Up" and "healthy"
  - Check: `docker compose -f docker-compose.hostinger.yml ps`
- [ ] PostgreSQL responding
  - Check: `docker compose -f docker-compose.hostinger.yml exec postgres pg_isready -U postgres`
- [ ] Redis responding
  - Check: `docker compose -f docker-compose.hostinger.yml exec redis redis-cli ping`
- [ ] Backend API health check passes
  - Check: `curl http://localhost:3000/api/health`
- [ ] Frontend accessible
  - Check: `curl http://localhost/health` or open in browser
- [ ] No errors in logs
  - Check: `docker compose -f docker-compose.hostinger.yml logs`

## 🌐 Domain & SSL (Optional)

- [ ] Nginx installed and configured
- [ ] Domain DNS records pointing to server IP
- [ ] SSL certificate obtained (Let's Encrypt)
- [ ] HTTPS working for frontend
- [ ] HTTPS working for API
- [ ] Environment variables updated with HTTPS URLs
- [ ] Services restarted after environment changes

## 🔐 Security

- [ ] All default passwords changed
- [ ] Strong JWT secret generated (32+ chars)
- [ ] Firewall enabled and configured
- [ ] Database port not exposed publicly (only internal)
- [ ] Redis port not exposed publicly (only internal)
- [ ] SSL certificate installed (if using domain)
- [ ] CORS origins properly configured
- [ ] Email service configured and tested

## 📊 Monitoring

- [ ] Health check script works (`./scripts/check-health.sh`)
- [ ] Logs accessible and readable
- [ ] Disk space sufficient (>5GB free)
- [ ] Memory usage acceptable
- [ ] CPU usage normal

## 🧪 Testing

- [ ] Frontend loads in browser
- [ ] Can access login page
- [ ] API endpoints respond correctly
- [ ] Database queries work
- [ ] File uploads work (if applicable)
- [ ] Email sending works (test email sent)

## 📝 Documentation

- [ ] Deployment guide reviewed
- [ ] Environment variables documented
- [ ] Backup schedule configured
- [ ] Team members have access (if applicable)

## 🎉 Post-Deployment

- [ ] Application accessible from internet
- [ ] All features working as expected
- [ ] Performance acceptable
- [ ] No critical errors in logs
- [ ] Backup system tested

---

## 🆘 If Issues Occur

1. **Check logs:** `docker compose -f docker-compose.hostinger.yml logs -f`
2. **Run health check:** `./scripts/check-health.sh`
3. **Verify environment:** `cat .env.hostinger | grep -v PASSWORD`
4. **Check service status:** `docker compose -f docker-compose.hostinger.yml ps`
5. **Review troubleshooting section** in `HOSTINGER_DEPLOYMENT.md`

---

**✅ All items checked? Your deployment is complete and ready for production!**

