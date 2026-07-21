# 🚀 SmartPOS Installation - Step-by-Step Visual Guide

## 📋 Prerequisites (5 minutes)

Install these tools on the new PC:

```
┌─────────────────────────────────────────┐
│ Required Tools                          │
├─────────────────────────────────────────┤
│ ✓ Docker Desktop (includes Compose)    │
│ ✓ Node.js v18+ (includes npm)          │
│ ✓ Git                                  │
└─────────────────────────────────────────┘
```

**Verify:**
```bash
docker --version      # Docker xx.xx.x
docker compose version # Docker Compose vx.xx.x
node --version        # vxx.xx.x
npm --version         # xx.xx.x
git --version         # git version xx.xx.x
```

---

## 📥 Step 1: Get the Code (2 minutes)

```bash
# Clone repository
git clone https://github.com/yourusername/smart-pos-web-application.git
cd smart-pos-web-application

# Install dependencies
npm install
```

```
project/
├── package.json
├── docker-compose.yml
├── Dockerfile
├── .env
└── ... (other files)
```

---

## ⚙️ Step 2: Configure Environment (1 minute)

Create `.env` file:

```bash
cat > .env << 'EOF'
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/smart_pos
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
EOF
```

**File content:**
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/smart_pos
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
```

---

## 🐳 Step 3: Start Database (3 minutes)

```bash
# Start PostgreSQL container
sudo docker compose up -d db

# Wait for database to be ready
sudo docker compose ps
```

**Expected output:**
```
NAME                      STATUS
smart-pos-web-app...-db-1  Up 1 min (healthy)
```

---

## 🗄️ Step 4: Setup Database Schema (2 minutes)

```bash
# Run migrations
npx drizzle-kit push
```

**Expected output:**
```
[✓] Changes applied
```

---

## 👤 Step 5: Create Admin User (1 minute)

```bash
# Seed admin user
npx tsx scripts/seed-admin.ts
```

**Expected output:**
```
✓ Admin user ready:
  Email: admin@admin.com
  Password: password123
  ID: 2f83e92d-b719-4c15-919f-e2ff7640f1c4
```

---

## 🏗️ Step 6: Build Docker Image (2 minutes)

```bash
# Build production image
sudo docker build -t smart-pos-app:latest .
```

**Expected output:**
```
[+] Building ... FINISHED
=> naming to docker.io/library/smart-pos-app:latest
```

---

## ▶️ Step 7: Start Application (1 minute)

```bash
# Start all services
sudo docker compose up -d
```

**Expected output:**
```
✔ Container ... Started
✔ Container ... Started
```

---

## ✅ Step 8: Verify Installation (1 minute)

```bash
# Check all containers running
sudo docker compose ps
```

**Expected output:**
```
NAME                      IMAGE                  STATUS
smart-pos-app-1          smart-pos-app:latest   Up (healthy)
smart-pos-db-1           postgres:16-alpine     Up (healthy)
```

```bash
# Check application logs
sudo docker compose logs app | tail -10
```

**Expected output:**
```
✓ Ready in 482ms
```

---

## 🌐 Step 9: Access Application (Done! 🎉)

Open browser and go to:

```
http://localhost:3000
```

### Login with:
- **Email:** admin@admin.com
- **Password:** password123

---

## 📊 Architecture Overview

```
Your PC
│
├─── Docker Container 1 (Port 3000)
│    └─── SmartPOS Application (Next.js)
│
└─── Docker Container 2 (Port 5433)
     └─── PostgreSQL Database
          └─── smart_pos database
               ├── users (admin user created)
               ├── products
               ├── transactions
               └── ... (other tables)
```

---

## 🎯 Daily Operations

### Start Application
```bash
cd smart-pos-web-application
sudo docker compose up -d
# App available at http://localhost:3000
```

### Stop Application
```bash
sudo docker compose down
```

### View Logs
```bash
sudo docker compose logs -f app
```

### Restart
```bash
sudo docker compose restart
```

---

## 🆘 Troubleshooting

### Problem: Port 3000 Already in Use
```bash
# Find what's using it
sudo lsof -i :3000

# Kill it
sudo kill -9 <PID>

# Or change port in docker-compose.yml
```

### Problem: Database Connection Error
```bash
# Check database logs
sudo docker compose logs db

# Restart database
sudo docker compose restart db
```

### Problem: Containers Won't Start
```bash
# Check full logs
sudo docker compose logs

# Start fresh
sudo docker compose down -v
sudo docker compose up -d
```

---

## 📝 Summary

| Step | Command | Time |
|------|---------|------|
| 1 | Clone repo | 2 min |
| 2 | Configure .env | 1 min |
| 3 | Start database | 3 min |
| 4 | Run migrations | 2 min |
| 5 | Seed admin | 1 min |
| 6 | Build image | 2 min |
| 7 | Start app | 1 min |
| 8 | Verify | 1 min |
| **Total** | | **~15 min** |

---

## 📚 Documentation Files

- **SETUP.md** - Detailed installation guide with troubleshooting
- **QUICKSTART.md** - Quick reference card
- **DOCKER.md** - Docker-specific information
- **README.md** - Project overview

---

## 🔒 Security Notes

⚠️ **Before Production:**
1. Change `JWT_SECRET` in `.env`
2. Change default admin password
3. Use strong database password
4. Enable SSL/HTTPS
5. Set up regular backups

---

## 🎉 You're All Set!

Your SmartPOS application is now running and ready to use!

- **App:** http://localhost:3000
- **Admin Email:** admin@admin.com
- **Admin Password:** password123

Next steps:
1. Login to the application
2. Create additional users
3. Set up product categories
4. Start managing your POS!

---

**Questions?** Check the SETUP.md file for detailed documentation
