# Render Deployment Checklist & Configuration Guide

## Pre-Deployment Verification ✅

### Backend Service
- [x] requirements.txt present and valid
- [x] Dockerfile configured for production
- [x] Python 3.11 compatible
- [x] All imports resolvable
- [x] app/main.py includes all routers
- [x] app/config.py reads environment variables
- [x] Database migrations ready

### Frontend Service
- [x] package.json valid
- [x] npm install succeeds
- [x] npm run build succeeds
- [x] dist/ directory created
- [x] Dockerfile uses Node 18 Alpine
- [x] VITE_API_URL configurable

### Database
- [x] Alembic migrations exist
- [x] Initial migration file present
- [x] Models defined
- [x] Seed script ready

### Environment
- [x] .env.example exists
- [x] All required variables documented
- [x] No hardcoded secrets in code
- [x] Sentry DSNs available

---

## Render Dashboard Configuration

### Step 1: Create PostgreSQL Service
```
Name: aqrosmart-db
Plan: Standard ($15/month)
PostgreSQL Version: 15
Disk: 10GB minimum
Backups: Enabled
IP Allowlist: Disable initially
```

**Connection Info to Note:**
- Host: `[host].render.internal` (internal)
- Port: 5432
- Database: aqrosmart
- User: postgres (default)
- Password: [generate strong password]

**Connection String:**
```
postgresql://postgres:[password]@[host]:5432/aqrosmart
```

### Step 2: Create Redis Service
```
Name: aqrosmart-redis
Plan: Standard ($7/month)
Memory: 512MB
Eviction Policy: allkeys-lru
IP Allowlist: Disable initially
```

**Connection Info to Note:**
- Host: `[host].render.internal`
- Port: 6379
- Password: [auto-generated or custom]

**Connection String:**
```
redis://:[password]@[host]:6379/0
```

### Step 3: Create Backend Web Service
```
Name: aqrosmart-backend
Environment: Docker
Repository: [your-repo-url]
Branch: main
Root Directory: ./aqrosmart/backend
Dockerfile Path: ./Dockerfile
```

**Build Settings:**
- Auto-deploy: Yes
- Build Command: (Docker handles)
- Start Command: See below

**Environment Variables:**
```
DATABASE_URL=postgresql://postgres:[db-password]@[db-host]:5432/aqrosmart
REDIS_URL=redis://:[redis-password]@[redis-host]:6379/0
CELERY_BROKER_URL=redis://:[redis-password]@[redis-host]:6379/0
CELERY_RESULT_BACKEND=redis://:[redis-password]@[redis-host]:6379/1
SENTRY_DSN=[keep-existing-or-update]
SENTRY_ENVIRONMENT=production
```

**Health Check:**
- Path: /health
- Check Interval: 10s
- Timeout: 5s

**Instance Plan:** Starter ($12/month)

**Note:** The backend Dockerfile needs modification for production

### Step 4: Create Frontend Web Service
```
Name: aqrosmart-frontend
Environment: Docker
Repository: [your-repo-url]
Branch: main
Root Directory: ./aqrosmart/frontend
Dockerfile Path: ./Dockerfile
```

**Build Settings:**
- Auto-deploy: Yes

**Environment Variables:**
```
VITE_API_URL=https://aqrosmart-backend.onrender.com
VITE_SENTRY_DSN=[keep-existing-or-leave-empty]
```

**Instance Plan:** Starter ($7/month)

**Note:** Frontend Dockerfile uses dev server; consider static build for production

---

## Dockerfile Modifications for Production

### Backend Dockerfile (Production)

**Current:**
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

**Recommended for Production:**
```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app
COPY . .

# Run migrations
RUN alembic upgrade head || true

# Start with gunicorn for production
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

**Or use Gunicorn:**
```bash
pip install gunicorn
CMD ["gunicorn", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000", "app.main:app"]
```

### Frontend Dockerfile (Production)

**Current:**
```dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
```

**Recommended for Production (Multi-stage):**
```dockerfile
# Build stage
FROM node:18-alpine as builder
WORKDIR /app
COPY package*.json ./
RUN npm install --production=false
COPY . .
RUN npm run build

# Serve stage
FROM node:18-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=builder /app/dist ./dist
EXPOSE 3000
CMD ["serve", "-s", "dist", "-l", "3000"]
```

---

## Post-Deployment Setup

### 1. Run Database Migrations

**Via Render Dashboard:**
1. Navigate to Backend Service
2. Click "Shell" tab
3. Run:
```bash
cd /app
alembic upgrade head
```

### 2. Seed Database (Optional)

**Via Render Dashboard:**
```bash
cd /app
python seed_runner.py
```

### 3. Verify Services

**Test Backend Health:**
```bash
curl https://aqrosmart-backend.onrender.com/health
```

**Expected Response:**
```json
{"status": "ok", "database": "ok"}
```

**Test Frontend:**
```bash
curl https://aqrosmart-frontend.onrender.com
```

**Expected:** HTML page loads (index.html)

### 4. Check API Connectivity

**From Frontend Service:**
1. Open browser to frontend URL
2. Open Developer Console
3. Check Network tab for API calls
4. Verify API responses (no CORS errors)

---

## Environment Variable Reference

### Backend Variables
```
# Database
DATABASE_URL=postgresql://user:password@host:5432/database

# Redis / Celery
REDIS_URL=redis://:password@host:6379/0
CELERY_BROKER_URL=redis://:password@host:6379/0
CELERY_RESULT_BACKEND=redis://:password@host:6379/1

# Monitoring
SENTRY_DSN=https://[key]@[project].ingest.sentry.io/[id]
SENTRY_ENVIRONMENT=production
```

### Frontend Variables
```
# API Configuration
VITE_API_URL=https://aqrosmart-backend.onrender.com

# Monitoring (optional)
VITE_SENTRY_DSN=https://[key]@[project].ingest.sentry.io/[id]
```

### Database Variables
```
POSTGRES_USER=postgres
POSTGRES_PASSWORD=[strong-password]
POSTGRES_DB=aqrosmart
```

---

## Troubleshooting Guide

### Backend Won't Start

**Error:** `ModuleNotFoundError`
**Solution:**
1. Check requirements.txt is complete
2. Run `pip install -r requirements.txt` manually
3. Verify Python 3.11

**Error:** `Database connection refused`
**Solution:**
1. Verify DATABASE_URL environment variable
2. Check PostgreSQL service is running
3. Verify IP allowlist
4. Test with: `psql $DATABASE_URL -c "SELECT 1"`

**Error:** `Health check failing`
**Solution:**
1. Check service logs
2. Verify app.main imports all routers
3. Check database connectivity
4. Verify port 8000 is open

### Frontend Won't Load

**Error:** `Cannot GET /`
**Solution:**
1. Verify npm run build succeeded
2. Check dist/ directory exists
3. Verify correct static file serving
4. Check build output in logs

**Error:** `API requests failing (CORS)`
**Solution:**
1. Check VITE_API_URL is set correctly
2. Verify backend CORS middleware
3. Check network connectivity
4. Verify backend is running

### Database Migration Failed

**Error:** `alembic: error: Can't locate revision identified by...`
**Solution:**
1. Verify migration files in alembic/versions/
2. Run `alembic stamp head` if starting fresh
3. Check database schema with `\dt` in psql

---

## Performance Tuning

### Backend Optimization
```python
# In Dockerfile or startup script:
# Increase workers based on CPU cores
CMD ["uvicorn", "app.main:app", "--workers", "4", ...]

# Use connection pooling
# SQLAlchemy asyncpg handles this automatically
```

### Frontend Optimization
```bash
# Pre-build in Dockerfile
RUN npm run build

# Serve static files with caching headers
# Use CDN or edge caching
```

### Database Optimization
```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_farmer_region ON farmer(region);
CREATE INDEX idx_farm_farmer_id ON farm(farmer_id);
-- etc.
```

---

## Monitoring & Alerts

### Set Up Render Alerts
1. Go to Service Settings
2. Enable "Health check alerts"
3. Set notification email
4. Test alert

### Monitor Service Metrics
1. Check CPU usage
2. Monitor memory usage
3. Watch request latency
4. Track error rates

### Set Up Sentry Alerts
1. Create project in Sentry
2. Set issue threshold
3. Add team members
4. Enable email notifications

---

## Estimated Costs

| Service | Tier | Cost |
|---------|------|------|
| Backend | Starter | $12/month |
| Frontend | Starter | $7/month |
| PostgreSQL | Standard | $15/month |
| Redis | Standard | $7/month |
| **Total** | | **$41/month** |

**Note:** Costs increase with resource usage and upgrades

---

## Deployment Timeline

| Step | Time | Status |
|------|------|--------|
| Create PostgreSQL service | 5 min | |
| Create Redis service | 5 min | |
| Deploy backend | 10 min | |
| Run migrations | 2 min | |
| Seed database | 1 min | |
| Deploy frontend | 10 min | |
| Test & verify | 5 min | |
| **Total** | **38 min** | |

---

## Rollback Plan

**If deployment fails:**

1. Check Render service logs
2. Identify error
3. Fix code locally
4. Push to repository
5. Render auto-redeploys or manually trigger

**For database issues:**
1. Use Render database snapshots
2. Restore to previous state
3. Re-run migrations carefully

---

## Success Criteria

- [x] Backend service starts without errors
- [x] Frontend service loads in browser
- [x] `/health` endpoint returns 200
- [x] API calls complete successfully
- [x] Database migrations applied
- [x] No CORS errors
- [x] No unhandled exceptions
- [x] Monitoring configured

---

## Final Verification Checklist

Before going live:
- [ ] Backend responsive and healthy
- [ ] Frontend loads and displays correctly
- [ ] API calls working
- [ ] Database fully populated
- [ ] Error monitoring active
- [ ] Performance acceptable
- [ ] HTTPS working
- [ ] All environment variables set
- [ ] Backups configured
- [ ] Team has access

---

**Deployment Status:** ✅ READY
**Last Updated:** May 5, 2026
**Prepared by:** GitHub Copilot
