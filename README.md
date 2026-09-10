# Invest_iq
### AI-Powered Investment Learning and Market Simulator 
**Author:** Aravind, B.Tech CSE (AI & ML), Siddhartha Institute of Technology & Sciences

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.10+](https://img.shields.io/badge/python-3.10+-blue.svg)](https://www.python.org/downloads/)
[![Next.js 16](https://img.shields.io/badge/Next.js-16.3.4-black.svg)](https://nextjs.org/)
[![React 19](https://img.shields.io/badge/React-19.0-61dafb.svg)](https://react.dev/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38bdf8.svg)](https://tailwindcss.com/)

---

## 📌 Quick Access & Project Documentation

- 📑 **Official PDF Overview**: [`Project Overview/Invest_iq_Project_Overview.pdf`](./Project%20Overview/Invest_iq_Project_Overview.pdf) *(and [`Invest_IQ_Project_Overview.pdf`](./Invest_IQ_Project_Overview.pdf))*
- 📄 **Complete Project Overview (Markdown)**: [`Project Overview/PROJECT_OVERVIEW.md`](./Project%20Overview/PROJECT_OVERVIEW.md)
- 📁 **Project Folder Structure Map**: [`Project Folder Structure Overview/PROJECT_FOLDER_STRUCTURE_OVERVIEW.md`](./Project%20Folder%20Structure%20Overview/PROJECT_FOLDER_STRUCTURE_OVERVIEW.md)
- 🚀 **Cloud Deployment Guide**: [`DEPLOYMENT.md`](./DEPLOYMENT.md)

---

## 1. Executive Summary

Invest_iq is a web platform where users **practice investing with virtual money** while an AI explains real market behavior in plain English. It is explicitly an **education and simulation tool** — not a real trading system, not investment advice, and not a SEBI-regulated advisory product.

> **One-line description:**  
> *An AI that watches real stock market data, teaches concepts using real examples, and lets users practice buying/selling with virtual money — so they understand investing before ever risking real money.*

---

## 2. Key Capabilities

- **Real Institutional Data, Zero Risk**: Real live streaming quotes for **2,400+ securities** (all 2,298+ active Indian NSE stocks in ₹ plus 100+ Global US market leaders in $) paired with ₹1,00,000 / $100,000 persistent virtual capital.
- **Up-to-Date Financial Overview**: 69 months of verified institutional monthly close data (2021–2025) for Nifty 50 and S&P 500, with dynamic live streaming on the present month (2026).
- **Interactive Year Selector**: Timeframe dropdown and quick pill buttons (`2026 Live`, `2025`, `2024`, `2023`, `2022`, `2021`, `5Y All Years`).
- **Technical Indicator Engine**: Real-time computed Wilder's 14-period RSI, EMA-12/26 MACD, 20-period 2-std dev Bollinger Bands, and Volume ratios.
- **AI Signal Explanations**: Plain-English breakdowns grounded in real computed numbers with transparent historical win-rates and disclaimers.
- **Interactive Alerts & Signals Drawer**: Slide-over notification tray with unread tracking, category badges (`AI SIGNAL`, `TRADE FILL`, `SYSTEM`), and filter tabs.
- **Dark & Light Mode Adaptation**: Tailored Tailwind CSS v4 custom variant (`@custom-variant dark`) with dynamic chart stroke adaptation.
- **Voice Narration**: Free built-in browser **SpeechSynthesis API** for reading signals and academy lessons aloud.
- **Behavioral Guardrails**: Loss-streak cooldown mechanics and mandatory reflection prompts.

---

## 3. Technology Stack

| Layer | Technology | Cost |
|---|---|---|
| **Frontend Web Hub** | Next.js 16.3.4 (React 19), Tailwind CSS v4, Lucide React, Recharts | Free / Open Source |
| **Backend / Technical Engine** | Python 3.10+, Flask, Pandas, NumPy | Free / Open Source |
| **Database** | SQLite3 (`investiq.db`, `finsim.db`) → PostgreSQL (production) | Free |
| **Stock Data** | yfinance (sub-2s streaming in-memory cache) | Free |
| **Full NSE Stock List** | Official NSE equity list CSV (2,298+ equities) + Global US catalog | Free |
| **AI Explanations** | Groq LLM (Llama 3.1) / OpenAI-compatible API | Free tier |
| **Voice Narration** | Browser SpeechSynthesis API | Free, built-in |
| **Auth** | Session authentication with mandatory Full Name validation | Free |

**Total Cost to Build and Run: ₹0**

---

## 4. Getting Started Locally

### Prerequisites
- Python 3.10+
- Node.js 18+ and npm

### One-Click Startup (Windows)
```cmd
start.bat
```
*(Or PowerShell: `./start.ps1`)*

### Manual Startup

1. **Start the Next.js Frontend Hub (Port 3000)**:
   ```cmd
   cd frontend
   npm install
   npm run dev
   ```

2. **Start the Python Engine & API Gateway (Port 5000)**:
   ```cmd
   python -m venv venv
   venv\Scripts\activate
   pip install -r requirements.txt
   python app.py
   ```

3. **Access the Application**:
   - **Primary Web Hub**: [http://localhost:3000/](http://localhost:3000/)
   - **Python API & Reverse Proxy**: [http://127.0.0.1:5000/](http://127.0.0.1:5000/)

---

## 5. Legal Positioning

Finsim AI is an educational simulation platform:
- Virtual money only — no real-money trading or autonomous order routing.
- Every AI explanation carries a clear disclaimer and historical win-rate — never a directive to "buy" or "sell".
- The word **"SIMULATION"** or **"Virtual"** is displayed prominently across all relevant screens.
- Operates outside SEBI Registered Investment Adviser (RIA) licensing requirements.
