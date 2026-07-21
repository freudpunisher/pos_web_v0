# SmartPOS Installation Checklist

Use this checklist when installing on a new PC.

---

## 🔧 Phase 1: Prerequisites & Setup

- [ ] **Install Docker Desktop**
  - Download: https://www.docker.com/products/docker-desktop
  - Verify: `docker --version`
  - Note: Docker Compose is included

- [ ] **Install Node.js (v18+)**
  - Download: https://nodejs.org/
  - Verify: `node --version`
  - Note: npm is included with Node.js

- [ ] **Install Git**
  - Download: https://git-scm.com/
  - Verify: `git --version`

- [ ] **Verify All Tools Installed**
  ```bash
  docker --version
  docker compose version
  node --version
  npm --version
  git --version
  ```
  All should return version numbers ✓

---

## 📥 Phase 2: Get the Code

- [ ] **Clone Repository**
  ```bash
  git clone <repository-url> smart-pos-web-application
  cd smart-pos-web-application
  ```

- [ ] **Verify Project Structure**
  - [ ] Check `package.json` exists
  - [ ] Check `docker-compose.yml` exists
  - [ ] Check `Dockerfile` exists
  - [ ] Check `drizzle.config.ts` exists

- [ ] **Install Dependencies**
  ```bash
  npm install
  ```
  - [ ] Wait for completion (3-5 minutes)
  - [ ] Check for errors in output

---

## ⚙️ Phase 3: Environment Configuration

- [ ] **Create .env File**
  ```bash
  cat > .env << 'EOF'
  DATABASE_URL=postgresql://postgres:postgres@localhost:5433/smart_pos
  JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
  EOF
  ```

- [ ] **Verify .env File**
  - [ ] `.env` file exists in project root
  - [ ] Contains `DATABASE_URL`
  - [ ] Contains `JWT_SECRET`

- [ ] **Create .env.local (Optional)**
  ```bash
  cat > .env.local << 'EOF'
  DATABASE_URL=postgresql://postgres:postgres@localhost:5433/smart_pos
  EOF
  ```

---

## 🐳 Phase 4: Database Setup

- [ ] **Start PostgreSQL Container**
  ```bash
  sudo docker compose up -d db
  ```

- [ ] **Wait for Database Ready**
  ```bash
  sleep 5
  sudo docker compose ps
  ```
  - [ ] Database container shows "Up ... (healthy)"
  - [ ] Port 5433 is mapped correctly

- [ ] **Verify Database Connection**
  ```bash
  sudo docker compose logs db | tail -20
  ```
  - [ ] Look for "database system is ready to accept connections"

---

## 🗄️ Phase 5: Database Migrations

- [ ] **Push Schema to Database**
  ```bash
  npx drizzle-kit push
  ```
  - [ ] Wait for "Changes applied"
  - [ ] Check for any SQL errors

- [ ] **Verify Tables Created**
  ```bash
  sudo docker compose exec db psql -U postgres -d smart_pos -c "\dt"
  ```
  - [ ] Should see table list

---

## 👤 Phase 6: Admin User Creation

- [ ] **Run Seed Script**
  ```bash
  npx tsx scripts/seed-admin.ts
  ```

- [ ] **Verify Admin Created**
  - [ ] See "✓ Admin user ready"
  - [ ] Email: `admin@admin.com`
  - [ ] Password: `password123`

- [ ] **Alternative: Check Database**
  ```bash
  sudo docker compose exec db psql -U postgres -d smart_pos -c "SELECT email, role FROM users;"
  ```
  - [ ] Should show admin@admin.com with role 'admin'

---

## 🏗️ Phase 7: Docker Image Build

- [ ] **Build Production Image**
  ```bash
  sudo docker build -t smart-pos-app:latest .
  ```

- [ ] **Verify Build Successful**
  - [ ] No error messages
  - [ ] Last line shows image hash
  - [ ] Image shows "FINISHED"

- [ ] **Check Image**
  ```bash
  sudo docker images | grep smart-pos-app
  ```
  - [ ] `smart-pos-app` should be listed

---

## ▶️ Phase 8: Start Application

- [ ] **Start All Services**
  ```bash
  sudo docker compose up -d
  ```

- [ ] **Verify Containers Running**
  ```bash
  sudo docker compose ps
  ```
  - [ ] `app` container: "Up (healthy)"
  - [ ] `db` container: "Up (healthy)"

- [ ] **Check Application Logs**
  ```bash
  sudo docker compose logs app | tail -20
  ```
  - [ ] Look for "✓ Ready in XXXms"
  - [ ] No error messages about database

---

## ✅ Phase 9: Verification & Testing

- [ ] **Verify Port 3000 Open**
  ```bash
  curl http://localhost:3000
  ```
  - [ ] Should return HTML content

- [ ] **Access Web Interface**
  - [ ] Open browser
  - [ ] Navigate to http://localhost:3000
  - [ ] SmartPOS login page should load

- [ ] **Test Login**
  - [ ] Email: `admin@admin.com`
  - [ ] Password: `password123`
  - [ ] Should redirect to dashboard
  - [ ] Dashboard should load without errors

- [ ] **Quick Functionality Check**
  - [ ] Navigate to Settings
  - [ ] Check Users tab
  - [ ] Check admin user is listed
  - [ ] Check other pages load

---

## 📊 Phase 10: Post-Installation

- [ ] **Document Access Details**
  ```
  Application URL: http://localhost:3000
  Admin Email: admin@admin.com
  Admin Password: password123
  
  Database URL: postgresql://postgres:postgres@localhost:5433/smart_pos
  Database User: postgres
  Database Password: postgres
  ```

- [ ] **Test Container Persistence**
  - [ ] Run: `sudo docker compose restart`
  - [ ] App should still be accessible at http://localhost:3000
  - [ ] Should not need to re-seed database

- [ ] **Set Auto-Start (Optional)**
  - [ ] Enable Docker auto-start in system settings
  - [ ] Containers will auto-start on system reboot
  - [ ] Verify: `sudo docker compose ps`

- [ ] **Create Backup Procedure**
  - [ ] Document database backup command
  - [ ] Test backup: `sudo docker compose exec db pg_dump -U postgres smart_pos > backup.sql`
  - [ ] Verify backup file created

---

## 🆘 Phase 11: Troubleshooting Checklist

**If something fails:**

- [ ] **Check Docker is Running**
  ```bash
  sudo systemctl status docker
  ```

- [ ] **Check All Containers**
  ```bash
  sudo docker compose ps
  ```

- [ ] **View Error Logs**
  ```bash
  sudo docker compose logs
  ```

- [ ] **Restart Everything**
  ```bash
  sudo docker compose down
  sleep 5
  sudo docker compose up -d
  ```

- [ ] **Port Conflicts**
  ```bash
  sudo lsof -i :3000
  sudo lsof -i :5433
  ```

- [ ] **Fresh Start (Last Resort)**
  ```bash
  sudo docker compose down -v
  sudo docker build -t smart-pos-app:latest . --no-cache
  sudo docker compose up -d
  npx drizzle-kit push
  npx tsx scripts/seed-admin.ts
  ```

---

## 📋 Quick Reference

### Essential Commands
```bash
# Start
sudo docker compose up -d

# Stop
sudo docker compose down

# Logs
sudo docker compose logs -f app

# Restart
sudo docker compose restart

# Status
sudo docker compose ps
```

### Access Points
- **App:** http://localhost:3000
- **Database:** localhost:5433
- **Admin User:** admin@admin.com / password123

### Files to Keep Safe
- `.env` - Contains database connection
- Database backups (`backup.sql`)
- User-created data in PostgreSQL

---

## ✨ Success Criteria

You're done when:

- [ ] Docker containers are running (`sudo docker compose ps`)
- [ ] Application loads at http://localhost:3000
- [ ] Login works with admin credentials
- [ ] Dashboard displays without errors
- [ ] No errors in logs (`sudo docker compose logs`)
- [ ] All containers show "healthy" status

---

## 🎉 Final Notes

**Installation Time:** 15-20 minutes on a fresh PC

**System Requirements:**
- CPU: 2+ cores
- RAM: 4GB+ (8GB recommended)
- Storage: 3GB+ free
- Internet: For initial image downloads

**Next Steps After Installation:**
1. Change admin password
2. Create additional users
3. Set up product categories
4. Configure store settings
5. Start using the POS system!

---

**✅ Installation Completed Successfully!**

Print this checklist for reference during installation.
