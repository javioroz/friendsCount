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

### Important: Service Settings

In **Service → Settings** make sure:

- **Root Directory**: `/server`. Only files inside `server/` are pulled for the
  build, so all commands run relative to `server/` (not the monorepo root).
- **Config File Path**: `/server/railway.json`. The Railway config file does
  **not** follow the Root Directory, so the absolute repo path must be given;
  otherwise Railway keeps reading the monorepo-root `/railway.json`, whose
  `npm run build:server` script does not exist in `server/package.json` and the
  build fails with `Missing script: "build:server"`.
- **Builder**: Nixpacks (set via `server/railway.json`).
- Build Command and Start Command can stay in the dashboard too; they must
  match `server/railway.json`. `server/nixpacks.toml` declares the same phases
  explicitly so the build does not depend on autodetection, and installs with
  `npm install --include=dev` (the build runs under `NODE_ENV=production`, which
  otherwise omits `typescript` and leaves the build phase without `tsc`).

### Step 3: Configure Environment Variables

Railway injects `PORT` automatically (the server reads `process.env.PORT`).
Do **not** hardcode `PORT=3001`: Railway routes traffic to the port it assigns.

1. In your Railway project dashboard, go to **"Variables"**
2. Set:

```env
NODE_ENV=production
```

> The repo-root `.env` is not uploaded (Root Directory is `/server`, and `.env`
> is gitignored), so anything the server needs at runtime must be set here.
> `GUN_RELAY_HOST` is only used for log output and defaults to `localhost`.

### Step 4: Configure Persistent Storage (Important for GunDB)

GunDB needs persistent storage to save data. In Railway:

1. Go to your project dashboard
2. Click **"Volumes"** tab
3. Click **"New Volume"**
4. Configure:
   - **Mount Path**: `/server/radata` (any absolute path works; the server reads
     `RAILWAY_VOLUME_MOUNT_PATH`)
   - **Size**: Start with 500MB and increase as GunDB grows
5. Click **"Add Volume"**

This ensures your GunDB data persists across deployments.

No extra configuration is needed: the server already resolves the data path to
`RAILWAY_VOLUME_MOUNT_PATH` automatically when that variable is present, so it
writes inside the volume without manual setup. The resolution order is:

1. `GUN_DATA_PATH` (if you want to override)
2. `RAILWAY_VOLUME_MOUNT_PATH` (set by Railway for the volume)
3. `server/radata` (relative to the compiled server)

The server creates the directory if missing and logs the resolved path on boot
(`GunDB data path: ...`). After the first deploy, check that log line against
your mount path: if they differ, Gun is writing to the ephemeral filesystem and
your data will vanish on the next deploy.

A volume can only be mounted on a single instance. If you ever scale the
service to two or more replicas, point `GUN_DATA_PATH` at S3 storage through
`gun-s3radix` instead, so every instance shares one copy of the data.

### Step 5: Update Mobile App Configuration

After deployment, Railway will provide you with a URL (e.g., `https://your-app.up.railway.app`).

Update your mobile app's environment variables:

1. Copy `mobile/.env.example` to `mobile/.env` (the file goes in `mobile/`, not in
   the repo root: Expo reads the `.env` of the Expo project root, which is `mobile/`)
2. Update the production URL:

```env
# mobile/.env
EXPO_PUBLIC_GUN_RELAY=wss://your-app.up.railway.app/gun
```

> The `EXPO_PUBLIC_` prefix is mandatory. `babel-preset-expo` only inlines env vars
> with that prefix (see `node_modules/babel-preset-expo/build/inline-env-vars.js`).
> A variable named `GUN_RELAY` or `SERVER_URL` reaches the app as `undefined`, so the
> app silently falls back to `ws://localhost:3001/gun` — which on a phone means the
> phone itself, and no relay is ever reached.

3. The URL must use `wss://`. The release manifest does not declare
   `usesCleartextTraffic`, so Android 9+ blocks `ws://`. (Debug builds do allow it,
   which is why `ws://localhost:3001/gun` works in development.)
4. Rebuild your mobile app so the value is baked into the bundle. Changing the
   variable on the server afterwards does nothing until you ship a new build.
5. Verify on the device: open the `/debug` screen. It shows the relay URL in use and
   flags a wrong scheme or a missing variable, instead of failing silently.

## 📦 Building the app (EAS)

The app is built in the cloud with EAS, so no local JDK or Android SDK is needed.
`eas.json` defines three profiles with different outputs:

| Profile        | Output      | Distribution | Use                                |
| -------------- | ----------- | ------------ | ---------------------------------- |
| `development`  | `.apk`      | internal     | dev client, `expo start`           |
| `preview`      | `.apk`      | internal     | test on a real device before Play  |
| `production`   | `.aab`      | store        | upload to Google Play              |

```bash
# APK for sideloading / device testing
eas build --platform android --profile preview

# App Bundle for Google Play (production)
eas build --platform android --profile production
```

`production` sets `autoIncrement: true`, so EAS bumps `versionCode` on each build.
Note that Google Play requires an `.aab`; a direct `.apk` is only for sideloading.

## 🔧 Railway Configuration Details

### railway.json Explanation

The deploy uses `server/railway.json` (Root Directory `/server`, Config File
Path `/server/railway.json`):

```json
{
  "$schema": "https://railway.app/railway.schema.json",
  "build": {
    "builder": "NIXPACKS",
    "buildCommand": "npm run build"
  },
  "deploy": {
    "startCommand": "node dist/index.js",
    "healthcheckPath": "/health",
    "healthcheckTimeout": 100,
    "restartPolicyType": "ON_FAILURE",
    "restartPolicyMaxRetries": 10
  }
}
```

- **NIXPACKS**: Railway's build system, configured by `server/nixpacks.toml`
- **buildCommand**: `npm run build` is `server/package.json`'s `tsc` script.
  Paths are relative to `server/` because of the Root Directory
- **startCommand**: Starts the compiled server (`server/dist/index.js`)
- **healthcheckPath**: Railway polls `/health` to decide the deploy is live
- **restartPolicy**: Automatically restarts on failure (max 10 retries)

The monorepo root also ships `railway.json` / `nixpacks.toml` for a full
repo-root deploy (`npm run build:server`, `node server/dist/index.js`). Those
apply only when the Root Directory is left empty; they are ignored by this
service.

### Build Process

With Root Directory `/server`, Railway will:
1. Detect Node.js from `server/package.json` (or use `server/nixpacks.toml`)
2. Run `npm install --include=dev` in the `server` directory
3. Run `npm run build` (TypeScript `tsc`) to produce `server/dist`
4. Start the server with `node dist/index.js`

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

1. Verify the volume mount path matches `RAILWAY_VOLUME_MOUNT_PATH` (this
   service uses `/server/radata`)
2. Check the boot log line `GunDB data path: ...`; if it points at `/app/radata`
   the volume variable was not seen and data is going to the ephemeral disk
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