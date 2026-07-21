# Docker Setup for Smart POS Web Application

## Building and Running with Docker

### Using Docker Compose (Recommended)

The easiest way to run the application with all dependencies:

```bash
# Build and start the application
docker-compose up -d

# View logs
docker-compose logs -f app

# Stop the application
docker-compose down

# Stop and remove all volumes (useful for reset)
docker-compose down -v
```

The application will be available at `http://localhost:3000`

### Building Docker Image Manually

```bash
# Build the image
docker build -t smart-pos:latest .

# Run the container
docker run -p 3000:3000 \
  -e NODE_ENV=production \
  --name smart-pos-app \
  smart-pos:latest
```

### Environment Variables

Create a `.env.local` file in the project root with your database connection and other environment variables:

```env
# Database Configuration
DATABASE_URL=postgresql://user:password@db:5432/smart_pos

# Other configuration as needed
```

### Health Check

The Docker setup includes a health check that verifies the application is running every 30 seconds.

```bash
# Check container health
docker ps --format "table {{.Names}}\t{{.Status}}"
```

### Production Deployment

For production deployment:

1. Build the image with a version tag:
```bash
docker build -t smart-pos:1.0.0 .
```

2. Push to your container registry:
```bash
docker tag smart-pos:1.0.0 your-registry/smart-pos:1.0.0
docker push your-registry/smart-pos:1.0.0
```

3. Deploy using your preferred orchestration tool (Kubernetes, Docker Swarm, etc.)

### Image Size Optimization

This multi-stage Dockerfile optimizes the final image size by:
- Using Alpine Linux (lightweight base image)
- Separating build dependencies from production dependencies
- Only copying necessary files to the production image

### Troubleshooting

#### Container exits immediately
- Check logs: `docker-compose logs app`
- Ensure environment variables are set correctly

#### Port already in use
- Change the port mapping in `docker-compose.yml`
- Or stop other services: `docker-compose down`

#### Database connection issues
- Verify the DATABASE_URL in your `.env.local`
- Ensure the database service is running: `docker-compose logs db`
- Wait for database to be ready (health check ensures this)
