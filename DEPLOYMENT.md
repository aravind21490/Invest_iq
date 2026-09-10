# 🚀 Invest IQ Hosting & Deployment Guide

This guide details how to deploy **Invest IQ** to the cloud with **₹0 cost (100% Free Stack)** using **Render** for the backend and **Vercel** for the frontend / serverless edge.

---

## ⚖️ Railway vs Render: Why Render is the Best Free Choice

| Feature | **Render (Recommended)** | **Railway** |
| :--- | :--- | :--- |
| **Free Tier** | **Yes (Free Forever Web Service)** | **No** (Trials expire, then paid plan required) |
| **Credit Card Required?** | **No** (Sign up with GitHub without credit card) | **Yes** (Card mandatory to deploy) |
| **Cost** | **₹0 / $0** | $5+/month minimum base fee |
| **Python WSGI / Gunicorn** | Built-in native support | Container-based |
| **Automatic HTTPS/SSL** | Free auto-renewing Let's Encrypt certificates | Supported |
| **Verdict** | 🏆 **Best for ₹0 stack student/educational hosting** | Good developer DX, but paid |

> [!NOTE]
> **Railway** eliminated its permanent free plan and now requires a credit card and active billing ($5/mo minimum). **Render** remains the industry gold standard for free Python web hosting without requiring a credit card.

---

## 🛠️ Part 1: Deploying the Backend on Render (Free Web Service)

### Method A: 1-Click Blueprint with `render.yaml`
1. Push your Invest IQ code repository to your **GitHub** account.
2. Sign in to [Render Dashboard](https://dashboard.render.com/) with GitHub.
3. Click **New +** in the top-right corner and select **Blueprint**.
4. Connect your GitHub repository.
5. Render will automatically detect [`render.yaml`](render.yaml), configure Singapore region (lowest latency for India), set up Gunicorn, and deploy.
6. Click **Apply**.

---

### Method B: Manual Web Service Setup (Step-by-Step)
1. Go to [Render Dashboard](https://dashboard.render.com/) and click **New +** -> **Web Service**.
2. Connect your GitHub repository: `your-username/Invest-IQ`.
3. Fill in the following settings:
   - **Name**: `investiq-backend` (or any unique name)
   - **Region**: `Singapore` (Fastest for Indian NSE data)
   - **Branch**: `main`
   - **Root Directory**: Leave blank (root)
   - **Runtime**: `Python 3`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `gunicorn app:app --workers 2 --threads 4 --timeout 120 --bind 0.0.0.0:$PORT`
   - **Instance Type**: Select **Free** (512 MB RAM, 0.1 CPU)
4. Under **Environment Variables**, add:
   - `PYTHON_VERSION`: `3.11.9`
   - `FLASK_ENV`: `production`
   - `SECRET_KEY`: Enter a random 32-character string
   - `GROQ_API_KEY`: *(Optional)* Your free key from [Groq Console](https://console.groq.com)
5. Click **Create Web Service**.
6. Render will build and deploy your app. Once finished, your backend URL will look like:
   `https://investiq-backend.onrender.com`

---

## ⚡ Part 2: Deploying on Vercel (Secondary / Experimental Path)

> [!NOTE]
> **Render is the primary, recommended deployment target** because Invest IQ runs as a persistent Flask WSGI application with local SQLite database state. Vercel is supported via `@vercel/python` as an experimental serverless path, but SQLite state resets between cold starts on serverless lambdas. Use Render for the full persistent experience.

### Step-by-Step Vercel Setup (Experimental)
1. Push your repository to **GitHub**.
2. Sign in to [Vercel](https://vercel.com/) with GitHub.
3. Click **Add New...** -> **Project**.
4. Select your `Invest-IQ` GitHub repository and click **Import**.
5. Vercel automatically detects [`vercel.json`](vercel.json):
   - **Framework Preset**: Other
   - **Root Directory**: `./`
6. Expand **Environment Variables** and add:
   - `SECRET_KEY`: Random secret string
   - `GROQ_API_KEY`: *(Optional)* Your Groq API key
   - `FLASK_ENV`: `production`
7. Click **Deploy**.
8. Within 60 seconds, your site will be live at:
   `https://invest-iq.vercel.app`

---

## 📁 Deployment Configuration Files in This Repository

1. **[`render.yaml`](render.yaml)**:
   Render Infrastructure-as-Code blueprint with preconfigured Gunicorn workers, Python 3.11, Singapore region, and environment variables.

2. **[`Procfile`](Procfile)**:
   Standard WSGI process definition used by Render / Railway / Heroku:
   ```procfile
   web: gunicorn app:app --workers 2 --threads 4 --timeout 120 --bind 0.0.0.0:$PORT
   ```

3. **[`vercel.json`](vercel.json)**:
   Vercel serverless routing configuration mapping all static assets to `/static/*` and all application routes to `app.py` via `@vercel/python`.

4. **[`.env.example`](.env.example)**:
   Template of all production environment keys.

---

## 🔒 Post-Deployment Checklist

- [ ] **Screener Check**: Navigate to `/screener` and verify server-side search across 2,298 NSE stocks and pagination controls.
- [ ] **Technical Charts**: Open any stock (e.g. `/stock/RELIANCE.NS`) to verify candlestick rendering, RSI, MACD, and Bollinger matrix.
- [ ] **Zerodha Kite Bridge**: Check `/settings/broker` and execute a practice trade with the human-approval modal confirmation.
- [ ] **Free Tier Sleep/Wake**: Free tier instances on Render spin down after 15 minutes of inactivity; the first request after idle takes ~30 seconds to wake up.
