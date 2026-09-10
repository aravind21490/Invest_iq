import os
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether,
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#64748b"))
        
        # Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 750, "Finsim AI (Invest IQ) — Version 2 | Aravind, B.Tech CSE (AI & ML)")
            self.setStrokeColor(colors.HexColor("#cbd5e1"))
            self.setLineWidth(0.5)
            self.line(54, 744, 558, 744)
        
        # Footer
        footer_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 36, footer_text)
        self.drawString(54, 36, "Finsim AI · Educational Investment Simulator with Real Market Data · Zero Risk")
        self.setStrokeColor(colors.HexColor("#cbd5e1"))
        self.setLineWidth(0.5)
        self.line(54, 46, 558, 46)
        
        self.restoreState()

def build_pdf(filename="Finsim_AI_Project_Overview.pdf"):
    os.makedirs(os.path.dirname(os.path.abspath(filename)), exist_ok=True)
    doc = SimpleDocTemplate(
        filename,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54,
    )

    styles = getSampleStyleSheet()

    # Custom typography
    tag_style = ParagraphStyle(
        "Tag",
        fontName="Helvetica-Bold",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#2563eb"),
        spaceAfter=2,
    )

    title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=20,
        leading=24,
        textColor=colors.HexColor("#0f172a"),
        spaceAfter=2,
    )

    sub_title_style = ParagraphStyle(
        "SubTitle",
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        textColor=colors.HexColor("#334155"),
        spaceAfter=3,
    )

    author_style = ParagraphStyle(
        "Author",
        fontName="Helvetica",
        fontSize=9.5,
        leading=13,
        textColor=colors.HexColor("#475569"),
        spaceAfter=8,
    )

    h1_style = ParagraphStyle(
        "H1",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=12,
        leading=15,
        textColor=colors.HexColor("#1e293b"),
        spaceBefore=9,
        spaceAfter=4,
        keepWithNext=True,
    )

    h2_style = ParagraphStyle(
        "H2",
        parent=styles["Heading3"],
        fontName="Helvetica-Bold",
        fontSize=9.5,
        leading=12,
        textColor=colors.HexColor("#2563eb"),
        spaceBefore=5,
        spaceAfter=2,
        keepWithNext=True,
    )

    body_style = ParagraphStyle(
        "Body",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=11,
        textColor=colors.HexColor("#334155"),
        spaceAfter=3,
    )

    callout_style = ParagraphStyle(
        "Callout",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#1e293b"),
    )

    code_style = ParagraphStyle(
        "Code",
        parent=styles["Normal"],
        fontName="Courier",
        fontSize=7,
        leading=9,
        textColor=colors.HexColor("#0f172a"),
    )

    table_header_style = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=9.5,
        textColor=colors.white,
    )

    table_body_style = ParagraphStyle(
        "TableBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7,
        leading=9,
        textColor=colors.HexColor("#1e293b"),
    )

    story = []

    # Title Banner
    story.append(Paragraph("FINSIM AI — VERSION 2", tag_style))
    story.append(Paragraph("Finsim AI", title_style))
    story.append(Paragraph("AI-Powered Investment Learning and Market Simulator", sub_title_style))
    story.append(Paragraph("<b>Author:</b> Aravind, B.Tech CSE (AI & ML), Siddhartha Institute of Technology & Sciences", author_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#2563eb"), spaceBefore=0, spaceAfter=8))

    # 1. What This Project Is
    story.append(Paragraph("1. What This Project Is", h1_style))
    story.append(Paragraph(
        "Finsim AI is a web platform where users <b>practice investing with virtual money</b> while an AI explains real market behavior in plain English. "
        "It is explicitly an <b>education and simulation tool</b> — not a real trading system, not investment advice, and not a SEBI-regulated advisory product.",
        body_style
    ))
    
    one_line_box = [
        [Paragraph("<b>One-line description:</b><br/><i>'An AI that watches real stock market data, teaches concepts using real examples, and lets users practice buying/selling with virtual money — so they understand investing before ever risking real money.'</i>", callout_style)]
    ]
    t_callout = Table(one_line_box, colWidths=[504])
    t_callout.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), colors.HexColor("#eff6ff")),
        ("BOX", (0,0), (-1,-1), 1, colors.HexColor("#bfdbfe")),
        ("PADDING", (0,0), (-1,-1), 6),
    ]))
    story.append(t_callout)
    story.append(Spacer(1, 6))

    # 2. Why This Name and Framing
    story.append(Paragraph("2. Why This Name and Framing", h1_style))
    framing_data = [
        [Paragraph("Old Framing", table_header_style), Paragraph("Current Framing", table_header_style)],
        [Paragraph("'AI broker agent' that recommends real trades", table_body_style), Paragraph("<b>'Simulator' for learning</b>", table_body_style)],
        [Paragraph("Legal gray zone (advice-adjacent, SEBI RIA concerns)", table_body_style), Paragraph("<b>Clearly educational — no licensing required</b>", table_body_style)],
        [Paragraph("Real trading focus", table_body_style), Paragraph("<b>Practice + understanding focus</b>", table_body_style)],
    ]
    t_framing = Table(framing_data, colWidths=[240, 264])
    t_framing.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#334155")),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ("BOX", (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
        ("INNERGRID", (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ("PADDING", (0,0), (-1,-1), 4),
    ]))
    story.append(t_framing)
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "Positioning as a <b>learning simulator</b> (not a trading bot) keeps this legally clean and makes it a strong academic project as well as a genuine product idea. "
        "The word 'SIMULATION' or 'Virtual' stays visible directly in the UI on every relevant screen — not buried in documentation — so the legal framing holds up in practice, not just on paper.",
        body_style
    ))
    story.append(Spacer(1, 6))

    # 3. Core User Flow
    story.append(Paragraph("3. Core User Flow", h1_style))
    flow_steps = [
        "<b>1. User signs up</b> → gets ₹1,00,000 / $100,000 virtual cash.",
        "<b>2. Platform pulls real market data</b> (yfinance) — never synthetic or randomly generated prices, so patterns learned actually reflect real market behavior.",
        "<b>3. AI analyzes each stock</b> and explains signals in plain English, grounded in that stock's actual computed numbers (never generic templates).",
        "<b>4. User practices buying/selling with virtual money</b>, with real brokerage, STT, and capital-gains tax deducted on every trade — so the numbers feel real.",
        "<b>5. AI teaches the 'why'</b> behind each concept as it comes up, optionally read aloud via voice narration.",
        "<b>6. User sees a report of virtual profit/loss</b>, mistakes, and lessons learned over time, alongside volatility/drawdown — not just a smoothed return figure."
    ]
    for step in flow_steps:
        story.append(Paragraph(step, body_style))
    story.append(Spacer(1, 6))

    # 4. Feature List
    story.append(Paragraph("4. Feature List", h1_style))
    
    features = [
        ("4.1 Core Features",
         "• <b>Virtual portfolio:</b> Starting balance (₹1,00,000 / $100,000), buy/sell paper simulation with live P&L.<br/>"
         "• <b>Real market data:</b> yfinance with 2-second streaming — includes real market-regime periods (2020 crash, 2021 rally, 2022 dip, 2023-2025 bull run, 2026 live) so users experience genuine volatility.<br/>"
         "• <b>Up-to-Date Financial Overview:</b> 69 months of institutional closing data (2021–2025) with dynamic real-time live streaming for 2026.<br/>"
         "• <b>Technical indicator engine:</b> Wilder's 14-period RSI, EMA-12/26 MACD, 20-period 2-std dev Bollinger Bands, Volume ratio.<br/>"
         "• <b>AI-generated plain English explanations:</b> Grounded in that stock's real computed numbers.<br/>"
         "• <b>Daily virtual portfolio report:</b> Mini 'EOD summary' showing volatility/drawdown alongside returns."),
        
        ("4.2 Education-Focused Features",
         "• <b>Concept lessons tied to real signals:</b> Concept lessons explain technical indicators the moment a stock triggers oversold or golden crosses.<br/>"
         "• <b>Voice narration:</b> Browser's free built-in SpeechSynthesis API (no API key, zero cost).<br/>"
         "• <b>Historical win-rate shown per signal type:</b> E.g. 'RSI < 30 has preceded a bounce ~60% of the time in backtests' — keeps every AI explanation honest.<br/>"
         "• <b>Realistic costs simulation:</b> Brokerage + STT deducted on every virtual trade; short-term capital gains tax shown in reports.<br/>"
         "• <b>Diversification score/warning:</b> Alerts user if virtual portfolio is over-concentrated in one stock or sector.<br/>"
         "• <b>Market regime replay mode:</b> Real historical periods, not smoothed averages."),

        ("4.3 Engagement / Behavior Features",
         "• <b>Loss 'streak' mechanic:</b> Consecutive losses trigger a short mandatory cooldown before the next trade, giving virtual losses behavioral weight.<br/>"
         "• <b>Mandatory reflection prompt:</b> Required reflection after a losing trade before the next action is allowed.<br/>"
         "• <b>Progress tracking:</b> Virtual P&L history, lessons completed, mistakes flagged over time."),

        ("4.4 Data & Scale Approach",
         "• <b>Starter watchlist:</b> ~20 liquid, well-known NSE stocks across sectors for the initial build.<br/>"
         "• <b>Scaled up to full market coverage:</b> 2,400+ securities (all 2,298+ active Indian NSE stocks in ₹ plus 100+ Global US market leaders in $).<br/>"
         "• <b>AI explanations cached:</b> Cached per stock per day and served to all users watching that stock, staying comfortably within free-tier LLM limits."),

        ("4.5 Implemented & Enhanced Architecture",
         "• <b>Full NSE market screener & catalog:</b> 2,400+ securities with instant search, sector tabs, and 2-second streaming ticks.<br/>"
         "• <b>Multi-user authentication:</b> Mandatory Full Name validation on sign-up before OTP or Google verification.<br/>"
         "• <b>Interactive Alerts & Signals Drawer:</b> Real unread count tracking, category badges (AI SIGNAL, TRADE FILL, SYSTEM), and filter tabs.<br/>"
         "• <b>Complete Dark / Light Mode:</b> Dynamic chart strokes and Tailwind CSS v4 custom variant.<br/>"
         "• <b>Optional real-broker paper trading connection:</b> Zerodha Kite Personal API protocol (free tier) for advanced users, strictly human-approved only.")
    ]

    for f_title, f_desc in features:
        story.append(Paragraph(f_title, h2_style))
        story.append(Paragraph(f_desc, body_style))

    story.append(Spacer(1, 6))

    # 5. Tech Stack Table
    story.append(Paragraph("5. Tech Stack", h1_style))
    tech_data = [
        [Paragraph("Layer", table_header_style), Paragraph("Technology", table_header_style), Paragraph("Cost", table_header_style)],
        [Paragraph("<b>Frontend Hub</b>", table_body_style), Paragraph("Next.js 16.3.4 (React 19), Tailwind CSS v4, Lucide React, Recharts", table_body_style), Paragraph("Free / Open Source", table_body_style)],
        [Paragraph("<b>Backend / Tech Engine</b>", table_body_style), Paragraph("Python 3.10+, Flask, Pandas, NumPy", table_body_style), Paragraph("Free / Open Source", table_body_style)],
        [Paragraph("<b>Database</b>", table_body_style), Paragraph("SQLite3 (investiq.db, finsim.db) → PostgreSQL (production)", table_body_style), Paragraph("Free", table_body_style)],
        [Paragraph("<b>Stock Data</b>", table_body_style), Paragraph("yfinance (sub-2s streaming in-memory cache)", table_body_style), Paragraph("Free", table_body_style)],
        [Paragraph("<b>Full NSE Stock List</b>", table_body_style), Paragraph("NSE official equity list CSV (2,298+ equities) + Global US catalog", table_body_style), Paragraph("Free", table_body_style)],
        [Paragraph("<b>AI Explanations</b>", table_body_style), Paragraph("Groq LLM (Llama 3.1) / OpenAI-compatible API", table_body_style), Paragraph("Free tier", table_body_style)],
        [Paragraph("<b>Voice Narration</b>", table_body_style), Paragraph("Browser SpeechSynthesis API", table_body_style), Paragraph("Free, built-in", table_body_style)],
        [Paragraph("<b>Auth</b>", table_body_style), Paragraph("Flask-Login & Next.js session cookies (with mandatory Full Name)", table_body_style), Paragraph("Free", table_body_style)],
        [Paragraph("<b>Hosting</b>", table_body_style), Paragraph("Render / Railway (backend), Vercel (frontend)", table_body_style), Paragraph("Free tier", table_body_style)],
        [Paragraph("<b>Scheduler</b>", table_body_style), Paragraph("GitHub Actions / Background daemons", table_body_style), Paragraph("Free", table_body_style)],
    ]
    t_tech = Table(tech_data, colWidths=[100, 310, 94])
    t_tech.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#1e293b")),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ("BOX", (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
        ("INNERGRID", (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ("PADDING", (0,0), (-1,-1), 3),
    ]))
    story.append(t_tech)
    story.append(Spacer(1, 3))
    story.append(Paragraph("<b>Total cost to build and run at small scale: ₹0</b>", ParagraphStyle("FreeTag", fontName="Helvetica-Bold", fontSize=8.5, leading=11, textColor=colors.HexColor("#16a34a"))))
    story.append(Spacer(1, 6))

    # 6. File Structure
    story.append(Paragraph("6. Project File Structure", h1_style))
    file_tree_text = (
        "Invest_iq/\n"
        "├── app.py                  # Flask app & API reverse-proxy gateway\n"
        "├── data_provider.py        # yfinance data fetching, live/mock toggle\n"
        "├── scanner.py              # Runs technical analysis across watchlist/market\n"
        "├── indicators.py           # RSI, MACD, Bollinger, volume ratio calculations\n"
        "├── explainer.py            # Builds plain-English explanations from real numbers\n"
        "├── signal_stats.py          # Tracks and returns historical win-rate per signal type\n"
        "├── portfolio.py            # Virtual portfolio logic — buy/sell, P&L, fees, tax\n"
        "├── auth.py                 # User accounts and sessions\n"
        "├── models.py               # Database schema (users, trades, watchlists, signal history)\n"
        "├── broker_kite.py          # Zerodha Kite Connect API paper bridge\n"
        "├── build_history.py        # 2021-2026 multi-year benchmark history extractor\n"
        "├── all_monthly_history.json# 69-month institutional closing data (Nifty 50 & S&P 500)\n"
        "├── generate_pdf.py         # Automated Project Overview PDF generator\n"
        "├── Invest_IQ_Project_Overview.pdf # Generated PDF Project Overview\n"
        "│\n"
        "├── frontend/               # Next.js 16 (React 19) Full-Stack Web Application\n"
        "│   ├── src/app/            # App Router (Dashboard, Markets, Trade, Learn, Auth)\n"
        "│   ├── src/components/     # Topbar (Bell+Theme), Sidebar, NotificationsDrawer, PortfolioChart\n"
        "│   └── src/lib/            # financial-history.ts, market-api.ts, store.tsx, catalogs\n"
        "│\n"
        "├── templates/              # Flask Jinja2 templates (dashboard, screener, portfolio, report)\n"
        "├── static/                 # CSS & static assets for Flask engine\n"
        "├── tests/                  # Automated verification test suite\n"
        "└── requirements.txt        # Python package dependencies"
    )
    t_code = Table([[Paragraph(file_tree_text.replace("\n", "<br/>"), code_style)]], colWidths=[504])
    t_code.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), colors.HexColor("#f8fafc")),
        ("BOX", (0,0), (-1,-1), 1, colors.HexColor("#e2e8f0")),
        ("PADDING", (0,0), (-1,-1), 6),
    ]))
    story.append(t_code)
    story.append(Spacer(1, 6))

    # 7. Build Roadmap
    story.append(Paragraph("7. Build Roadmap & Status", h1_style))
    roadmap_data = [
        [Paragraph("Phase", table_header_style), Paragraph("Goal", table_header_style), Paragraph("Status", table_header_style)],
        [Paragraph("1", table_body_style), Paragraph("Data pipeline — fetch real historical stock data via yfinance with retry handling", table_body_style), Paragraph("✅ Completed", table_body_style)],
        [Paragraph("2", table_body_style), Paragraph("Technical indicators — RSI, MACD, Bollinger Bands, volume ratio computed and stored", table_body_style), Paragraph("✅ Completed", table_body_style)],
        [Paragraph("3", table_body_style), Paragraph("Signal detection + plain English explainer grounded in real numbers with visible disclaimer", table_body_style), Paragraph("✅ Completed", table_body_style)],
        [Paragraph("4", table_body_style), Paragraph("Virtual portfolio — buy/sell simulation with real brokerage, STT, and capital-gains tax deducted per trade", table_body_style), Paragraph("✅ Completed", table_body_style)],
        [Paragraph("5", table_body_style), Paragraph("Historical win-rate tracking per signal type, surfaced transparently next to every AI explanation", table_body_style), Paragraph("✅ Completed", table_body_style)],
        [Paragraph("6", table_body_style), Paragraph("Behavioral guardrails — loss-streak cooldown and mandatory reflection prompt after a losing trade", table_body_style), Paragraph("✅ Completed", table_body_style)],
        [Paragraph("7", table_body_style), Paragraph("Voice narration (browser SpeechSynthesis API) on explanations and reports", table_body_style), Paragraph("✅ Completed", table_body_style)],
        [Paragraph("8", table_body_style), Paragraph("Authentication — real user accounts with mandatory Full Name validation on sign-up", table_body_style), Paragraph("✅ Completed", table_body_style)],
        [Paragraph("9", table_body_style), Paragraph("Scale stock list to full market — 2,400+ securities (2,298+ NSE + 100+ Global mega-caps) with 2s live streaming", table_body_style), Paragraph("✅ Completed", table_body_style)],
        [Paragraph("10", table_body_style), Paragraph("Up-to-date Financial Overview — 69 months real institutional close data (2021–2025) and dynamic live 2026 streaming", table_body_style), Paragraph("✅ Completed", table_body_style)],
        [Paragraph("11", table_body_style), Paragraph("Interactive alerts & dark/light mode — slide-over drawer with unread tracking and Tailwind v4 theme sync", table_body_style), Paragraph("✅ Completed", table_body_style)],
        [Paragraph("12", table_body_style), Paragraph("Cloud deployment configuration (Docker, Render, Vercel, Railway) ready for staging & production", table_body_style), Paragraph("✅ Completed", table_body_style)],
    ]
    t_roadmap = Table(roadmap_data, colWidths=[40, 390, 74])
    t_roadmap.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,0), colors.HexColor("#1e293b")),
        ("ROWBACKGROUNDS", (0,1), (-1,-1), [colors.white, colors.HexColor("#f8fafc")]),
        ("BOX", (0,0), (-1,-1), 1, colors.HexColor("#cbd5e1")),
        ("INNERGRID", (0,0), (-1,-1), 0.5, colors.HexColor("#e2e8f0")),
        ("PADDING", (0,0), (-1,-1), 2.5),
    ]))
    story.append(t_roadmap)
    story.append(Spacer(1, 6))

    # 8. Legal Positioning
    story.append(Paragraph("8. Legal Positioning", h1_style))
    story.append(Paragraph(
        "Finsim AI is always framed as:<br/>"
        "• A <b>learning and simulation tool</b>, not investment advice.<br/>"
        "• Virtual money only in the core product — any future real-money connection remains fully human-approved, with no autonomous trading.<br/>"
        "• Every AI-generated signal explanation carries a clear disclaimer and its real historical win-rate — never a confident directive to 'buy' or 'sell'.<br/>"
        "• The word <b>'SIMULATION'</b> or <b>'Virtual'</b> visible directly in the UI on every relevant screen.<br/><br/>"
        "<i>This framing keeps the project outside SEBI Registered Investment Adviser (RIA) requirements, which apply to personalized real-money investment advice, not education/simulation tools.</i>",
        body_style
    ))

    # Build the document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Successfully generated {filename}")

if __name__ == "__main__":
    targets = [
        "Finsim_AI_Project_Overview.pdf",
        "Invest_IQ_Project_Overview.pdf",
        os.path.join("Project Overview", "Finsim_AI_Project_Overview.pdf"),
        os.path.join("Project Overview", "Invest_IQ_Project_Overview.pdf"),
        os.path.join("Project Folder Structure Overview", "Invest_IQ_Project_Overview.pdf"),
        os.path.join("docs", "Invest_IQ_Project_Overview.pdf"),
    ]
    for target in targets:
        build_pdf(target)
