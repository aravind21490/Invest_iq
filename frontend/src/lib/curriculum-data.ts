export interface QuizQuestion {
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

export interface LessonTopic {
  id: string;
  tierId: number;
  tierTitle: string;
  title: string;
  duration: string;
  explanation: string;
  example: string;
  quiz: QuizQuestion;
}

export interface CurriculumTier {
  id: number;
  title: string;
  description: string;
  badge: string;
  topics: LessonTopic[];
}

export const CURRICULUM_TIERS: CurriculumTier[] = [
  {
    id: 1,
    title: "Absolute Basics",
    description: "Foundational mechanics of equities, company ownership, and how market auctions function.",
    badge: "Tier 1",
    topics: [
      {
        id: "t1-1",
        tierId: 1,
        tierTitle: "Absolute Basics",
        title: "What is a Stock?",
        duration: "3 min read",
        explanation:
          "A stock (or share) represents partial ownership in a public corporation. When a company needs capital to expand, build factories, or hire engineers, it can sell fractional units of itself to the public through an Initial Public Offering (IPO). Holding a share entitles you to a fractional claim on the corporation's assets and future profits.",
        example:
          "Imagine a local bakery valued at $100,000 divides its equity into 10,000 equal shares ($10 each). If you buy 500 shares for $5,000, you legally own 5% of the entire business and 5% of all net earnings it pays out as dividends.",
        quiz: {
          question: "When you buy a share of stock in a company, what are you purchasing?",
          options: [
            "A loan that the company must pay back with interest",
            "Fractional equity ownership of the company's assets and earnings",
            "A product warranty from the company's catalog",
            "A fixed government bond guarantee",
          ],
          answerIndex: 1,
          explanation:
            "Stocks represent equity ownership, not debt. You own a fractional piece of the underlying business.",
        },
      },
      {
        id: "t1-2",
        tierId: 1,
        tierTitle: "Absolute Basics",
        title: "What is the Stock Market?",
        duration: "4 min read",
        explanation:
          "The stock market is a continuous electronic auction marketplace where buyers (bidders) and sellers (askers) negotiate prices to exchange shares. It provides liquidity — meaning you can turn your shares into cash almost instantaneously during trading hours without having to find a private buyer yourself.",
        example:
          "Just like a bustling farmer's market connects fruit sellers with grocery shoppers, the stock market connects someone in Tokyo who wants to sell 100 shares of Apple with someone in New York who wants to buy them.",
        quiz: {
          question: "What primary benefit does the stock market provide to investors?",
          options: [
            "Guaranteed daily profits with zero risk",
            "High liquidity to buy or sell ownership shares quickly at fair market prices",
            "Free shares provided by the exchange",
            "Elimination of all company bankruptcy risk",
          ],
          answerIndex: 1,
          explanation:
            "Liquidity is the superpower of modern public markets: you can enter or exit investments in seconds.",
        },
      },
      {
        id: "t1-3",
        tierId: 1,
        tierTitle: "Absolute Basics",
        title: "How Shares Represent Ownership",
        duration: "3 min read",
        explanation:
          "Shareholders are the ultimate owners of a public company. As an owner, you benefit in two ways: Capital Appreciation (the share price rises because the company grows more valuable) and Dividends (cash payments directly transferred from company profits to your brokerage account).",
        example:
          "If Microsoft earns $80 billion in profit, its board of directors might choose to reinvest $50 billion into cloud data centers and distribute the remaining $30 billion directly to shareholders as a quarterly dividend check.",
        quiz: {
          question: "What are the two primary ways equity investors generate returns?",
          options: [
            "Capital appreciation and cash dividend distributions",
            "Bank interest and lottery bonuses",
            "Tax refunds and crypto airdrops",
            "Employment salary and employee discounts",
          ],
          answerIndex: 0,
          explanation:
            "Capital appreciation (share price growth) and dividends (profit distributions) form the total return of equity investing.",
        },
      },
      {
        id: "t1-4",
        tierId: 1,
        tierTitle: "Absolute Basics",
        title: "What is a Stock Exchange?",
        duration: "4 min read",
        explanation:
          "A stock exchange (such as the New York Stock Exchange, NASDAQ, London Stock Exchange, or National Stock Exchange of India) is the regulated technological infrastructure hosting the market. Exchanges set strict listing standards, prevent fraud, record all transaction records, and ensure guaranteed trade settlement.",
        example:
          "The NYSE is famous for its historic Wall Street trading floor and blue-chip industrial companies, whereas NASDAQ was built entirely electronically from day one and became the home for technological innovators like Apple, Microsoft, and Nvidia.",
        quiz: {
          question: "Which of the following describes the role of a stock exchange?",
          options: [
            "It gives investment advice to individual retail traders",
            "It sets the price of every stock manually each morning",
            "It provides the regulated, secure trading infrastructure that matches buyer and seller orders",
            "It loans money to traders at high interest rates",
          ],
          answerIndex: 2,
          explanation:
            "Exchanges are neutral, strictly regulated platforms that match orders and ensure transparent execution.",
        },
      },
      {
        id: "t1-5",
        tierId: 1,
        tierTitle: "Absolute Basics",
        title: "What Moves Prices? (Supply & Demand)",
        duration: "4 min read",
        explanation:
          "At every second, stock prices move purely based on the balance between buyers and sellers. If more people want to buy a stock than sell it, buyers must bid higher prices to entice sellers to let go of their shares. Factors that trigger demand include strong quarterly earnings, new product innovations, economic growth, or declining interest rates.",
        example:
          "When Nvidia announced quarterly revenue that doubled Wall Street expectations due to surging AI chip demand, millions of eager buyers rushed in simultaneously. Because existing owners refused to sell cheaply, the price jumped 15% overnight.",
        quiz: {
          question: "What causes a stock price to increase in an open market?",
          options: [
            "Government regulations mandate a fixed price hike",
            "Demand from buyers exceeds the available supply from sellers at the current price",
            "The company prints more paper certificates",
            "The CEO requests a higher price from the exchange",
          ],
          answerIndex: 1,
          explanation:
            "When buyer demand outstrips seller supply, buyers must bid higher to transact, driving the market price upward.",
        },
      },
    ],
  },
  {
    id: 2,
    title: "Getting Started",
    description: "Order execution mechanics, spreads, brokerage accounts, and risk-return trade-offs.",
    badge: "Tier 2",
    topics: [
      {
        id: "t2-1",
        tierId: 2,
        tierTitle: "Getting Started",
        title: "Market vs. Limit Orders",
        duration: "4 min read",
        explanation:
          "A **Market Order** prioritizes speed of execution: it tells your broker 'Buy this immediately at whatever the best price currently is.' A **Limit Order** prioritizes price control: 'Only buy this if the price is at or below $150.' With limit orders, you never pay more than you planned, but if the market never dips to your price, your order won't execute.",
        example:
          "If Tesla is trading at $210 and you place a Market Buy order, you will buy immediately at ~$210.05. If you place a Limit Buy at $205, your order will sit waiting until someone is willing to sell to you at $205.",
        quiz: {
          question: "When should a trader choose a Limit Order over a Market Order?",
          options: [
            "When they need guaranteed immediate execution regardless of price",
            "When they want to strictly protect against overpaying and only buy at a specific maximum price",
            "When the market is closed on the weekend",
            "When they want to buy shares with no money",
          ],
          answerIndex: 1,
          explanation:
            "Limit orders give you full control over execution price, protecting you from unexpected price spikes or slippage.",
        },
      },
      {
        id: "t2-2",
        tierId: 2,
        tierTitle: "Getting Started",
        title: "The Bid-Ask Spread",
        duration: "3 min read",
        explanation:
          "The **Bid** is the highest price a buyer is currently willing to pay. The **Ask** is the lowest price a seller is willing to accept. The difference between the two is the **Spread**. Highly liquid NSE mega-caps (like Reliance or TCS) have a spread of just 5-10 paise, whereas small or rarely-traded stocks can have wider spreads that represent hidden transaction costs.",
        example:
          "If RELIANCE has a Bid of ₹1,274.00 and an Ask of ₹1,274.05, the spread is ₹0.05 (5 paise). If you buy at ₹1,274.05 and sell immediately, you lose 5 paise per share.",
        quiz: {
          question: "What is the 'Bid-Ask Spread' in stock trading?",
          options: [
            "The commission fee your broker charges per month",
            "The difference between the highest price a buyer offers and the lowest price a seller asks",
            "The annual return of the S&P 500",
            "The tax owed on capital gains",
          ],
          answerIndex: 1,
          explanation:
            "The spread is the gap between bid and ask, acting as the immediate cost of liquidity in any market.",
        },
      },
      {
        id: "t2-3",
        tierId: 2,
        tierTitle: "Getting Started",
        title: "Brokerage Accounts (Cash vs. Margin)",
        duration: "4 min read",
        explanation:
          "A brokerage acts as your licensed gateway to the stock exchange. In a **Cash Account**, you can only trade using money you have personally deposited. In a **Margin Account**, the broker lends you additional money using your existing stocks as collateral. While margin increases buying power, it introduces the danger of debt and liquidation calls.",
        example:
          "With $10,000 in a Cash Account, you can buy exactly $10,000 of stock. In a 2x Margin Account, you could purchase $20,000 of stock, doubling both your potential profits and potential losses.",
        quiz: {
          question: "What is the key difference between a cash account and a margin account?",
          options: [
            "Cash accounts require physical dollar bills mailed to the exchange",
            "Margin accounts allow you to borrow money from the broker to buy securities",
            "Cash accounts are only available to accredited billionaires",
            "Margin accounts guarantee you can never lose capital",
          ],
          answerIndex: 1,
          explanation:
            "Margin accounts involve borrowing leverage from your broker, which amplifies both upside and downside risk.",
        },
      },
      {
        id: "t2-4",
        tierId: 2,
        tierTitle: "Getting Started",
        title: "Diversification: Protecting Your Portfolio",
        duration: "4 min read",
        explanation:
          "Diversification is the practice of spreading your capital across multiple different companies, sectors, and asset classes. As the legendary financial adage states: 'Don't put all your eggs in one basket.' If one company suffers a surprise scandal or bankruptcy, a diversified portfolio barely notices the impact.",
        example:
          "If you invest 100% of your savings into a single biotech firm and its drug fails clinical trials, you could lose 80% overnight. If you own 30 companies across technology, healthcare, financials, and energy, a single failure barely moves your total balance.",
        quiz: {
          question: "Why is portfolio diversification considered essential for long-term investors?",
          options: [
            "It guarantees that every stock you own will make a profit",
            "It reduces company-specific risk so no single catastrophe destroys your total savings",
            "It exempts you from paying federal taxes on trading",
            "It allows you to trade when markets are closed",
          ],
          answerIndex: 1,
          explanation:
            "Diversification protects against idiosyncratic risk (single-company failure) while capturing broad market growth.",
        },
      },
      {
        id: "t2-5",
        tierId: 2,
        tierTitle: "Getting Started",
        title: "Risk vs. Reward Relationship",
        duration: "3 min read",
        explanation:
          "In finance, there is no free lunch: higher potential returns always demand accepting higher potential volatility and risk of loss. Government treasury bonds offer virtually guaranteed returns but low yields (~4-5%). Equities offer higher historic growth (~10% annualized) in exchange for enduring terrifying 20-30% bear market drops.",
        example:
          "A speculative startup penny stock might promise 10x returns in a month, but has an 80% chance of going to zero. A blue-chip index fund offers moderate 8-10% steady long-term compounding with massive resilience.",
        quiz: {
          question: "What is the fundamental relationship between risk and reward in financial markets?",
          options: [
            "Low-risk investments consistently produce the highest returns",
            "Higher potential investment returns require accepting greater risk and price fluctuation",
            "Risk can be completely eliminated by trading faster",
            "All assets have identical risk levels set by the SEC",
          ],
          answerIndex: 1,
          explanation:
            "Risk and return are directly correlated: you cannot chase extraordinary returns without accepting proportionate downside risk.",
        },
      },
    ],
  },
  {
    id: 3,
    title: "Reading the Market",
    description: "Candlestick charts, trading volume, market capitalization, and core valuation metrics.",
    badge: "Tier 3",
    topics: [
      {
        id: "t3-1",
        tierId: 3,
        tierTitle: "Reading the Market",
        title: "Reading a Stock Chart",
        duration: "4 min read",
        explanation:
          "A stock chart visualizes price history over time. The horizontal axis (X-axis) shows time (minutes, days, months), while the vertical axis (Y-axis) shows price. Recognizing whether a stock is in an **Uptrend** (higher highs and higher lows) or a **Downtrend** (lower highs and lower lows) is the first step of market literacy.",
        example:
          "Looking at a 1-year chart of Microsoft, you notice that every time the price pulls back to $400, buyers consistently step in and push it to new highs. $400 serves as a technical 'Support' level.",
        quiz: {
          question: "What defines a classic technical 'Uptrend' on a stock chart?",
          options: [
            "Prices making consistently lower highs and lower lows",
            "Prices oscillating sideways within a narrow flat channel",
            "A sequential series of higher swing highs and higher swing lows",
            "The stock trading at a constant flat horizontal line",
          ],
          answerIndex: 2,
          explanation:
            "An uptrend is characterized by successive higher peaks (highs) and higher troughs (lows).",
        },
      },
      {
        id: "t3-2",
        tierId: 3,
        tierTitle: "Reading the Market",
        title: "Candlestick Anatomy",
        duration: "4 min read",
        explanation:
          "Invented by 18th-century Japanese rice merchants, candlesticks pack four critical data points into one visual bar: **Open, High, Low, and Close (OHLC)**. The thick 'body' shows the range between Open and Close. Thin vertical lines ('wicks' or 'shadows') show the extreme High and Low reached during that timeframe. Green indicates the price closed higher than it opened; Red indicates it closed lower.",
        example:
          "If Apple opens at $220, dips to $218, rallies up to $226, and closes at $225, you see a tall green body from $220 to $225 with a lower wick touching $218 and an upper wick touching $226.",
        quiz: {
          question: "On a standard green candlestick bar, where is the Closing price located?",
          options: [
            "At the bottom tip of the lower wick",
            "At the top of the solid candle body",
            "At the exact midpoint of the candle",
            "At the bottom of the solid candle body",
          ],
          answerIndex: 1,
          explanation:
            "On a green (bullish) candlestick, the bottom of the body is the Open and the top of the body is the Close.",
        },
      },
      {
        id: "t3-3",
        tierId: 3,
        tierTitle: "Reading the Market",
        title: "Trading Volume: Conviction Indicator",
        duration: "4 min read",
        explanation:
          "Volume measures the total number of shares bought and sold during a given period. It represents market conviction. A 3% price breakout accompanied by **3x average daily volume** indicates large institutional hedge funds and mutual funds are aggressively accumulating. Conversely, a price move on tiny volume is prone to sudden reversal.",
        example:
          "If stock XYZ breaks above its 52-week high of $100 on 50 million shares (normal is 5 million), institutions are voting with their wallets. The breakout has high conviction.",
        quiz: {
          question: "Why do traders analyze trading volume alongside price movements?",
          options: [
            "Volume determines the tax rate on the transaction",
            "Volume reveals the level of participation and conviction behind a price movement",
            "Volume tells you the exact name of who is buying",
            "Volume predicts the exact dividend payment date",
          ],
          answerIndex: 1,
          explanation:
            "Volume confirms trends: strong price moves accompanied by high volume show institutional sponsorship.",
        },
      },
      {
        id: "t3-4",
        tierId: 3,
        tierTitle: "Reading the Market",
        title: "Market Capitalization Categories",
        duration: "3 min read",
        explanation:
          "Market Capitalization ('Market Cap') is the total dollar market value of a company's outstanding shares, calculated as: `Share Price × Total Outstanding Shares`. Categories include: **Mega-Cap** ($200B+ like Apple, Microsoft), **Large-Cap** ($10B - $200B), **Mid-Cap** ($2B - $10B), and **Small-Cap** ($300M - $2B). Large companies are generally stabler; smaller companies offer faster growth potential with higher volatility.",
        example:
          "If a company has 1 billion shares trading at $50 each, its market cap is $50 billion (a solid Large-Cap).",
        quiz: {
          question: "How is a company's Market Capitalization calculated?",
          options: [
            "Annual revenue divided by net income",
            "Current stock price multiplied by the total number of shares outstanding",
            "Total cash in the company bank account",
            "The total number of employees multiplied by average salary",
          ],
          answerIndex: 1,
          explanation:
            "Market Cap = Current Share Price × Total Number of Outstanding Shares.",
        },
      },
      {
        id: "t3-5",
        tierId: 3,
        tierTitle: "Reading the Market",
        title: "P/E Ratio and Valuation Basics",
        duration: "5 min read",
        explanation:
          "The Price-to-Earnings (P/E) ratio compares a company's share price to its annual earnings per share (EPS). It answers: 'How many dollars are investors willing to pay for $1 of current corporate profit?' A mature utility company might trade at 15x earnings, whereas an ultra-high-growth AI company might trade at 50x earnings because investors anticipate massive profit surges.",
        example:
          "If a stock trades at $100 and earns $5 per share annually, its P/E is 20 ($100 / $5). Investors are paying 20 times current earnings to own the stock.",
        quiz: {
          question: "If a company trades at $60 per share and reports annual earnings of $3 per share, what is its P/E ratio?",
          options: ["180", "20", "5", "0.05"],
          answerIndex: 1,
          explanation:
            "P/E = Share Price / Earnings Per Share = $60 / $3 = 20.",
        },
      },
    ],
  },
  {
    id: 4,
    title: "Technical & Fundamental Analysis",
    description: "RSI, Moving Averages, MACD momentum, earnings statements, and sector correlation.",
    badge: "Tier 4",
    topics: [
      {
        id: "t4-1",
        tierId: 4,
        tierTitle: "Technical & Fundamental",
        title: "RSI (Relative Strength Index) Explained",
        duration: "5 min read",
        explanation:
          "RSI is a momentum oscillator measured on a scale of 0 to 100. By comparing the magnitude of recent gains to recent losses over a 14-day window: **RSI > 70** indicates an 'Overbought' condition (buyers may be exhausted, pullback likely). **RSI < 30** indicates an 'Oversold' condition (panic selling may have pushed prices below fair value, bounce possible).",
        example:
          "After bad news, Alphabet plunges 8 days in a row. Its 14-day RSI drops to 24 (deeply oversold). Contrarian value buyers step in, triggering a 5% relief rally.",
        quiz: {
          question: "What is typically indicated when a stock's 14-day RSI drops below 30?",
          options: [
            "The stock is overbought and guaranteed to crash",
            "The company is entering immediate liquidation bankruptcy",
            "The stock is in oversold territory where selling pressure may be approaching exhaustion",
            "The stock exchange will suspend trading",
          ],
          answerIndex: 2,
          explanation:
            "An RSI under 30 signifies oversold conditions, often signaling that sellers are overextended.",
        },
      },
      {
        id: "t4-2",
        tierId: 4,
        tierTitle: "Technical & Fundamental",
        title: "Moving Averages: 50-Day & 200-Day",
        duration: "4 min read",
        explanation:
          "A Simple Moving Average (SMA) smooths out noisy day-to-day fluctuations by calculating the average closing price over a set period. The **50-day SMA** tracks intermediate trend; the **200-day SMA** tracks long-term institutional trend. When the 50-day crosses ABOVE the 200-day, it's called a **Golden Cross** (bullish signal). When it crosses BELOW, it's a **Death Cross** (bearish warning).",
        example:
          "During a strong bull market, whenever Apple pulls back to its rising 50-day moving average, institutional algorithms automatically buy, using the line as dynamic support.",
        quiz: {
          question: "What technical pattern occurs when the 50-day moving average crosses above the 200-day moving average?",
          options: ["Death Cross", "Head and Shoulders", "Golden Cross", "Bear Flag"],
          answerIndex: 2,
          explanation:
            "A Golden Cross is a classic long-term bullish indicator signaling shifting momentum to the upside.",
        },
      },
      {
        id: "t4-3",
        tierId: 4,
        tierTitle: "Technical & Fundamental",
        title: "MACD: Momentum & Trend Direction",
        duration: "5 min read",
        explanation:
          "The Moving Average Convergence Divergence (MACD) indicator tracks the relationship between two exponential moving averages (typically the 12-day and 26-day EMA). When the fast MACD line crosses above the slower 9-day Signal line, momentum is turning positive. The histogram visually displays the expanding or shrinking distance between the two lines.",
        example:
          "If a stock has been slowly drifting lower, but the MACD line starts curling upward and crosses above its signal line, momentum traders interpret this as an early signal that buyers are retaking control.",
        quiz: {
          question: "What generates a bullish signal on the standard MACD indicator?",
          options: [
            "The MACD line crossing below the zero line",
            "The MACD line crossing above the Signal line",
            "Trading volume dropping to zero",
            "The P/E ratio reaching 100",
          ],
          answerIndex: 1,
          explanation:
            "A bullish MACD crossover occurs when the faster MACD line rises above the slower Signal line.",
        },
      },
      {
        id: "t4-4",
        tierId: 4,
        tierTitle: "Technical & Fundamental",
        title: "Reading Quarterly Earnings Reports",
        duration: "5 min read",
        explanation:
          "Public companies must report financial results every 90 days (10-Q filing). Three numbers dominate Wall Street: **Revenue (Top Line)**, **Earnings Per Share / EPS (Bottom Line)**, and **Forward Guidance** (the CEO's projection for upcoming quarters). Often, a company can beat revenue and earnings, but if forward guidance is lowered, the stock will drop.",
        example:
          "Amazon reports $150 billion in quarterly revenue (beating estimates), but warns that holiday cloud computing growth will slow to 8%. Investors re-price future earnings, causing a 4% after-hours dip.",
        quiz: {
          question: "Why might a stock fall immediately after reporting record-high quarterly profits?",
          options: [
            "Because profits are illegal in public markets",
            "Because the company's future forward guidance for upcoming quarters disappointed Wall Street forecasts",
            "Because higher profits automatically increase debt",
            "Because shareholders are forced to return their dividends",
          ],
          answerIndex: 1,
          explanation:
            "Markets trade on the future, not the past. Weak forward guidance frequently overshadows past record profits.",
        },
      },
      {
        id: "t4-5",
        tierId: 4,
        tierTitle: "Technical & Fundamental",
        title: "Sectors & Market Correlations",
        duration: "4 min read",
        explanation:
          "The market is divided into 11 Global Industry Classification Standard (GICS) sectors: Technology, Healthcare, Financials, Consumer Discretionary, Consumer Staples, Energy, Utilities, Real Estate, Materials, Industrials, and Communication Services. Different sectors thrive in different economic climates: Tech thrives in low-rate expansion; Utilities and Staples defend in recessions.",
        example:
          "When interest rates rise rapidly, high-growth Tech stocks may face valuation compression, while Financials (banks) often benefit from higher net interest margins.",
        quiz: {
          question: "Which sector is traditionally considered 'Defensive' during economic downturns?",
          options: [
            "Consumer Staples (everyday groceries, hygiene, utilities)",
            "Speculative Semiconductor Startups",
            "Luxury Sports Car Manufacturers",
            "Cryptocurrency Mining Hardware",
          ],
          answerIndex: 0,
          explanation:
            "Consumer Staples provide non-cyclical necessities that households must purchase regardless of economic health.",
        },
      },
    ],
  },
  {
    id: 5,
    title: "Strategy & Risk Management",
    description: "Position sizing, stop-loss discipline, dollar-cost averaging, and overcoming psychological biases.",
    badge: "Tier 5",
    topics: [
      {
        id: "t5-1",
        tierId: 5,
        tierTitle: "Strategy & Risk",
        title: "The 1-2% Position Sizing Rule",
        duration: "4 min read",
        explanation:
          "Professional risk management is defined by one golden rule: **Never risk more than 1% to 2% of your total portfolio equity on any single trade**. Risk does not mean position size; it means the dollar amount you will lose if your stop-loss is hit. By limiting loss to 1%, you can endure 10 consecutive losing trades and still retain 90% of your capital.",
        example:
          "On a $100,000 paper portfolio, a 1% risk budget is $1,000. If you buy a stock at $50 with a stop-loss at $45 (a $5 risk per share), you can buy at most 200 shares ($1,000 / $5).",
        quiz: {
          question: "On a $50,000 account, if you adhere to a strict 2% maximum risk rule per trade, what is the maximum dollar loss you can accept on a trade?",
          options: ["$10,000", "$1,000", "$5,000", "$250"],
          answerIndex: 1,
          explanation:
            "2% of $50,000 = $1,000 maximum allowable loss on that trade.",
        },
      },
      {
        id: "t5-2",
        tierId: 5,
        tierTitle: "Strategy & Risk",
        title: "Stop-Losses & Take-Profit Orders",
        duration: "4 min read",
        explanation:
          "A Stop-Loss order is an automated instruction that sells your position if the price falls to a predetermined level, removing emotional hesitation. A Take-Profit order locks in gains when your upside target is reached. Planning your exact exit points BEFORE entering a trade eliminates emotional panic during turbulent market hours.",
        example:
          "You buy NVDA at $220. You set a Stop-Loss at $210 (risking $10) and a Take-Profit limit at $250 (targeting $30 gain). Your risk-to-reward ratio is a healthy 1:3.",
        quiz: {
          question: "What is the primary psychological benefit of setting an automated stop-loss order upon entry?",
          options: [
            "It guarantees that you will always sell at the absolute market peak",
            "It pre-commits your trade discipline and removes emotional panic when the market moves against you",
            "It forces the broker to pay for your losses",
            "It prevents anyone else from trading that ticker",
          ],
          answerIndex: 1,
          explanation:
            "Stop-losses enforce mechanical discipline, preventing devastating catastrophic drawdowns caused by stubborn hope.",
        },
      },
      {
        id: "t5-3",
        tierId: 5,
        tierTitle: "Strategy & Risk",
        title: "Dollar-Cost Averaging (DCA)",
        duration: "4 min read",
        explanation:
          "Dollar-Cost Averaging is an investment strategy where you allocate a fixed dollar amount into an asset at regular calendar intervals (e.g. $500 on the 1st of every month), regardless of market price. When prices drop, your $500 buys more shares; when prices rise, it buys fewer shares, naturally lowering your average cost basis over time.",
        example:
          "Instead of trying to predict the exact bottom of a recession, an investor invests $1,000 into an S&P 500 index fund on the 15th of every month across 10 years, smoothing out all market volatility.",
        quiz: {
          question: "How does Dollar-Cost Averaging (DCA) benefit long-term investors?",
          options: [
            "It eliminates the impossible need to time market tops and bottoms by systematically investing a fixed sum",
            "It promises zero volatility in portfolio balance",
            "It doubles your cash balance every quarter",
            "It only buys when stocks are at all-time highs",
          ],
          answerIndex: 0,
          explanation:
            "DCA removes emotional market-timing stress and capitalizes on pullbacks by automatically buying more units at lower prices.",
        },
      },
      {
        id: "t5-4",
        tierId: 5,
        tierTitle: "Strategy & Risk",
        title: "Psychological Biases: FOMO & Revenge Trading",
        duration: "5 min read",
        explanation:
          "The greatest danger in trading is human psychology. **FOMO (Fear Of Missing Out)** compels beginners to buy stocks that have already surged 200% right into the trap of institutional profit-taking. **Revenge Trading** occurs after taking a painful loss, where an investor doubles position size aggressively to 'make the money back quickly' — almost always leading to complete account blowout.",
        example:
          "After losing $500 on an erratic trade, a trader immediately enters an oversized options contract with no plan just to recover the loss before the market closes. The contract expires worthless, tripling the day's loss.",
        quiz: {
          question: "What is 'Revenge Trading' in behavioral finance?",
          options: [
            "Suing a broker for charging execution fees",
            "Impulsively opening oversized, undisciplined trades immediately after a loss to try to recoup capital quickly",
            "Shorting companies that treat their employees poorly",
            "Trading stocks exclusively during earnings announcements",
          ],
          answerIndex: 1,
          explanation:
            "Revenge trading is an emotional reaction to losses that abandons risk management and frequently causes severe capital destruction.",
        },
      },
      {
        id: "t5-5",
        tierId: 5,
        tierTitle: "Strategy & Risk",
        title: "The Risk-to-Reward Ratio (Asymmetry)",
        duration: "4 min read",
        explanation:
          "You don't need to be right all the time to be profitable in markets. If your average trade has a **1:3 Risk-to-Reward ratio** (risking $100 to make $300), you can be WRONG 60% of the time and still be consistently profitable. Over 10 trades: 6 losses × $100 = -$600; 4 wins × $300 = +$1,200. Net Profit: +$600.",
        example:
          "A disciplined trader with a 40% win rate generates substantial net wealth simply because their winners are 3x larger than their tightly cut losers.",
        quiz: {
          question: "With a 1:3 Risk-to-Reward ratio, can a trader remain profitable with a 40% win rate?",
          options: [
            "No, you must win at least 70% of trades to ever be profitable",
            "Yes, because the aggregate gains from winning trades far outweigh the small controlled losses",
            "Only if the stock pays a monthly dividend",
            "Only on the first trading day of the year",
          ],
          answerIndex: 1,
          explanation:
            "Positive expectancy is built on asymmetrical payouts: keeping losses small and letting winners run.",
        },
      },
    ],
  },
  {
    id: 6,
    title: "Advanced Concepts",
    description: "Options derivatives, short selling mechanics, margin leverage, and critical risk warnings.",
    badge: "Tier 6",
    topics: [
      {
        id: "t6-1",
        tierId: 6,
        tierTitle: "Advanced Concepts",
        title: "Options Basics: Calls and Puts",
        duration: "5 min read",
        explanation:
          "Options are derivative contracts granting the buyer the *right*, but not the obligation, to buy (**Call Option**) or sell (**Put Option**) 100 shares of an underlying stock at an agreed price (**Strike Price**) prior to an expiration date. Buyers pay a non-refundable cash fee (**Premium**). If the stock fails to move past the strike before expiration, the option expires completely worthless.",
        example:
          "You pay a $3 premium ($300 total) for a Call Option on Apple with a $230 strike expiring next month when Apple is at $225. If Apple surges to $245, your contract is worth at least $1,500. If Apple stays at $225, your contract expires at $0.",
        quiz: {
          question: "What right does buying a Call Option give the contract holder?",
          options: [
            "The right to sell 100 shares at the strike price",
            "The right to buy 100 shares of the underlying stock at the strike price before expiration",
            "The right to vote on the company board of directors",
            "The right to collect the CEO's quarterly bonus",
          ],
          answerIndex: 1,
          explanation:
            "A Call gives the right to BUY at the strike; a Put gives the right to SELL at the strike.",
        },
      },
      {
        id: "t6-2",
        tierId: 6,
        tierTitle: "Advanced Concepts",
        title: "Short Selling Mechanics & Unlimited Risk",
        duration: "5 min read",
        explanation:
          "Short selling allows traders to profit from falling prices. You borrow shares from your broker and immediately sell them on the open market. Later, you hope to buy them back at a cheaper price (**Covering**) and return the borrowed shares, pocketing the difference. **CRITICAL RISK**: When you buy a stock, your loss is capped at 100% (price drops to zero). When you short a stock, the price can theoretically rise infinitely, meaning your potential loss is mathematically unlimited.",
        example:
          "You borrow and short 100 shares of a stock at $50, receiving $5,000. If it drops to $30, you buy them back for $3,000, returning the shares and pocketing a $2,000 profit. But if it rockets to $300 in a short squeeze, you must pay $30,000 to buy them back — losing $25,000 on a $5,000 trade.",
        quiz: {
          question: "Why is short selling considered significantly riskier than buying standard long shares?",
          options: [
            "Because short positions are not allowed to be held overnight",
            "Because a stock's price can theoretically rise without limit, exposing the short seller to unlimited potential loss",
            "Because short sellers must pay the company's electricity bill",
            "Because dividends are doubled automatically",
          ],
          answerIndex: 1,
          explanation:
            "A stock cannot drop below $0, but it can rise infinitely. Short sellers face theoretically uncapped loss potential.",
        },
      },
      {
        id: "t6-3",
        tierId: 6,
        tierTitle: "Advanced Concepts",
        title: "Margin Leverage & The Dreaded Margin Call",
        duration: "5 min read",
        explanation:
          "Margin trading involves borrowing funds from your broker to purchase more securities than your cash balance allows. If your account equity falls below the broker's minimum maintenance threshold (usually 25-30% of total position value), the broker issues a **Margin Call**: you must deposit more cash immediately, or the broker will forcibly liquidate your stocks at the absolute worst possible bottom.",
        example:
          "You deposit $10,000 and borrow $10,000 on margin to buy $20,000 of stock. If the stock drops 25% (total value becomes $15,000), your equity drops from $10,000 to $5,000 (a 50% loss of your personal capital). The broker issues a margin call to protect their $10,000 loan.",
        quiz: {
          question: "What occurs when an investor receives a 'Margin Call' from their broker?",
          options: [
            "The broker deposits free bonus money into the account",
            "The investor is invited to the exchange annual dinner",
            "The investor must immediately deposit additional cash or collateral, or face forced liquidation of their holdings",
            "The investor's account is permanently deleted",
          ],
          answerIndex: 2,
          explanation:
            "A margin call demands immediate capital injection to meet maintenance equity requirements before forced liquidation occurs.",
        },
      },
    ],
  },
];
