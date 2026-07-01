export interface FundManager {
  id: string;
  name: string;
  education?: string;
  experience_years?: number;
  bio?: string;
  past_funds?: Array<{ name: string; period: string; return?: string }>;
}

export interface ETFDailySummary {
  added_count: number;
  removed_count: number;
  buy_billion?: number;
  sell_billion?: number;
  last_change_date?: string;
}

export interface ETF {
  id: string;
  code: string;
  name: string;
  type: "stock" | "bond" | "active" | "other";
  fund_company: string;
  inception_date?: string;
  nav_change_pct?: number;
  all_time_high?: number;
  market_cap_billion?: number;
  manager?: FundManager;
  today_summary?: ETFDailySummary;
}

export interface HoldingsChange {
  stock_ticker: string;
  stock_name?: string;
  change_type: "added" | "removed" | "increased" | "decreased";
  shares_before: number;
  shares_after: number;
  shares_delta: number;
  amount_billion?: number;
}

export interface ETFChanges {
  etf: ETF;
  change_date?: string;
  changes: HoldingsChange[];
}

export interface HoldingSnapshot {
  stock_ticker: string;
  stock_name?: string;
  industry?: string;
  shares: number;
  weight_pct: number;
}

export interface ETFHoldings {
  snapshot_date?: string;
  count: number;
  holdings: HoldingSnapshot[];
}

export interface CrossETFItem {
  ticker: string;
  name?: string;
  etf_count: number;
  total_amount_billion?: number;
}

export interface TopETFItem {
  etf_code: string;
  etf_name: string;
  total_amount_billion?: number;
}

export interface DashboardSummary {
  date: string;
  total_buy_billion: number;
  total_sell_billion: number;
  etf_count_buy: number;
  etf_count_sell: number;
  updated_count: number;
  total_etf_count: number;
  summary_text: string;
  top_cross_buys: CrossETFItem[];
  top_cross_sells: CrossETFItem[];
  top_etfs_buy: TopETFItem[];
  top_etfs_sell: TopETFItem[];
}

export interface Stock {
  ticker: string;
  name: string;
  industry?: string;
  sub_industry?: string;
  founding_year?: number;
  main_business?: string;
  held_by: Array<{ etf_code: string; etf_name: string; weight_pct: number }>;
}

export interface OverlapStock {
  stock_code: string;
  stock_name: string;
  etf_count: number;
  total_shares: number;
  etf_codes: string[];
}

export interface MultiETFIncrease {
  stock_code: string;
  stock_name: string;
  etf_count: number;
  total_delta: number;
  etf_codes: string[];
  increase_info: Record<string, number>;
}

export interface WeeklyNewStock {
  stock_code: string;
  stock_name: string;
  shares: number;
  date: string;
}

export interface WeeklyNewHolding {
  etf_code: string;
  etf_name: string;
  stocks: WeeklyNewStock[];
}

export interface CommonHoldings {
  analysis_date: string;
  top_overlap: OverlapStock[];
  recent_multi_etf_increases: MultiETFIncrease[];
  weekly_new_holdings: WeeklyNewHolding[];
}

export interface WeeklyManagerStock {
  stock_code: string;
  stock_name: string;
  etf_count: number;
  etf_codes: string[];
  net_shares_change: number;
  net_flow_amount: number;
}

export interface WeeklyManagerSummary {
  analysis_date: string;
  window_start_date: string;
  window_end_date: string;
  disclosed_etf_count: number;
  total_active_etf_count: number;
  disclosed_etf_codes: string[];
  weekly_net_flow_amount: number;
  consensus_buys: WeeklyManagerStock[];
  focused_buys: WeeklyManagerStock[];
  focused_sells: WeeklyManagerStock[];
  consensus_sells: WeeklyManagerStock[];
  summary_text: string;
}

export interface TurnoverStock {
  rank: number;
  stock_code: string;
  stock_name: string;
  turnover: number;
  price: number;
  change_percent: number;
  consecutive_days: number;
}

export interface TurnoverRanking {
  trade_date: string;
  total_count: number;
  rankings: TurnoverStock[];
  hot_stocks: TurnoverStock[];
}

export interface Fund {
  fund_code: string;
  fund_name: string;
  company_name: string;
  fund_type?: string;
  description?: string;
  last_disclosure_date?: string;
  added_count?: number;
  removed_count?: number;
}

export interface FundsList {
  total_count: number;
  funds: Fund[];
}

export interface MonthlyFundReport {
  analysis_date: string;
  summary_text: string;
}

export interface FundHolding {
  rank: number;
  ticker: string;
  name: string;
  shares: number;
  pct: number;
}

export interface HoldingChange {
  ticker: string;
  name: string;
  status: "新增" | "加碼" | "減碼" | "移除";
  shares_before: number;
  shares_after: number;
  shares_delta: number;
  pct_change: number;
}

export interface FundDetail {
  fund_code: string;
  fund_name: string;
  company: string;
  last_disclosure_date: string;
  top_holdings: FundHolding[];
  holding_changes: HoldingChange[];
}
