# Vercel Deployment Guide

## ✅ What's Been Fixed

1. **Restructured API for Vercel** - Created individual serverless functions for each endpoint
2. **Added logging** - Console logs to help debug API calls
3. **Fixed frontend** - Enhanced error handling and automatic API URL detection
4. **Database setup** - Tables auto-create on first use

## 📁 New File Structure

```
api/
├── messages.js                    # GET/POST/DELETE /api/messages
├── messages/
│   └── [messageId]/
│       ├── likes.js               # GET/POST /api/messages/:id/likes
│       ├── likes/
│       │   ├── check.js           # GET /api/messages/:id/likes/check
│       │   └── toggle.js          # POST /api/messages/:id/likes/toggle
│       └── comments/
│           ├── comments.js         # GET/POST /api/messages/:id/comments
│           └── count.js           # GET /api/messages/:id/comments/count
├── cleanup.js                     # POST /api/cleanup
├── db.js                          # Database connection router
└── db-turso.js                    # Turso implementation
```

## 🚀 Deployment Steps

1. **Push to GitHub:**
   ```bash
   git add .
   git commit -m "Add Vercel serverless API structure"
   git push
   ```

2. **Set Environment Variables in Vercel:**
   - Go to Vercel Dashboard → Your Project → Settings → Environment Variables
   - Add:
     - `TURSO_DATABASE_URL` = (your Turso database URL)
     - `TURSO_AUTH_TOKEN` = (your Turso auth token)
   - Select: Production, Preview, Development

3. **Redeploy:**
   - Vercel will auto-deploy on push, or
   - Manually redeploy from dashboard

## 🔍 Testing

1. Open browser console (F12)
2. Visit: https://ga-pod.vercel.app/
3. Check console for API logs:
   - Should see: "API Call: /api/messages GET"
   - Should see: "Received messages: [...]"

4. Post a message and check:
   - Console should show API calls
   - Message should appear in feed
   - Check TablePlus to verify data saved

## 🐛 Troubleshooting

**Messages not showing:**
- Check browser console for errors
- Check Vercel function logs (Dashboard → Functions)
- Verify environment variables are set
- Verify database connection in TablePlus

**API errors:**
- Check Vercel function logs
- Verify Turso credentials
- Check CORS headers (already handled)

**Database connection:**
- Verify TURSO_DATABASE_URL and TURSO_AUTH_TOKEN are set
- Test connection in TablePlus first
- Check Vercel function logs for connection errors

## 📊 Verify It's Working

1. **Post a message** → Should save to database
2. **Refresh page** → Should load from database
3. **Open in incognito/another browser** → Should see all messages
4. **Check TablePlus** → Should see data in `messages` table

The public feed now fetches from the database, so everyone sees all messages!
