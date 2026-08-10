# Frontline Sentinel — Render Deployment Guide

This guide describes how to deploy the Frontline Sentinel monorepo to [Render](https://render.com/).

---

## Option 1: Unified Service (Recommended)
This approach deploys both the frontend and backend in a single Render **Web Service**. The Express backend serves the React frontend static build directly.

### Step-by-Step Setup:
1. Log in to Render and click **New +** -> **Web Service**.
2. Connect your Git repository.
3. Configure the following settings:
   * **Name**: `frontline-sentinel`
   * **Language**: `Node`
   * **Branch**: `main` (or your preferred branch)
   * **Root Directory**: (Leave blank — this uses the workspace root)
   * **Build Command**: `npm run build`
   * **Start Command**: `npm start`
4. Expand the **Environment Variables** section and add the following keys:
   * `NODE_ENV`: `production`
   * `MONGODB_URI`: `your_mongodb_atlas_connection_string`
   * `GEMINI_API_KEY`: `your_gemini_api_key`
   * `GEMINI_MODEL`: `gemini-3.5-flash`
   * `AI_BASE_URL`: `https://generativelanguage.googleapis.com`
5. Click **Create Web Service**.

---

## Option 2: Split Services (Alternative)
Use this option if you want to deploy the frontend as a fast, free **Static Site** and the backend as a separate **Web Service**.

### 1. Backend API Service
1. Create a new Render **Web Service**.
2. Connect your repository.
3. Configure:
   * **Name**: `frontline-sentinel-api`
   * **Language**: `Node`
   * **Root Directory**: `backend`
   * **Build Command**: `npm install && npm run build`
   * **Start Command**: `npm start`
4. Add environment variables:
   * `NODE_ENV`: `production`
   * `MONGODB_URI`: `your_mongodb_atlas_connection_string`
   * `GEMINI_API_KEY`: `your_gemini_api_key`
   * `GEMINI_MODEL`: `gemini-3.5-flash`
5. Deploy and copy your backend URL (e.g. `https://frontline-sentinel-api.onrender.com`).

### 2. Frontend Static Site
1. Create a new Render **Static Site**.
2. Connect your repository.
3. Configure:
   * **Name**: `frontline-sentinel-frontend`
   * **Root Directory**: `frontend`
   * **Build Command**: `npm install && npm run build`
   * **Publish Directory**: `dist`
4. Add environment variables:
   * `VITE_API_URL`: `https://frontline-sentinel-api.onrender.com/api` (use the backend URL copied from the previous step, appending `/api`)
5. Click **Create Static Site**.

---

## MongoDB Atlas Network Access Configuration
To allow Render services to connect to your MongoDB Atlas database:
1. Log in to the [MongoDB Atlas Console](https://cloud.mongodb.com/).
2. Select your project and navigate to **Security** -> **Network Access**.
3. Click **Add IP Address**.
4. Choose **Allow Access From Anywhere** (adds `0.0.0.0/0`) because Render does not guarantee static outbound IP addresses on standard plans.
5. Click **Confirm**.

---

## Local Verification (Production Mode Dry-Run)
To test that the production build works locally:
1. Install all dependencies from root:
   ```bash
   npm install
   ```
2. Build both projects:
   ```bash
   npm run build
   ```
3. Run the backend in production mode:
   ```bash
   $env:NODE_ENV="production"
   $env:MONGODB_URI="mongodb://127.0.0.1:27017/frontline_sentinel"
   npm start
   ```
4. Access the frontend app at `http://127.0.0.1:5000`.
