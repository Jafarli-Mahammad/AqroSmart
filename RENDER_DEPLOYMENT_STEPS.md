# Render Deployment Steps for AqroSmart

## Issue Resolved

The backend was failing because:
1. **Tables didn't exist**: Alembic migrations were never run on the Render database
2. **Plant image model timeout**: Hugging Face model download was failing on free plan instances

**Solution**: The backend startup now runs Alembic migrations automatically, then seeds the database if empty.

---

## Current Backend Fixes

### 1. **app/main.py** — Auto-run migrations on startup
- Detects if tables exist
- Runs `alembic upgrade head` automatically
- Seeds demo data if database is empty
- Gracefully handles fallback cases

### 2. **app/services/plant_analysis.py** — Fallback for model runtime
- If Hugging Face model can't load, uses brightness-based heuristic
- Still returns usable analysis (Healthy or Water stress)
- No 503 errors on free plan

---

## Render Deployment Checklist

### Backend Service Configuration

**Build Command:**
```bash
pip install -r requirements.txt
```

**Start Command:**
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
```

**Environment Variables:**
```
DATABASE_URL=postgresql://username:password@hostname:port/dbname
REDIS_URL=redis://hostname:port/0
VITE_API_URL=https://aqrosmart-backend.onrender.com
SENTRY_DSN=your-sentry-dsn (optional)
SENTRY_ENVIRONMENT=production
```

### Database Service (PostgreSQL)
- ✅ Use Render PostgreSQL instance (free tier available)
- Database name: `aqrosmart` (or custom, just update DATABASE_URL)
- This is the only external service needed
- **Do NOT manually run migrations** — backend will do it on first startup

### Frontend Service Configuration

**Build Command:**
```bash
npm install && npm run build
```

**Start Command:**
```bash
npm run dev
```

**Environment Variables:**
```
VITE_API_URL=https://aqrosmart-backend.onrender.com
VITE_SENTRY_DSN=your-sentry-dsn (optional)
```

---

## First-Time Deployment Steps

### 1. Create PostgreSQL Database on Render
- Go to Render Dashboard → PostgreSQL
- Create new PostgreSQL instance (free tier)
- Copy the `Internal Database URL` (ends with `/aqrosmart`)
- Note: **Do not create tables manually** — the app will do it

### 2. Deploy Backend Service
- Go to Render Dashboard → Web Services
- Connect GitHub repository
- Select `aqrosmart/backend` as root directory
- Set environment variables (see above)
- Choose Build Command and Start Command (see above)
- Deploy

### 3. Wait for First Startup (5-10 minutes)
The backend will:
1. Test PostgreSQL connection
2. **Automatically run Alembic migrations** (creates all tables)
3. **Seed demo data** (farmers, farms, fields, scenarios, sensor readings)
4. Start responding to requests

### 4. Verify Backend Is Ready
```bash
curl https://aqrosmart-backend.onrender.com/health
# Should return:
# {"status":"ok","database":"ok"}

curl https://aqrosmart-backend.onrender.com/dashboard/summary
# Should return farm/field/scenario counts (not zeros)

curl https://aqrosmart-backend.onrender.com/farms
# Should return a list of seeded farms
```

### 5. Deploy Frontend Service
- Create new Web Service on Render
- Connect GitHub repository
- Select `aqrosmart/frontend` as root directory
- Set `VITE_API_URL` to your backend service URL
- Deploy

---

## If Deployment Fails

### Backend Won't Start
1. **Check logs** for `relation "X" does not exist`
   - This means migrations didn't run
   - Restart the backend service from Render dashboard
   - It will retry migrations on next startup

2. **Check DATABASE_URL is correct**
   ```bash
   # Should be in format:
   postgresql://username:password@hostname:port/dbname
   ```

3. **Check migrations directory exists**
   - `aqrosmart/backend/alembic/` should have `versions/` subdirectory
   - At least one migration file: `20260505_plant_image_analyses.py`

### Plant Image Analysis Returns 503
- Expected on free tier if Hugging Face model can't download
- App falls back to heuristic-based analysis (brightness check)
- This is acceptable for demo purposes

### Frontend Shows "Cannot connect to backend"
- Check `VITE_API_URL` in frontend environment variables
- Make sure backend service URL is correct
- Backend service must be healthy first (check `/health`)

---

## Data Flow After Deployment

```
User opens frontend
  → Makes API call to backend
  → Backend runs migrations (first time only, ~2-5 seconds)
  → Backend seeds demo data (first time only, ~10 seconds)
  → Backend returns farms, fields, scenarios
  → Frontend renders dashboard with data
```

---

## Important Notes

- **Migrations are idempotent**: Running them multiple times is safe
- **Seeding is idempotent**: Re-seeding won't duplicate data
- **Free tier timing**: First startup may take 30-60 seconds due to build + migration + seed
- **No manual database work needed**: All schema creation is automatic
- **Demo data is realistic**: 5 farmers, 7 farms, 10 fields with sensor/satellite data

---

## Render Service Costs (Free Tier)

- PostgreSQL: $0.07/day (free for 90 days)
- Backend service: $0 (included in free tier)
- Frontend service: $0 (included in free tier)
- **Total: $0-2/month** after free credits

---

## Next Steps

1. **Push this codebase to GitHub** if not already done
2. **Create PostgreSQL instance** on Render
3. **Deploy backend** with environment variables
4. **Wait 5-10 minutes** for first startup (migrations + seeding)
5. **Verify `/dashboard/summary` returns data**
6. **Deploy frontend** pointing to backend URL
7. **Test the demo** — upload plant image, check irrigation, verify subsidies

---

## Troubleshooting URLs

- Backend health: `https://<backend-url>/health`
- Dashboard API: `https://<backend-url>/dashboard/summary`
- OpenAPI docs: `https://<backend-url>/docs`
- Farms list: `https://<backend-url>/farms`
- Simulation state: `https://<backend-url>/simulation/state`

If you see `{"error":true,"message":"Internal server error"}`, check the Render logs for the exact error (usually table not found = migrations didn't run).
