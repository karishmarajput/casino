# Free Deployment Guide

This guide will help you deploy your application for free using:
- **Frontend**: Vercel (React/Vite)
- **Backend**: Render (Node.js/Express)

## Prerequisites

1. GitHub account (free)
2. Vercel account (free)
3. Render account (free)

---

## Step 1: Prepare Your Code

### 1.1 Update Server to Use Environment Variables

The server is already configured to use `process.env.PORT` (see `server/index.js`).

### 1.2 Update Frontend API URL

The frontend needs to know your backend URL. We'll use environment variables.

---

## Step 2: Deploy Backend to Render

### 2.1 Push Code to GitHub

1. Create a new repository on GitHub
2. Push your code:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   git push -u origin main
   ```

### 2.2 Deploy on Render

1. Go to [render.com](https://render.com) and sign up (free)
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `ledger-backend` (or any name)
   - **Environment**: `Node`
   - **Build Command**: `cd server && npm install`
   - **Start Command**: `cd server && npm start`
   - **Root Directory**: Leave empty (or set to `server` if you want)
5. Click "Create Web Service"
6. Wait for deployment (5-10 minutes)
7. Copy your backend URL (e.g., `https://ledger-backend.onrender.com`)

**Important**: Render free tier spins down after 15 minutes of inactivity. First request after spin-down takes ~30 seconds.

---

## Step 3: Deploy Frontend to Vercel

### 3.1 Update Vite Config for Production

The `vite.config.js` already has proxy for development. For production, we'll use environment variables.

### 3.2 Deploy on Vercel

1. Go to [vercel.com](https://vercel.com) and sign up (free)
2. Click "Add New..." → "Project"
3. Import your GitHub repository
4. Configure:
   - **Framework Preset**: Vite
   - **Root Directory**: `client`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
5. Add Environment Variable:
   - **Name**: `VITE_API_URL`
   - **Value**: Your Render backend URL (e.g., `https://ledger-backend.onrender.com`)
6. Click "Deploy"
7. Wait for deployment (2-3 minutes)
8. Your app will be live at `https://your-project.vercel.app`

---

## Step 4: Update Frontend Code (Optional)

The frontend is already configured to use environment variables. The `axiosConfig.js` file will automatically use `VITE_API_URL` if set, otherwise it will use the Vite proxy (for local development).

---

## Alternative: Deploy Both on Render

If you prefer to use only Render:

1. Deploy backend as Web Service (same as Step 2)
2. Deploy frontend as Static Site:
   - Build command: `cd client && npm install && npm run build`
   - Publish directory: `client/dist`
   - Add environment variable: `VITE_API_URL` = your backend URL

---

## Environment Variables Needed

### Backend (Render)
- `PORT` - Automatically set by Render
- `JWT_SECRET` - Set a secure random string (optional, has default)

### Frontend (Vercel)
- `VITE_API_URL` - Your Render backend URL

---

## Troubleshooting

### Backend Issues
- **Slow first request**: Normal on Render free tier (spins down after inactivity)
- **Database not persisting**: SQLite file is stored in Render's filesystem and persists
- **Port errors**: Render sets PORT automatically, don't hardcode it

### Frontend Issues
- **API calls failing**: Check CORS settings and ensure `VITE_API_URL` is set correctly
- **Build errors**: Make sure all dependencies are in `package.json`

---

## Free Tier Limitations

### Render
- ✅ Free forever
- ⚠️ Spins down after 15 min inactivity (30s wake-up time)
- ✅ 750 hours/month (enough for always-on if you keep it active)

### Vercel
- ✅ Free forever
- ✅ Unlimited deployments
- ✅ Global CDN
- ✅ Automatic HTTPS

---

## Next Steps

1. Set up custom domain (optional, free on Vercel)
2. Enable automatic deployments on git push
3. Set up monitoring/alerts

---

## Support

If you encounter issues:
1. Check Render logs: Dashboard → Your Service → Logs
2. Check Vercel logs: Dashboard → Your Project → Deployments → View Logs
3. Verify environment variables are set correctly

