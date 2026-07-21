# SmartPOS Installation Guide

Complete step-by-step guide to install and run SmartPOS on a new PC.

## Prerequisites

Make sure your PC has the following tools installed:
- **Docker** - [Install Docker](https://docs.docker.com/get-docker/)
- **Docker Compose** - Included with Docker Desktop
- **Node.js** (v18+) - [Install Node.js](https://nodejs.org/)
- **Git** - [Install Git](https://git-scm.com/)

Verify installations:
```bash
docker --version
docker compose version
node --version
npm --version
git --version
```

## Installation Steps

### 1. Clone the Repository

```bash
cd /path/to/your/workspace
git clone <your-repository-url> smart-pos-web-application
cd smart-pos-web-application
```

### 2. Install Node Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the project root:

```bash
cat > .env << 'EOF'
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/smart_pos
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
EOF
```

Or create `.env.local`:

```bash
cat > .env.local << 'EOF'
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/smart_pos
EOF
```

### 4. Start PostgreSQL Database

Start only the database container first:

```bash
sudo docker compose up -d db
```

Wait for the database to be ready (check with healthcheck):

```bash
sudo docker compose ps
```

The `db` service should show status "Up ... (healthy)"

### 5. Run Database Migrations

```bash
npm run db:push
```

Or using drizzle-kit directly:

```bash
npx drizzle-kit push
```

### 6. Seed Admin User

Create the default admin user in the database:

```bash
npx tsx scripts/seed-admin.ts
```

**Admin credentials:**
- Email: `admin@admin.com`
- Password: `password123`

### 7. Build Docker Image

Build the production Docker image:

```bash
sudo docker build -t smart-pos-app:latest .
```

### 8. Start All Services

Start the complete application stack:

```bash
sudo docker compose up -d
```

This will start both the PostgreSQL database and the Next.js application.

### 9. Verify Installation

Check that both containers are running:

```bash
sudo docker compose ps
```

You should see:
- `smart-pos-web-application-db-1` - Status: "Up (healthy)"
- `smart-pos-web-application-app-1` - Status: "Up (healthy)"

View application logs:

```bash
sudo docker compose logs -f app
```

## Accessing the Application

Once everything is running:

- **Application URL:** http://localhost:3000
- **PostgreSQL:** localhost:5433
  - User: `postgres`
  - Password: `postgres`
  - Database: `smart_pos`

### Login Credentials

Default admin account:
- **Email:** admin@admin.com
- **Password:** password123

## Common Commands

### Start All Services

```bash
sudo docker compose up -d
```

### Stop All Services

```bash
sudo docker compose down
```

### View Logs

**All services:**
```bash
sudo docker compose logs -f
```

**Just the app:**
```bash
sudo docker compose logs -f app
```

**Just the database:**
```bash
sudo docker compose logs -f db
```

### Restart Services

**All services:**
```bash
sudo docker compose restart
```

**Just the app:**
```bash
sudo docker compose restart app
```

**Just the database:**
```bash
sudo docker compose restart db
```

### Rebuild Image

If you make code changes:

```bash
sudo docker build -t smart-pos-app:latest .
sudo docker compose up -d app
```

### View Running Containers

```bash
sudo docker compose ps
```

### Execute Commands in Container

**Access app shell:**
```bash
sudo docker compose exec app sh
```

**Access database:**
```bash
sudo docker compose exec db psql -U postgres -d smart_pos
```

## Database Management

### Create Additional Admin Users

Edit and run the seed script:

```bash
npx tsx scripts/seed-admin.ts
```

### Database Backup

```bash
sudo docker compose exec db pg_dump -U postgres smart_pos > backup.sql
```

### Database Restore

```bash
sudo docker compose exec db psql -U postgres smart_pos < backup.sql
```

## Environment Variables

### Available Configuration

- `DATABASE_URL` - PostgreSQL connection string
- `JWT_SECRET` - Secret key for JWT tokens
- `NODE_ENV` - Environment (development/production)
- `NEXT_TELEMETRY_DISABLED` - Disable Next.js telemetry

## Troubleshooting

### Port Already in Use

If port 3000 or 5433 is already in use:

**Option 1: Change the port in docker-compose.yml**

Edit `docker-compose.yml`:

```yaml
app:
  ports:
    - "3001:3000"  # Change 3000 to any free port

db:
  ports:
    - "5434:5432"  # Change 5433 to any free port
```

**Option 2: Stop the process using the port**

```bash
# Find what's using port 3000
sudo lsof -i :3000
# Kill it
sudo kill -9 <PID>
```

### Database Connection Error

**Check if database is running:**
```bash
sudo docker compose logs db
```

**Wait for database to be ready:**
```bash
sleep 10
```

**Reconnect the app:**
```bash
sudo docker compose restart app
```

### Container Won't Start

**View full error logs:**
```bash
sudo docker compose logs app
```

**Rebuild image:**
```bash
sudo docker build -t smart-pos-app:latest . --no-cache
sudo docker compose up -d app
```

### Clear Everything and Start Fresh

```bash
# Stop all containers
sudo docker compose down -v

# Remove volumes to reset database
sudo docker volume rm smart-pos-web-application_postgres_data

# Rebuild image
sudo docker build -t smart-pos-app:latest . --no-cache

# Start fresh
sudo docker compose up -d
```

## Auto-Start on System Boot

Docker containers are configured with `restart: always`, so they will automatically start when the system reboots.

To verify:
```bash
sudo docker compose ps
```

## Production Considerations

For production deployment:

1. **Change default credentials**
   - Update admin password in seed script
   - Change JWT_SECRET

2. **Use environment-specific files**
   - Create `.env.production` for production settings

3. **Database backups**
   - Schedule regular PostgreSQL backups

4. **Monitor logs**
   - Set up log aggregation

5. **SSL/HTTPS**
   - Configure reverse proxy (nginx)

## Getting Help

If you encounter issues:

1. Check logs: `sudo docker compose logs -f`
2. Verify containers: `sudo docker compose ps`
3. Ensure Docker daemon is running: `sudo systemctl status docker`
4. Check port availability: `sudo lsof -i :3000`

## Next Steps

After installation:

1. Login with admin credentials
2. Create additional users in Settings > Users
3. Set up product categories
4. Configure store settings
5. Start managing your POS!

---

**Installation Time:** ~10-15 minutes
**Storage Required:** ~2GB for Docker images and database
