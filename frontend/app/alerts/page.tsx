import AlertForm from "@/components/alerts/AlertForm";

export default function AlertsPage() {
  return (
    <div className="max-w-2xl mx-auto px-6 py-6">
      <h1 className="text-xl font-bold text-white mb-2">異動警報</h1>
      <p className="text-sm text-slate-500 mb-6">
        設定後，當 ETF 單日加減碼超過門檻，系統會自動通知你。
      </p>
      <AlertForm />
    </div>
  );
}
