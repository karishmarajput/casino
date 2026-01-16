# Cloudinary Image Storage Setup

## Problem
When deploying to cloud platforms like Render, local file storage doesn't persist. Images stored in `server/uploads/` are lost on each deployment.

## Solution
Use Cloudinary (free tier available) for cloud-based image storage.

## Setup Steps

### 1. Create a Cloudinary Account
1. Go to https://cloudinary.com/users/register/free
2. Sign up for a free account
3. After signup, you'll see your dashboard with credentials

### 2. Get Your Cloudinary Credentials
From your Cloudinary dashboard, you'll need:
- **Cloud Name** (e.g., `dxyz123abc`)
- **API Key** (e.g., `123456789012345`)
- **API Secret** (e.g., `abcdefghijklmnopqrstuvwxyz123456`)

### 3. Add Environment Variables
Add these to your `.env` file in the `server` directory:

```env
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

### 4. Add to Render Environment Variables
1. Go to your Render dashboard
2. Select your backend service
3. Go to "Environment" tab
4. Add these three environment variables:
   - `CLOUDINARY_CLOUD_NAME` = your cloud name
   - `CLOUDINARY_API_KEY` = your API key
   - `CLOUDINARY_API_SECRET` = your API secret

### 5. Install Dependencies
The code has been updated to use Cloudinary. Run:
```bash
cd server
npm install
```

## How It Works

- **With Cloudinary configured**: Images are uploaded to Cloudinary and stored in the cloud. URLs are stored in the database.
- **Without Cloudinary**: Falls back to local storage (for development only).

## Benefits

✅ Images persist across deployments  
✅ Fast CDN delivery  
✅ Automatic image optimization  
✅ Free tier: 25GB storage, 25GB bandwidth/month  
✅ No code changes needed - works automatically once configured

## Migration

Existing images with `/uploads/rewards/` paths will still work if you keep serving them locally. New uploads will use Cloudinary URLs.
