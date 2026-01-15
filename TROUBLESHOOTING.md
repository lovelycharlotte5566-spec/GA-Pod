# Troubleshooting Guide for Vercel Deployment

## 🔍 Step 1: Test API Connection

Visit: `https://ga-pod.vercel.app/api/test`

You should see:
```json
{
  "status": "OK",
  "message": "API is working!",
  "database": "Connected",
  "messageCount": 0,
  "env": {
    "hasTursoUrl": true,
    "hasTursoToken": true
  }
}
```

**If you see an error:**
- Check Vercel environment variables are set
- Check Vercel function logs (Dashboard → Functions → View Logs)

## 🔍 Step 2: Check Environment Variables

In Vercel Dashboard:
1. Go to **Settings** → **Environment Variables**
2. Verify these are set:
   - `TURSO_DATABASE_URL` (should start with `libsql://`)
   - `TURSO_AUTH_TOKEN` (should be a long string)
3. Make sure they're enabled for **Production**, **Preview**, and **Development**

## 🔍 Step 3: Check Browser Console

1. Open your site: `https://ga-pod.vercel.app/`
2. Press **F12** to open Developer Tools
3. Go to **Console** tab
4. Look for:
   - `🔄 Fetching messages with filter: all`
   - `📡 Calling API: /api/messages`
   - `✅ Received messages: [...]`

**If you see errors:**
- Copy the error message
- Check the Network tab to see if API calls are failing

## 🔍 Step 4: Check Vercel Function Logs

1. Go to Vercel Dashboard
2. Click on your project
3. Go to **Functions** tab
4. Click on a function (e.g., `api/messages`)
5. View the logs

**Look for:**
- `📥 Messages API called: GET /api/messages`
- `✅ Database connected`
- `✅ Found X messages`

**If you see errors:**
- Check the error message
- Verify database credentials
- Check if tables exist

## 🔍 Step 5: Verify Database Connection

1. Open TablePlus
2. Connect to your Turso database
3. Check if tables exist:
   - `messages`
   - `likes`
   - `comments`

**If tables don't exist:**
- They should auto-create on first API call
- Check Vercel function logs for initialization errors

## 🔍 Step 6: Test Posting

1. Open browser console (F12)
2. Try posting a message
3. Watch console for:
   - `📝 Posting message...`
   - `✅ Message posted successfully`
   - `🔄 Reloading messages...`

**If posting fails:**
- Check the error in console
- Check Vercel function logs
- Verify POST endpoint is working

## 🐛 Common Issues

### Issue: "Turso credentials not found"
**Solution:** Set `TURSO_DATABASE_URL` and `TURSO_AUTH_TOKEN` in Vercel environment variables

### Issue: "API error: 404"
**Solution:** Check `vercel.json` routing configuration

### Issue: "API error: 500"
**Solution:** Check Vercel function logs for database connection errors

### Issue: Messages not showing
**Solution:** 
1. Check browser console for API errors
2. Verify API is returning data (check Network tab)
3. Check if messages are in database (TablePlus)

### Issue: Posts not saving
**Solution:**
1. Check browser console for POST errors
2. Check Vercel function logs
3. Verify database connection
4. Check if INSERT query is executing

## 📊 Debug Checklist

- [ ] Environment variables set in Vercel
- [ ] `/api/test` endpoint returns OK
- [ ] Browser console shows API calls
- [ ] Vercel function logs show database connection
- [ ] Tables exist in database
- [ ] Can see messages in TablePlus
- [ ] POST request succeeds (check Network tab)
- [ ] GET request returns messages (check Network tab)

## 🆘 Still Not Working?

1. **Check Vercel Function Logs** - Most errors will be here
2. **Check Browser Console** - Frontend errors
3. **Check Network Tab** - API call status codes
4. **Verify Database** - Can you connect with TablePlus?
5. **Test API Directly** - Use Postman or curl to test endpoints

## 📝 Quick Test Commands

Test GET messages:
```bash
curl https://ga-pod.vercel.app/api/messages
```

Test POST message:
```bash
curl -X POST https://ga-pod.vercel.app/api/messages \
  -H "Content-Type: application/json" \
  -d '{"text":"Test message","author":"Test","category":"Other"}'
```

Test API health:
```bash
curl https://ga-pod.vercel.app/api/test
```
