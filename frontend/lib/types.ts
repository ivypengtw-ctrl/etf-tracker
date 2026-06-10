export interface FundManager {
  id: string;
  name: string;
  education?: string;
  experience_years?: number;
  bio?: string;
  past_funds?: Array<{ name: string; period: string; return?: string }>;
}

export interface ETF {
  id: string;
  code: string;
  name: string;
  type: "stock" | "bond" | "other";
  fund_company: string;
  inception_date?: string;
  manager?: FundManager;
}

export interface HoldingsChange {
  stock_ticker: string;
  change_type: "added" | "removed" | "increased" | "decreased";
  shares_before: number;
  shares_after: number;
  shares_delta: number;
  amount_billion?: number;
}

export interface ETFChanges {
  etf: ETF;
  change_date: string;
  changes: HoldingsChange[];
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
