# Vercel Deployment with Database Setup

## Option 1: Turso (SQLite Cloud) - Recommended ⭐

Turso is a SQLite-compatible cloud database that works perfectly with Vercel and TablePlus.

### Setup Steps:

1. **Create a Turso account:**
   - Go to https://turso.tech/
   - Sign up for free
   - Create a new database

2. **Get your database credentials:**
   - In Turso dashboard, copy:
     - Database URL (looks like: `libsql://your-db-name.turso.io`)
     - Auth Token

3. **Set environment variables in Vercel:**
   - Go to your Vercel project dashboard
   - Settings → Environment Variables
   - Add these variables:
     ```
     TURSO_DATABASE_URL = libsql://your-db-name.turso.io
     TURSO_AUTH_TOKEN = your-auth-token-here
     ```

4. **Connect TablePlus to Turso:**
   - Open TablePlus
   - Create new connection → "LibSQL" or "Turso"
   - Enter your Database URL and Auth Token
   - Connect!

5. **Deploy to Vercel:**
   ```bash
   vercel --prod
   ```

---

## Option 2: Supabase (PostgreSQL)

If you prefer PostgreSQL:

1. **Create Supabase account:**
   - Go to https://supabase.com/
   - Create a new project

2. **Get connection string:**
   - Project Settings → Database
   - Copy the connection string

3. **Set environment variable in Vercel:**
   ```
   DATABASE_URL = postgresql://user:password@host:port/database
   ```

4. **Update package.json:**
   Add: `"pg": "^8.11.3"`

5. **Create `api/db-postgres.js`** (I can create this if needed)

---

## Option 3: PlanetScale (MySQL)

For MySQL:

1. **Create PlanetScale account:**
   - Go to https://planetscale.com/
   - Create a new database

2. **Get connection string:**
   - Copy the connection string from dashboard

3. **Set environment variable:**
   ```
   DATABASE_URL = mysql://user:password@host:port/database
   ```

4. **Update package.json:**
   Add: `"mysql2": "^3.6.5"`

---

## Quick Setup (Turso - Recommended)

### 1. Install Turso CLI (optional but helpful):
```bash
# Windows (PowerShell)
iwr https://get.turso.tech/install.ps1 -useb | iex

# Or download from: https://docs.turso.tech/cli/installation
```

### 2. Create database:
```bash
turso db create ga-pod
```

### 3. Get credentials:
```bash
turso db show ga-pod
turso db tokens create ga-pod
```

### 4. Add to Vercel Environment Variables:
- `TURSO_DATABASE_URL` = (from step 2)
- `TURSO_AUTH_TOKEN` = (from step 3)

### 5. Initialize database tables:
The tables will be created automatically on first API call, or you can run:
```bash
# Using Turso CLI
turso db shell ga-pod < setup-tables.sql
```

---

## Files Structure for Vercel:

```
ga-pod/
├── api/
│   ├── index.js          # Main API handler
│   ├── db.js             # Database connection router
│   └── db-turso.js       # Turso implementation
├── index.html
├── style.css
├── script-api.js
├── vercel.json           # Vercel configuration
└── package.json
```

---

## Testing Locally with Vercel:

1. Install Vercel CLI:
   ```bash
   npm i -g vercel
   ```

2. Run locally:
   ```bash
   vercel dev
   ```

3. Set environment variables:
   ```bash
   vercel env add TURSO_DATABASE_URL
   vercel env add TURSO_AUTH_TOKEN
   ```

---

## Troubleshooting:

- **"Database connection failed"**: Check environment variables in Vercel
- **"Tables don't exist"**: Tables auto-create on first API call
- **"CORS errors"**: Already handled in the API code
- **"Function timeout"**: Vercel free tier has 10s timeout (upgrade for longer)

---

## Recommended: Turso

✅ SQLite-compatible (works with TablePlus)
✅ Free tier available
✅ Fast and reliable
✅ Easy setup
✅ Works perfectly with Vercel
