# 快速部署指南（5分鐘完成）

## 準備工作
1. 有 GitHub 帳戶（推送代碼）
2. 有 Vercel 帳戶（https://vercel.com）
3. 有 Railway 帳戶（https://railway.app）

---

## 部署步驟

### 第 1 步：推送到 GitHub
```bash
cd c:\Users\ivype\OneDrive\桌面\0430
git init
git add .
git commit -m "ETF Tracker - Ready for deployment"
git remote add origin https://github.com/YOUR_USERNAME/etf-tracker.git
git push -u origin main
```

### 第 2 步：部署後端到 Railway（3分鐘）

1. 訪問 https://railway.app
2. 按「GitHub Login」
3. 按「New Project」→ 選「Deploy from GitHub repo」
4. 選擇 `etf-tracker` 倉庫
5. 等待部署完成（會看到綠色 ✓）
6. 複製服務 URL，例如：`https://etf-tracker-prod-xxxxx.railway.app`

### 第 3 步：部署 PostgreSQL 到 Railway（1分鐘）

1. 在 Railway 項目中按「+ Add」
2. 選「Database」→ 「PostgreSQL」
3. 自動創建，記下 `DATABASE_URL`

### 第 4 步：配置後端環境變數（1分鐘）

1. 回到 Railway 後端服務
2. 按「Variables」
3. 貼上 PostgreSQL 的 `DATABASE_URL`
4. 保存並重新部署

### 第 5 步：部署前端到 Vercel（1分鐘）

1. 訪問 https://vercel.com
2. 按「Import Project」
3. 選擇 GitHub 倉庫 `etf-tracker`
4. **設定很重要**：
   ```
   Framework Preset: Next.js
   Root Directory: frontend
   ```
5. **環境變數**：
   ```
   NEXT_PUBLIC_API_URL = https://etf-tracker-prod-xxxxx.railway.app
   ```
   (用你的 Railway 後端 URL)
6. 按「Deploy」

---

## 初始化資料庫

部署後，初始化資料庫：

```bash
# 通過 Railway 的 PostgreSQL 執行以下指令
python -m app.seed_from_api
```

或者在 Railway 控制台執行：
```bash
alembic upgrade head
python -m app.seed_from_api
```

---

## 完成！🎉

你的應用已上線！分享這個 URL 給他人：

```
https://etf-tracker.vercel.app
```

---

## 常見問題排查

| 問題 | 解決方案 |
|------|--------|
| 前端顯示「API 連線失敗」 | 檢查 `NEXT_PUBLIC_API_URL` 環境變數是否正確 |
| 後端無法啟動 | 檢查 Railway 的 `DATABASE_URL` 是否設定 |
| 頁面顯示「找不到 ETF」 | 運行 `python -m app.seed_from_api` 初始化資料 |
| Railway 資料庫超時 | 免費層可能冷啟動，稍等 30 秒重試 |

---

## 每日自動更新

✅ 已設定：每天凌晨 00:30 自動從 quickscribe.cc 導入最新資料

無需手動操作！
