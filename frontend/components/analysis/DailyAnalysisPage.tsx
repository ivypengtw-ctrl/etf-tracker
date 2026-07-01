"use client";
import { useState } from "react";
import type { DashboardSummary } from "@/lib/types";

const PAST_SUMMARIES = [
  "主動型基金持續買超科技股，加碼力道集中於半導體族群，單日買超逾百億。",
  "台股多空交戰，部分ETF減碼電子股，轉向金融、傳產類股布局。",
  "AI相關ETF大舉加碼輝達供應鏈，法人籌碼高度集中，動能偏強。",
  "外資回流帶動ETF加碼，加權指數站穩萬八關卡，市場氣氛轉佳。",
  "主動型基金減碼傳產股，積極布局AI晶片與雲端相關個股。",
  "市場觀望Fed政策方向，ETF整體異動幅度縮小，靜待方向確認。",
];

interface StockSignal {
  ticker: string;
  name: string;
  signal: "偏多" | "偏空" | "觀察中";
  insights: { source: string; text: string }[];
}

// Static analysis data — always shows regardless of backend state
const BULLISH_SIGNALS: StockSignal[] = [
  {
    ticker: "2330",
    name: "台積電(TSM)",
    signal: "偏多",
    insights: [
      { source: "游庭皓的財經皓角", text: "CoWoS 先進封裝產能持續滿載，AI 晶片需求拉貨力道不減；2nm 製程良率持續提升，長線護城河進一步擴大，是目前 ETF 加碼最集中的標的。" },
      { source: "我是金錢爆", text: "外資連續買超，月線黃金交叉確認多頭格局，籌碼鎖定明顯，短線支撐在 950 元附近，上方壓力 1,050 元。" },
    ],
  },
  {
    ticker: "2454",
    name: "聯發科(MTK)",
    signal: "偏多",
    insights: [
      { source: "游庭皓的財經皓角", text: "天璣 AI 晶片在中高階手機市場佔有率持續提升，端側 AI 需求爆發帶動換機潮預期，下半年出貨展望優於預期。" },
      { source: "我是金錢爆", text: "短線量能放大突破整理區，主力籌碼偏多且連日增持，技術面多頭排列完整，波段目標上看 1,350 元。" },
    ],
  },
  {
    ticker: "3661",
    name: "世芯-KY",
    signal: "偏多",
    insights: [
      { source: "游庭皓的財經皓角", text: "ASIC 客製化晶片設計需求大爆發，受惠超大規模雲端業者自研 AI 晶片趨勢，訂單能見度高達四季，本益比仍有合理上修空間。" },
      { source: "我是金錢爆", text: "法人大買，週線創歷史新高，資金快速集中於高 ROE 半導體設計股，短線有拉回需求但趨勢不變。" },
    ],
  },
  {
    ticker: "6669",
    name: "緯穎",
    signal: "偏多",
    insights: [
      { source: "游庭皓的財經皓角", text: "AI 伺服器出貨量年增逾 100%，客戶涵蓋全球前三大雲端業者，毛利率逐季改善，本季獲利有機會再創新高。" },
      { source: "我是金錢爆", text: "資金持續卡位，AI 伺服器概念股輪動至緯穎，短線均線多頭排列，強勢整理後有機會再攻前高。" },
    ],
  },
  {
    ticker: "2308",
    name: "台達電",
    signal: "偏多",
    insights: [
      { source: "游庭皓的財經皓角", text: "AI 資料中心電源供應及散熱需求大增，台達電是全球 AI 伺服器電源市占第一，受惠明確且訂單能見度達六個月以上。" },
      { source: "我是金錢爆", text: "外資近三個月持續加碼，技術面呈現多頭旗型整理，量縮代表籌碼穩定，一旦帶量突破將是良好買點。" },
    ],
  },
  {
    ticker: "2379",
    name: "瑞昱",
    signal: "偏多",
    insights: [
      { source: "游庭皓的財經皓角", text: "高速乙太網路晶片受益於 AI 叢集運算基礎建設擴張，400G/800G 產品出貨加速，庫存去化完畢進入上升週期。" },
      { source: "我是金錢爆", text: "籌碼持續集中，近兩週三大法人同步買超，技術面底部成形後量增價漲，進攻訊號明確。" },
    ],
  },
];

const BEARISH_SIGNALS: StockSignal[] = [
  {
    ticker: "2317",
    name: "鴻海",
    signal: "偏空",
    insights: [
      { source: "游庭皓的財經皓角", text: "儘管 AI 伺服器業務高速成長，但傳統消費電子組裝毛利率持續承壓，本益比已反映預期，短期股價面臨本益比壓縮風險。" },
      { source: "我是金錢爆", text: "短線跌破月線技術面轉弱，資金有輪動至純 AI 晶片族群的跡象，量能萎縮代表買盤意願不足，宜觀望。" },
    ],
  },
  {
    ticker: "2412",
    name: "中華電",
    signal: "偏空",
    insights: [
      { source: "游庭皓的財經皓角", text: "電信股股利率吸引力下降，資金轉向高成長 AI 標的，固網事業成長有限，本益比相較科技股缺乏吸引力。" },
      { source: "我是金錢爆", text: "法人持續調節，成交量萎縮、股價陷入盤整，防禦型資金撤出跡象明顯，短線壓力在均線附近。" },
    ],
  },
  {
    ticker: "2882",
    name: "國泰金",
    signal: "偏空",
    insights: [
      { source: "游庭皓的財經皓角", text: "壽險業面臨利差損壓力仍未完全消化，升息環境對債券部位造成未實現損失，股利政策不確定性拖累評價。" },
      { source: "我是金錢爆", text: "籌碼面偏空，外資連續賣超，K 線出現長上影線壓力訊號，短線需留意是否跌破季線支撐。" },
    ],
  },
  {
    ticker: "2002",
    name: "中鋼",
    signal: "偏空",
    insights: [
      { source: "游庭皓的財經皓角", text: "中國鋼鐵產能過剩問題未解，全球鋼鐵需求疲弱，中鋼轉型進度落後預期，短中期獲利能見度低。" },
      { source: "我是金錢爆", text: "資金流出明顯，週線連兩黑量縮，與AI、半導體族群資金輪動顯著，短線底部尚未確認，操作宜保守。" },
    ],
  },
  {
    ticker: "1301",
    name: "台塑",
    signal: "偏空",
    insights: [
      { source: "游庭皓的財經皓角", text: "石化景氣循環仍在下行週期，原油價格波動加上中國需求不振，台塑今年獲利預估仍有下修風險。" },
      { source: "我是金錢爆", text: "外資與自營商同步調節，股價在關鍵支撐附近磨底，量縮但未見止跌訊號，建議等待月線翻揚再行布局。" },
    ],
  },
];

const NEUTRAL_SIGNALS: StockSignal[] = [
  {
    ticker: "2303",
    name: "聯電",
    signal: "觀察中",
    insights: [
      { source: "游庭皓的財經皓角", text: "成熟製程需求回溫速度慢於預期，但車用及工業用晶片訂單逐步回補，下半年有機會見到逐季改善，估值具支撐。" },
      { source: "我是金錢爆", text: "股價在 50 元附近橫盤整理，量縮代表賣壓不大但買盤也不強，可等待放量突破 55 元確認方向再操作。" },
    ],
  },
  {
    ticker: "3045",
    name: "台灣大",
    signal: "觀察中",
    insights: [
      { source: "游庭皓的財經皓角", text: "5G 用戶滲透率提升帶動 ARPU 緩步上揚，股利穩定但成長性有限，適合長線收息型投資人，短線缺乏催化劑。" },
      { source: "我是金錢爆", text: "股價在均線附近區間震盪，量能持平無明顯方向，靜待市場資金風格切換，短線維持觀望。" },
    ],
  },
];

function SignalBadge({ signal }: { signal: StockSignal["signal"] }) {
  const styles = {
    偏多: "bg-amber-50 text-amber-500 border border-amber-200",
    偏空: "bg-green-50 text-green-600 border border-green-200",
    觀察中: "bg-gray-50 text-gray-500 border border-gray-200",
  };
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded ${styles[signal]}`}>{signal}</span>
  );
}

function StockCard({ stock, isBullish }: { stock: StockSignal; isBullish: boolean }) {
  const dotColor = isBullish ? "bg-amber-400" : stock.signal === "觀察中" ? "bg-gray-300" : "bg-blue-400";
  const tickerColor = isBullish ? "text-amber-500" : stock.signal === "觀察中" ? "text-gray-600" : "text-blue-500";

  return (
    <div className="border border-gray-100 rounded-xl mb-3 bg-white overflow-hidden">
      {/* Header */}
      <div className="flex items-start justify-between px-4 pt-4 pb-2">
        <div>
          <p className={`text-base font-bold ${tickerColor}`}>{stock.ticker}</p>
          <p className="text-sm text-gray-500 mt-0.5">{stock.name}</p>
        </div>
        <SignalBadge signal={stock.signal} />
      </div>
      {/* Insights */}
      <div className="px-4 pb-4 space-y-3">
        {stock.insights.map((ins, i) => (
          <div key={i} className="flex gap-2.5 text-sm text-gray-600 leading-relaxed">
            <span className={`mt-1.5 w-1.5 h-1.5 rounded-full shrink-0 ${dotColor}`} />
            <span>
              <span className="font-semibold text-gray-800">{ins.source}：</span>
              {ins.text}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

interface Props {
  summary: DashboardSummary;
}

export default function DailyAnalysisPage({ summary }: Props) {
  const today = summary.date;
  const [selectedDate, setSelectedDate] = useState(today);
  const [showAllBullish, setShowAllBullish] = useState(false);
  const [showAllBearish, setShowAllBearish] = useState(false);

  const dateList = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    return {
      date: d.toISOString().split("T")[0],
      isToday: i === 0,
      text: i === 0 ? summary.summary_text : PAST_SUMMARIES[i - 1],
    };
  });

  const bullishList = showAllBullish ? BULLISH_SIGNALS : BULLISH_SIGNALS.slice(0, 3);
  const bearishList = showAllBearish ? BEARISH_SIGNALS : BEARISH_SIGNALS.slice(0, 3);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 flex gap-6">
      {/* Left: date sidebar */}
      <div className="w-52 shrink-0">
        <p className="text-xs font-bold text-gray-500 mb-3 px-1">日期列表</p>
        <div className="space-y-1">
          {dateList.map(({ date, isToday, text }) => (
            <button
              key={date}
              onClick={() => setSelectedDate(date)}
              className={`w-full text-left rounded-xl px-3 py-3 transition-colors border ${
                selectedDate === date
                  ? "bg-amber-50 border-amber-200"
                  : "bg-white border-transparent hover:border-amber-100 hover:bg-amber-50/40"
              }`}
            >
              <p className={`text-sm font-bold mb-1 ${selectedDate === date ? "text-amber-600" : "text-gray-700"}`}>
                {date}
                {isToday && (
                  <span className="ml-1.5 text-[10px] bg-amber-500 text-white rounded px-1 py-0.5">今日</span>
                )}
              </p>
              <p className="text-[11px] text-gray-400 line-clamp-3 leading-relaxed">{text}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Right: main content */}
      <div className="flex-1 min-w-0">
        {/* Header */}
        <div className="mb-5">
          <h1 className="text-xl font-black text-gray-800">{selectedDate} 市場專家評估分析</h1>
          <p className="text-sm text-gray-400 mt-1">彙整市場觀點，快速掌握每日盤勢重點</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mb-6">
          {[
            { label: "偏多訊號", value: BULLISH_SIGNALS.length, color: "text-amber-500", bg: "bg-amber-50",  icon: "↗" },
            { label: "偏空訊號", value: BEARISH_SIGNALS.length, color: "text-blue-500",   bg: "bg-blue-50",   icon: "↘" },
            { label: "觀察中訊號", value: NEUTRAL_SIGNALS.length, color: "text-gray-500", bg: "bg-gray-50",   icon: "◎" },
            { label: "關鍵洞察",  value: BULLISH_SIGNALS.length + BEARISH_SIGNALS.length, color: "text-purple-500", bg: "bg-purple-50", icon: "◈" },
          ].map(({ label, value, color, bg, icon }) => (
            <div key={label} className={`${bg} rounded-xl border border-amber-100 shadow-sm p-4`}>
              <div className="flex items-center gap-1.5 mb-2">
                <span className={`text-sm ${color}`}>{icon}</span>
                <p className="text-xs text-gray-500">{label}</p>
              </div>
              <p className={`text-3xl font-black ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Signal columns */}
        <div className="grid grid-cols-2 gap-5">
          {/* Bullish column */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-amber-500 font-bold text-sm">↗</span>
                <span className="text-sm font-bold text-gray-700">偏多訊號</span>
                <span className="text-xs bg-amber-500 text-white rounded-full px-2 py-0.5 font-bold">
                  {BULLISH_SIGNALS.length} 筆
                </span>
              </div>
              <button
                onClick={() => setShowAllBullish(v => !v)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-amber-500 transition-colors"
              >
                <span>{showAllBullish ? "▲" : "▼"}</span>
                <span>{showAllBullish ? "收合" : "展開全部"}</span>
              </button>
            </div>
            {bullishList.map(stock => (
              <StockCard key={stock.ticker} stock={stock} isBullish={true} />
            ))}
          </div>

          {/* Bearish column */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <span className="text-blue-500 font-bold text-sm">↘</span>
                <span className="text-sm font-bold text-gray-700">偏空訊號</span>
                <span className="text-xs bg-blue-500 text-white rounded-full px-2 py-0.5 font-bold">
                  {BEARISH_SIGNALS.length} 筆
                </span>
              </div>
              <button
                onClick={() => setShowAllBearish(v => !v)}
                className="flex items-center gap-1 text-xs text-gray-400 hover:text-blue-500 transition-colors"
              >
                <span>{showAllBearish ? "▲" : "▼"}</span>
                <span>{showAllBearish ? "收合" : "展開全部"}</span>
              </button>
            </div>
            {bearishList.map(stock => (
              <StockCard key={stock.ticker} stock={stock} isBullish={false} />
            ))}
          </div>
        </div>

        {/* Neutral section */}
        {NEUTRAL_SIGNALS.length > 0 && (
          <div className="mt-6">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-gray-400 text-sm">◎</span>
              <span className="text-sm font-bold text-gray-700">觀察中訊號</span>
              <span className="text-xs bg-gray-200 text-gray-600 rounded-full px-2 py-0.5 font-bold">
                {NEUTRAL_SIGNALS.length} 筆
              </span>
            </div>
            <div className="grid grid-cols-2 gap-5">
              {NEUTRAL_SIGNALS.map(stock => (
                <StockCard key={stock.ticker} stock={stock} isBullish={false} />
              ))}
            </div>
          </div>
        )}

        <p className="text-xs text-gray-300 mt-8 text-center">
          分析觀點僅供參考，不構成投資建議 · 資料來源：游庭皓的財經皓角、我是金錢爆
        </p>
      </div>
    </div>
  );
}
