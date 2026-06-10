import { getManager } from "@/lib/api";

export default async function ManagerPage({ params }: { params: { id: string } }) {
  const manager = await getManager(params.id);

  return (
    <div className="max-w-3xl mx-auto px-6 py-6">
      <h1 className="text-2xl font-bold text-white mb-1">{manager.name}</h1>
      <div className="grid grid-cols-2 gap-4 mt-4">
        {manager.education && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">學歷</p>
            <p className="text-sm text-slate-200">{manager.education}</p>
          </div>
        )}
        {manager.experience_years && (
          <div className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            <p className="text-xs text-slate-500 mb-1">年資</p>
            <p className="text-2xl font-bold text-sky-400">{manager.experience_years} 年</p>
          </div>
        )}
      </div>
      {manager.bio && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 mt-4">
          <p className="text-xs text-slate-500 mb-2">簡介</p>
          <p className="text-sm text-slate-300 leading-relaxed">{manager.bio}</p>
        </div>
      )}
      {manager.past_funds && manager.past_funds.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden mt-4">
          <p className="px-4 py-3 border-b border-slate-800 text-sm font-semibold">歷任基金</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-950 text-slate-500">
                {["基金名稱", "任期", "績效"].map((h) => (
                  <th key={h} className="px-4 py-2 text-left border-b border-slate-800">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {manager.past_funds.map((f, i) => (
                <tr key={i} className="border-b border-slate-900">
                  <td className="px-4 py-2 text-slate-200">{f.name}</td>
                  <td className="px-4 py-2 text-slate-400">{f.period}</td>
                  <td className="px-4 py-2 text-sky-400">{f.return ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
