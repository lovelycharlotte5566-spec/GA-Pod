# Quick Start: Setup Turso Database for Vercel

## Step 1: Create Turso Account & Database

1. Go to https://turso.tech/
2. Sign up (free account)
3. Click "Create Database"
4. Name it: `ga-pod`
5. Choose a region close to you

## Step 2: Get Your Credentials

1. In Turso dashboard, click on your database
2. Go to "Connect" tab
3. Copy:
   - **Database URL** (looks like: `libsql://ga-pod-username.turso.io`)
   - **Auth Token** (click "Create Token" if needed)

## Step 3: Add to Vercel

1. Go to https://vercel.com/dashboard
2. Select your `ga-pod` project
3. Go to **Settings** → **Environment Variables**
4. Add these two variables:

   **Variable 1:**
   - Name: `TURSO_DATABASE_URL`
   - Value: (paste your Database URL)
   - Environment: Production, Preview, Development (check all)

   **Variable 2:**
   - Name: `TURSO_AUTH_TOKEN`
   - Value: (paste your Auth Token)
   - Environment: Production, Preview, Development (check all)

5. Click **Save**

## Step 4: Redeploy

1. In Vercel dashboard, go to **Deployments**
2. Click the **3 dots** (⋯) on your latest deployment
3. Click **Redeploy**
4. Wait for deployment to complete

## Step 5: Connect TablePlus

1. Open TablePlus
2. Click **Create a new connection**
3. Select **LibSQL** (or search for "Turso")
4. Enter:
   - **Host**: (from your Database URL, e.g., `ga-pod-username.turso.io`)
   - **Token**: (your Auth Token)
5. Click **Connect**

You should now see your tables: `messages`, `likes`, `comments`

## Step 6: Test Your App

1. Visit: https://ga-pod.vercel.app/
2. Post a message
3. Check TablePlus - you should see the data!

---

## Troubleshooting

**"Database connection failed"**
- Double-check environment variables in Vercel
- Make sure you redeployed after adding variables

**"Tables don't exist"**
- Tables are created automatically on first API call
- Or manually run the SQL from `setup-database.js` in TablePlus

**"CORS errors"**
- Already handled in the code
- If issues persist, check Vercel function logs

---

## Alternative: Use Turso CLI

If you prefer command line:

```bash
# Install Turso CLI
# Windows PowerShell:
iwr https://get.turso.tech/install.ps1 -useb | iex

# Create database
turso db create ga-pod

# Get URL
turso db show ga-pod

# Create token
turso db tokens create ga-pod
```

Then add the credentials to Vercel as described above.
