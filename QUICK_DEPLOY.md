# Quick Deployment Steps

## 🚀 Fastest Way to Deploy (15 minutes)

### Step 1: Push to GitHub
```bash
git init
git add .
git commit -m "Ready for deployment"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO.git
git push -u origin main
```

### Step 2: Deploy Backend (Render) - 5 min

1. Go to https://render.com → Sign up (free)
2. Click "New +" → "Web Service"
3. Connect GitHub → Select your repo
4. Settings:
   - **Name**: `ledger-backend`
   - **Root Directory**: `server` (IMPORTANT!)
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
5. Click "Create Web Service"
6. Wait for deployment → Copy the URL (e.g., `https://ledger-backend.onrender.com`)

### Step 3: Deploy Frontend (Vercel) - 5 min

1. Go to https://vercel.com → Sign up (free)
2. Click "Add New..." → "Project"
3. Import your GitHub repo
4. Settings:
   - **Framework Preset**: Vite
   - **Root Directory**: `client` (IMPORTANT!)
   - **Build Command**: `npm run build` (auto-detected)
   - **Output Directory**: `dist` (auto-detected)
5. **Environment Variables**:
   - Click "Environment Variables"
   - Add: `VITE_API_URL` = `https://ledger-backend.onrender.com` (your Render URL)
6. Click "Deploy"
7. Wait 2-3 minutes → Your app is live! 🎉

### Step 4: Test Your Deployment

1. Visit your Vercel URL
2. Try logging in as admin:
   - Username: `Admin`
   - Password: `admin@kitty3948`
3. Test player login with any registered user

---

## ⚠️ Important Notes

### Render Free Tier
- **Spins down** after 15 min of inactivity
- **First request** after spin-down takes ~30 seconds
- This is normal and free!

### CORS
- Backend CORS is already configured to allow all origins
- Should work out of the box

### Database
- SQLite database persists on Render
- Data is saved between deployments
- If you need to reset, use "Flush Database" in admin panel

---

## 🔧 Troubleshooting

### Backend not responding?
- Check Render logs: Dashboard → Your Service → Logs
- Verify `Root Directory` is set to `server`
- Check that `package.json` has `"start": "node index.js"`

### Frontend can't connect to backend?
- Verify `VITE_API_URL` is set in Vercel
- Check that the URL doesn't have a trailing slash
- Check browser console for CORS errors

### Build fails?
- Check that all dependencies are in `package.json`
- Verify Node version (Render uses Node 18+ by default)

---

## 📝 Next Steps

1. **Custom Domain** (optional, free on Vercel):
   - Vercel Dashboard → Settings → Domains
   - Add your domain

2. **Auto-deploy** (already enabled):
   - Every git push automatically deploys
   - No manual deployment needed!

3. **Monitor**:
   - Vercel: View analytics and performance
   - Render: Monitor uptime and logs

---

## 🎯 Alternative: Deploy Both on Render

If you prefer one platform:

1. Deploy backend as **Web Service** (same as above)
2. Deploy frontend as **Static Site**:
   - Build: `cd client && npm install && npm run build`
   - Publish: `client/dist`
   - Add env var: `VITE_API_URL` = your backend URL

---

## 💡 Pro Tips

1. **Keep backend awake**: Use a service like UptimeRobot (free) to ping your backend every 5 minutes
2. **Database backup**: Export your SQLite file periodically from Render
3. **Environment variables**: Store sensitive data in Render/Vercel env vars, not in code

---

## ✅ Checklist

- [ ] Code pushed to GitHub
- [ ] Backend deployed on Render
- [ ] Backend URL copied
- [ ] Frontend deployed on Vercel
- [ ] `VITE_API_URL` environment variable set in Vercel
- [ ] Tested admin login
- [ ] Tested player login
- [ ] Everything works! 🎉

---

## 📋 Summary

Your app is now live at:
- **Frontend**: `https://your-project.vercel.app`
- **Backend**: `https://ledger-backend.onrender.com`

**Admin Login:**
- Username: `Admin`
- Password: `admin@kitty3948`

**Player Login:**
- Username: Any registered user name
- Password: First word of username + "123" (e.g., "Saab Chachaji" → "Saab123")

---

**Need help?** Check the full guide in `DEPLOYMENT.md`

