# FriendsCount - Railway Deployment Guide

This guide explains how to deploy your Express server with GunDB to Railway.com.

## 📋 Prerequisites

1. **Railway Account**: Sign up at [railway.app](https://railway.app)
2. **GitHub Account**: Your repository should be on GitHub
3. **Railway CLI** (optional): Install with `npm install -g @railway/cli`

## 🚀 Quick Deployment Steps

### Step 1: Prepare Your Repository

1. **Push your changes to GitHub**:
   ```bash
   git add .
   git commit -m "Prepare for Railway deployment"
   git push origin main
   ```

2. **Ensure your repository is public** or connect your GitHub account to Railway for private repos.

### Step 2: Deploy to Railway

#### Option A: Deploy via Railway Dashboard (Recommended)

1. Go to [railway.app](https://railway.app) and log in
2. Click **"New Project"**
3. Select **"Deploy from GitHub repo"**
4. Choose your `friendsCount` repository
5. Railway will automatically detect your `railway.json` configuration

#### Option B: Deploy via Railway CLI

```bash
# Login to Railway
railway login

# Initialize your project
railway init

# Deploy
railway up
```

### Step 3: Configure Environment Variables

Railway will automatically use the `PORT` environment variable. However, you may want to set additional variables:

1. In your Railway project dashboard, go to **"Variables"**
2. Add these environment variables:

```env
NODE_ENV=production
PORT=3001
```

### Step 4: Configure Persistent Storage (Important for GunDB)

GunDB needs persistent storage to save data. In Railway:

1. Go to your project dashboard
2. Click **"Volumes"** tab
3. Click **"New Volume"**
4. Configure:
   - **Mount Path**: `/app/server/radata`
   - **Size**: Start with 1GB (adjust as needed)
5. Click **"Add Volume"**

This ensures your GunDB data persists across deployments.

### Step 5: Update Mobile App Configuration

After deployment, Railway will provide you with a URL (e.g., `https://your-app.up.railway.app`).

Update your mobile app's environment variables:

1. Copy `.env.example` to `.env`
2. Update the production URLs:

```env
# Production
EXPO_PUBLIC_SERVER_URL=https://your-app.up.railway.app
EXPO_PUBLIC_GUN_RELAY=wss://your-app.up.railway.app/gun
```

3. Rebuild your mobile app with these new environment variables.

## 🔧 Railway Configuration Details

### railway.json Explanation

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "cd server && npm start",
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

- **NIXPACKS**: Railway's modern build system that automatically detects Node.js
- **startCommand**: Tells Railway to start the server from the `server` directory
- **restartPolicy**: Automatically restarts on failure (max 10 retries)

### Build Process

Railway will automatically:
1. Detect Node.js from your `server/package.json`
2. Run `npm install` in the `server` directory
3. Run `npm run build` to compile TypeScript
4. Start the server with `npm start`

## 📊 Monitoring Your Deployment

### Health Check

Your server includes a health check endpoint:
```
https://your-app.up.railway.app/health
```

This returns:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z"
}
```

### Railway Dashboard

Monitor your deployment in real-time:
- **Logs**: View server logs in the "Logs" tab
- **Metrics**: Monitor CPU, memory, and network usage
- **Deployments**: View deployment history and rollback if needed

## 🔒 Security Considerations

### CORS Configuration

Your server already has CORS enabled. For production, you might want to restrict it:

Update `server/src/index.ts`:
```typescript
app.use(cors({
  origin: ['https://your-mobile-app.com', 'http://localhost:8081'],
  credentials: true
}));
```

### Environment Variables

Never commit sensitive data to `.env`. Railway's environment variables are secure and not exposed in your repository.

## 🐛 Troubleshooting

### Server Won't Start

1. Check logs in Railway dashboard
2. Verify `PORT` environment variable is set
3. Ensure `server/package.json` has correct build scripts

### GunDB Data Not Persisting

1. Verify volume is mounted at `/app/server/radata`
2. Check that `server/src/index.ts` uses `file: 'radata'`
3. Ensure `.gitignore` includes `server/radata/`

### WebSocket Connection Issues

1. Railway supports WebSockets by default
2. Ensure you're using `wss://` (secure WebSocket) in your mobile app
3. Check that your GunDB endpoint is `/gun`

### Mobile App Can't Connect

1. Update `.env` with your Railway URL
2. Use `wss://` instead of `ws://` for production
3. Rebuild your mobile app after changing environment variables

## 📈 Scaling

### Railway Pricing

- **Hobby Plan**: $5/month, includes $5 credit
- **Pro Plan**: $20/month, includes $20 credit
- Pay for what you use beyond the credit

### Auto-Scaling

Railway automatically scales based on traffic. You can configure:
- **Instance Size**: In the "Settings" tab
- **Auto-Scaling Rules**: For handling traffic spikes

## 🔄 Continuous Deployment

Railway automatically deploys when you push to your main branch. To disable:

1. Go to **"Settings"** tab
2. Find **"Deploy on Push"**
3. Toggle it off

## 📝 Post-Deployment Checklist

- [ ] Verify health check endpoint works
- [ ] Test WebSocket connection from mobile app
- [ ] Configure persistent volume for GunDB
- [ ] Update mobile app environment variables
- [ ] Set up monitoring alerts (optional)
- [ ] Configure custom domain (optional)

## 🆘 Getting Help

- **Railway Documentation**: [docs.railway.app](https://docs.railway.app)
- **Railway Discord**: [discord.gg/railway](https://discord.gg/railway)
- **GitHub Issues**: Report bugs in your repository

## 🎉 Success!

Your FriendsCount server is now live on Railway! Your mobile app should be able to connect to the GunDB relay and sync data in real-time.

Remember to:
- Monitor your usage to avoid unexpected charges
- Keep your dependencies updated
- Test thoroughly before updating the mobile app