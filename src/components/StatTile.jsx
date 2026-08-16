export default function StatTile({ icon, label, value, tone = 'blue' }) {
  const tones = {
    blue: 'bg-[#E8F0FE] text-[#0B57D0]',
    green: 'bg-[#E6F4EA] text-[#1E7E34]',
    amber: 'bg-amber-50 text-amber-600',
    slate: 'bg-[#F1F3F4] text-[#444746]',
  };

  return (
    <div className="gcard flex items-center gap-4 !p-5">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center text-xl flex-shrink-0 ${tones[tone] || tones.blue}`}>
        <i className={icon}></i>
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-[#1F1F1F] leading-tight">{value}</div>
        <div className="text-sm text-[#444746] truncate">{label}</div>
      </div>
    </div>
  );
}
