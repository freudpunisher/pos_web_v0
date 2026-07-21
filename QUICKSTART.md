# SmartPOS Quick Start Guide

**TL;DR - Installation in 5 minutes**

## Prerequisites Check

```bash
docker --version
docker compose version
node --version
npm --version
```

## Quick Installation

### 1️⃣ Clone & Setup
```bash
git clone <repo-url> smart-pos
cd smart-pos
npm install
```

### 2️⃣ Configure Database
```bash
echo 'DATABASE_URL=postgresql://postgres:postgres@localhost:5433/smart_pos' > .env
```

### 3️⃣ Start Services
```bash
sudo docker compose up -d
```

### 4️⃣ Setup Database
```bash
sleep 10
npx drizzle-kit push
npx tsx scripts/seed-admin.ts
```

### 5️⃣ Access Application
```
http://localhost:3000
Email: admin@admin.com
Password: password123
```

---

## Useful Commands

| Command | Purpose |
|---------|---------|
| `sudo docker compose up -d` | Start all services |
| `sudo docker compose down` | Stop all services |
| `sudo docker compose ps` | Check status |
| `sudo docker compose logs -f app` | View app logs |
| `sudo docker compose restart` | Restart services |
| `sudo docker compose exec db psql -U postgres smart_pos` | Access database |

---

## Default Credentials

**Application:**
- Email: `admin@admin.com`
- Password: `password123`

**Database:**
- Host: `localhost:5433`
- User: `postgres`
- Password: `postgres`
- Database: `smart_pos`

---

## File Structure

```
smart-pos-web-application/
├── .env                      ← Database URL & JWT Secret
├── .env.local               ← Local overrides
├── docker-compose.yml       ← Services configuration
├── Dockerfile              ← App container definition
├── drizzle.config.ts       ← Database schema config
├── scripts/
│   └── seed-admin.ts       ← Create admin user
├── app/                    ← Next.js app
├── components/             ← React components
├── lib/                    ← Utilities & database
└── SETUP.md               ← Full installation guide
```

---

## Ports

- **Application:** 3000 (http://localhost:3000)
- **Database:** 5433 (PostgreSQL)

---

## Troubleshooting

**Port in use?**
```bash
sudo lsof -i :3000
sudo kill -9 <PID>
```

**Database error?**
```bash
sudo docker compose logs db
```

**Start fresh?**
```bash
sudo docker compose down -v
sudo docker build -t smart-pos-app:latest . --no-cache
sudo docker compose up -d
```

---

**Need help?** See `SETUP.md` for detailed guide
