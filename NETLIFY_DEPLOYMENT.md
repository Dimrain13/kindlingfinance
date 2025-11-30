# 🚀 Netlify Deployment Guide for Kindling Financial

## 📋 Frontend Environment Variables (for Netlify)

Copy these into Netlify's environment variables section:

```
REACT_APP_BACKEND_URL=https://your-backend-url-here.railway.app
WDS_SOCKET_PORT=443
DANGEROUSLY_DISABLE_HOST_CHECK=true
REACT_APP_ENABLE_VISUAL_EDITS=false
ENABLE_HEALTH_CHECK=false
```

---

## ⚙️ Netlify Build Settings

```
Branch to deploy: main
Base directory: frontend
Build command: yarn build
Publish directory: frontend/build
Functions directory: (leave empty)
```

---

## 🔧 Backend Environment Variables (for Railway/Render)

⚠️ **IMPORTANT:** These go on your BACKEND hosting (Railway/Render), NOT Netlify!

```
MONGO_URL=mongodb+srv://username:password@cluster.mongodb.net/ember_db
DB_NAME=financehub_db
CORS_ORIGINS=https://your-app-name.netlify.app
PLAID_CLIENT_ID=69177418ca21950020011098
PLAID_SECRET=96c8a146611ff2c816e3fe26bbc911
PLAID_ENVIRONMENT=production
EMERGENT_LLM_KEY=sk-emergent-9A4537b4c1aC02a6eC
JWT_SECRET=GENERATE_NEW_RANDOM_STRING_32_CHARS_MIN
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=43200
STRIPE_API_KEY=sk_test_emergent
```

---

## 📝 Step-by-Step Deployment

### Step 1: Deploy Backend First (Railway Recommended)

1. Go to https://railway.app
2. Connect your GitHub account
3. Create new project from your repo
4. Set root directory: `/backend`
5. Add ALL backend environment variables above
6. Deploy and get your backend URL (e.g., `https://ember-backend.railway.app`)

### Step 2: Deploy Frontend to Netlify

1. Go to https://app.netlify.com
2. Click "Add new site" → "Import an existing project"
3. Connect your GitHub repo
4. Configure build settings (see above)
5. Add environment variables (frontend only)
6. Update `REACT_APP_BACKEND_URL` to your Railway backend URL
7. Deploy!

---

## ⚠️ Before Going Live - Update These:

### 1. MongoDB (Required)
- Sign up at https://www.mongodb.com/cloud/atlas
- Create free cluster
- Get connection string: `mongodb+srv://...`
- Replace `MONGO_URL` in backend

### 2. JWT Secret (Required)
Generate a new random string:
```bash
openssl rand -base64 32
```
Replace `JWT_SECRET` in backend

### 3. CORS Origins (Required)
Change from `*` to your actual Netlify URL:
```
CORS_ORIGINS=https://your-app.netlify.app
```

### 4. Stripe (If using payments)
- Get live key from https://dashboard.stripe.com
- Replace `STRIPE_API_KEY` with `sk_live_...`

---

## 🔐 Security Checklist

- ✅ MongoDB uses Atlas (not localhost)
- ✅ JWT_SECRET is a new random 32+ character string
- ✅ CORS_ORIGINS is set to your Netlify URL (not *)
- ✅ All API keys are ONLY on backend (Railway/Render)
- ✅ Frontend only has `REACT_APP_BACKEND_URL`
- ✅ Stripe is using live keys (not test)

---

## 🎯 Quick Reference

**Frontend URL:** https://your-app.netlify.app  
**Backend URL:** https://ember-backend.railway.app  
**Database:** MongoDB Atlas

**Environment Variables Locations:**
- Frontend (Netlify): 5 variables (no API keys!)
- Backend (Railway): 11 variables (all API keys)

---

## 🆘 Troubleshooting

**Problem:** "Backend not found" error  
**Solution:** Check `REACT_APP_BACKEND_URL` matches your Railway URL

**Problem:** "Database connection failed"  
**Solution:** Verify MongoDB Atlas connection string and whitelist Railway IPs

**Problem:** "CORS error"  
**Solution:** Update `CORS_ORIGINS` on backend to match Netlify URL

**Problem:** "Plaid connection fails"  
**Solution:** Verify Plaid credentials and environment setting

---

Generated for Kindling Financial Finance App 🔥
