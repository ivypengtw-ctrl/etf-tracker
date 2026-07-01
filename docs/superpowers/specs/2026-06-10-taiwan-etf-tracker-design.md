# 台灣 ETF 異動追蹤網站 — 設計文件

**日期：** 2026-06-10  
**狀態：** 已核准  

---

## 一、專案目標

建立一個公開上線的網站，每日自動爬取台灣所有 ETF 的成分股資料，呈現加倉／減倉的張數變化，並提供基金經理人背景與個股產業分析。

---

## 二、技術棧

| 層級 | 技術 |
|------|------|
| 後端 API | Python 3.12 + FastAPI |
| 排程／爬蟲 | APScheduler + requests + BeautifulSoup（動態頁面用 Playwright） |
| 資料庫 | PostgreSQL |
| ORM | SQLAlchemy + Alembic（migrations） |
| 前端 | Next.js 14（App Router）+ TypeScript |
| 圖表 | Recharts |
| 部署 | Render（後端）+ Vercel（前端） |

---

## 三、系統架構

```
排程器 (APScheduler)
  ├── 每日 18:30 → ETF 成分股爬蟲群
  ├── 每週日 02:00 → 個股基本資料爬蟲
  └── 每月 1 日 02:00 → 經理人資料爬蟲
        │
        ▼
  差異引擎 (今日快照 vs 昨日快照 → holdings_changes)
        │
        ▼
  警報服務 (檢查門檻 → Email / LINE Notify)
        │
        ▼
  PostgreSQL
        │
        ▼
  FastAPI REST API
        │
        ▼
  Next.js 前端 (SSR)
```

---

## 四、資料庫 Schema

### `etfs`
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| code | VARCHAR(10) | ETF 代碼（如 00981A） |
| name | VARCHAR(100) | ETF 中文名稱 |
| type | ENUM | 股票型 / 債券型 / 其他 |
| fund_company | VARCHAR(50) | 投信公司名稱 |
| manager_id | UUID | FK → fund_managers |
| inception_date | DATE | 成立日期 |
| updated_at | TIMESTAMP | 最後更新時間 |

### `fund_managers`
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| name | VARCHAR(50) | 姓名 |
| education | TEXT | 學歷背景 |
| experience_years | INT | 年資 |
| bio | TEXT | 簡介（從 MOPS 公開說明書取得） |
| past_funds | JSONB | 歷任基金列表 [{name, period, return}] |
| updated_at | TIMESTAMP | |

### `holdings_snapshots`
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| etf_id | UUID | FK → etfs |
| snapshot_date | DATE | 快照日期 |
| stock_ticker | VARCHAR(10) | 成分股代碼 |
| shares | BIGINT | 持有張數 |
| weight_pct | DECIMAL(5,2) | 持倉比例 % |

### `holdings_changes`
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| etf_id | UUID | FK → etfs |
| change_date | DATE | 異動日期 |
| stock_ticker | VARCHAR(10) | 成分股代碼 |
| change_type | ENUM | added / removed / increased / decreased |
| shares_before | BIGINT | 昨日張數（新增時為 0） |
| shares_after | BIGINT | 今日張數（刪除時為 0） |
| shares_delta | BIGINT | 差值（正=加倉，負=減倉） |
| amount_billion | DECIMAL(10,2) | 異動金額（億）= shares_delta × 收盤價 / 1000 |

### `stocks`
| 欄位 | 類型 | 說明 |
|------|------|------|
| ticker | VARCHAR(10) | 股票代碼（主鍵） |
| name | VARCHAR(100) | 公司名稱 |
| industry | VARCHAR(50) | 行業別（TWSE 分類） |
| sub_industry | VARCHAR(50) | 次行業別 |
| founding_year | INT | 成立年份 |
| main_business | TEXT | 主要業務說明（從 MOPS 抓） |
| updated_at | TIMESTAMP | |

### `alert_subscriptions`
| 欄位 | 類型 | 說明 |
|------|------|------|
| id | UUID | 主鍵 |
| channel | ENUM | email / line |
| contact | VARCHAR(200) | Email 或 LINE Token |
| etf_code | VARCHAR(10) | 訂閱的 ETF（NULL = 全部） |
| threshold_pct | DECIMAL(5,2) | 觸發門檻（持倉比例變化 %） |
| created_at | TIMESTAMP | |

---

## 五、API 路由

| Method | 路由 | 說明 |
|--------|------|------|
| GET | `/etfs` | 所有 ETF 列表，支援 `?type=&search=` |
| GET | `/etfs/{code}` | 單一 ETF 基本資料 |
| GET | `/etfs/{code}/changes` | 指定日期的成分股異動（預設今日） |
| GET | `/etfs/{code}/history/{ticker}` | 某成分股的歷史張數 |
| GET | `/etfs/top-movers` | 今日異動最大的 ETF（首頁卡片用） |
| GET | `/dashboard/summary` | 首頁摘要：今日總加碼億數、總減碼億數、資料更新進度、自然語言摘要文字 |
| GET | `/dashboard/cross-etf` | 同步加碼／減碼 Top N：被多支 ETF 同時買進／賣出的個股排行 |
| GET | `/managers/{id}` | 經理人詳情 |
| GET | `/stocks/{ticker}` | 個股基本資料 + 哪些 ETF 持有 |
| POST | `/alerts` | 建立警報訂閱 |
| DELETE | `/alerts/{id}` | 取消訂閱 |

---

## 六、前端頁面

### `/` 首頁
- **資料更新進度條**：顯示今日已更新 N/M 支 ETF
- **自然語言摘要**：一行文字自動總結今日加碼/減碼重點（由後端產生）
- **總覽數字卡片**：今日全市場加碼總額（億）、減碼總額（億）
- **同步加碼／減碼 Top 3**：被多支 ETF 同時買進／賣出的個股排行（附億數）
- **加碼最多／減碼最多 ETF Top 3**：單日移動金額最大的 ETF
- **所有 ETF 異動表格**：代碼、名稱、經理人（可點擊）、新增檔數、刪除檔數、加碼億數、減碼億數、明細按鈕
- 支援搜尋（代碼/名稱）、篩選（股票型/債券型、只看加倉/減倉）
- 深色主題，資訊密度高

### `/etf/[code]`
- ETF 基本資料（名稱、投信、類型、成立日）
- 目前完整成分股列表（張數、比例）
- 歷史張數折線圖（選擇成分股後顯示）
- 最近 30 天異動紀錄

### `/manager/[id]`
- 經理人姓名、學歷、年資
- 目前管理的基金
- 歷任基金列表（含任期與績效）

### `/stock/[ticker]`
- 公司名稱、行業別、次行業別、成立年份
- 主要業務說明
- 哪些 ETF 目前持有此股票（附持倉比例）

### `/alerts`
- 表單：選 ETF（或全部）、輸入 Email 或 LINE Token、設定門檻
- 訂閱確認 / 取消訂閱

---

## 七、爬蟲目標

| 資料 | 來源 | 更新頻率 |
|------|------|---------|
| ETF 成分股 | 元大、富邦、國泰、中信、群益、永豐⋯等各投信官網 | 每日 18:30 |
| 個股行業/業務 | TWSE 上市公司基本資料、MOPS 公司簡介 | 每週日 |
| 經理人資料 | MOPS 基金公開說明書 | 每月 |

爬蟲失敗時：記錄錯誤 log，跳過當日該 ETF，隔日重試，不中斷其他爬蟲。

---

## 八、警報規則

- 觸發條件：某 ETF 單日持倉比例變化超過使用者設定門檻（預設 1%）
- 通知內容：ETF 名稱、異動成分股、張數變化
- 發送時間：爬蟲完成後（約 19:00）
- 限制：同一 ETF 同一天最多發一次通知

---

## 九、擴充性說明

架構設計支援中途新增功能，例如：
- 新增財報資料來源：加新爬蟲 + 新資料表，不影響現有功能
- 新增股利追蹤：加 API route + 頁面 section
- 新增使用者帳號系統：新增 `users` 表，警報訂閱改用帳號管理

---

## 十、不在本次範圍內

- 使用者登入 / 帳號系統
- ETF 報酬率計算
- 付費 API 資料源
- 手機 App
