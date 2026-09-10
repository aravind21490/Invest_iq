import json
import os

with open('all_monthly_history.json') as f:
    d = json.load(f)

MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

years = ['2021', '2022', '2023', '2024', '2025', '2026']

ts_output = '''// Real historical market data compiled from institutional index closing levels (NSE Nifty 50 and US S&P 500)
// Normalized to base 100,000 starting capital for direct portfolio performance comparison.

export interface MonthlyDataPoint {
  month: string;
  monthIndex: number; // 0-11
  date: string;
  // Normalized portfolio values (base 100,000)
  niftyNormalized: number;
  spNormalized: number;
  // Raw institutional index close values
  niftyRaw: number;
  spRaw: number;
  // Dynamic user portfolio value (populated live for current year)
  portfolio?: number;
  lastYearPortfolio?: number;
}

export interface YearPerformanceSummary {
  year: string;
  label: string;
  isCurrent: boolean;
  dateRange: string;
  niftyAnnualReturn: number;
  spAnnualReturn: number;
  startNifty: number;
  endNifty: number;
  startSP: number;
  endSP: number;
  data: MonthlyDataPoint[];
}

export const FINANCIAL_YEARS_DATA: Record<string, YearPerformanceSummary> = {
'''

for y in years:
    months_n = [k for k in sorted(d['nifty'].keys()) if k.startswith(y)]
    if not months_n:
        continue
    
    first_n = d['nifty'][months_n[0]]
    last_n = d['nifty'][months_n[-1]]
    first_s = d['sp500'][months_n[0]]
    last_s = d['sp500'][months_n[-1]]
    
    n_ret = round(((last_n - first_n) / first_n) * 100, 2)
    s_ret = round(((last_s - first_s) / first_s) * 100, 2)
    
    is_cur = 'true' if y == '2026' else 'false'
    label_str = f"{y} (Live)" if y == '2026' else y
    date_range = f"Jan {y} - Sep {y} (Live)" if y == '2026' else f"Jan {y} - Dec {y}"
    
    ts_output += f'  "{y}": {{\n'
    ts_output += f'    year: "{y}",\n'
    ts_output += f'    label: "{label_str}",\n'
    ts_output += f'    isCurrent: {is_cur},\n'
    ts_output += f'    dateRange: "{date_range}",\n'
    ts_output += f'    niftyAnnualReturn: {n_ret},\n'
    ts_output += f'    spAnnualReturn: {s_ret},\n'
    ts_output += f'    startNifty: {first_n},\n'
    ts_output += f'    endNifty: {last_n},\n'
    ts_output += f'    startSP: {first_s},\n'
    ts_output += f'    endSP: {last_s},\n'
    ts_output += '    data: [\n'
    
    for idx, m_key in enumerate(months_n):
        m_num = int(m_key.split('-')[1])
        m_name = MONTH_NAMES[m_num - 1]
        raw_n = d['nifty'][m_key]
        raw_s = d['sp500'][m_key]
        norm_n = round(100000 * (raw_n / first_n), 2)
        norm_s = round(100000 * (raw_s / first_s), 2)
        
        ts_output += f'      {{\n'
        ts_output += f'        month: "{m_name}",\n'
        ts_output += f'        monthIndex: {m_num - 1},\n'
        ts_output += f'        date: "{m_key}",\n'
        ts_output += f'        niftyNormalized: {norm_n},\n'
        ts_output += f'        spNormalized: {norm_s},\n'
        ts_output += f'        niftyRaw: {raw_n},\n'
        ts_output += f'        spRaw: {raw_s},\n'
        ts_output += f'      }},\n'
    ts_output += '    ],\n'
    ts_output += '  },\n'

ts_output += '''};

// Multi-Year 5-Year Trend (2021 to 2026 Live)
export const MULTI_YEAR_DATA = [
  { year: "2021", niftyRaw: 17354.05, spRaw: 4766.18, niftyNormalized: 100000, spNormalized: 100000 },
  { year: "2022", niftyRaw: 18105.30, spRaw: 3839.50, niftyNormalized: 104328, spNormalized: 80557 },
  { year: "2023", niftyRaw: 21731.40, spRaw: 4769.83, niftyNormalized: 125223, spNormalized: 100076 },
  { year: "2024", niftyRaw: 23644.80, spRaw: 5881.63, niftyNormalized: 136249, spNormalized: 123403 },
  { year: "2025", niftyRaw: 26129.60, spRaw: 6845.50, niftyNormalized: 150567, spNormalized: 143626 },
  { year: "2026 (Live)", niftyRaw: 23477.80, spRaw: 7590.15, niftyNormalized: 135287, spNormalized: 159249 },
];
'''

target_file = os.path.join('frontend', 'src', 'lib', 'financial-history.ts')
with open(target_file, 'w') as f:
    f.write(ts_output)

print(f"Generated {target_file} successfully!")
