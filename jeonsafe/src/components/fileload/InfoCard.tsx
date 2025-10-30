type InfoCardProps = {
  title: string;
  lines: string[];           // 본문은 줄바꿈 배열로 받기
  minHeight?: number;        // 필요하면 높이 조절
};

export default function InfoCard({ title, lines, minHeight = 300 }: InfoCardProps) {
  return (
    <section className="w-full rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="text-center" style={{ minHeight }}>
        <div className="p-16 sm:p-20">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-400">{title}</h2>
          <p className="mt-4 text-sm text-gray-400 leading-relaxed">
            {lines.map((line, i) => (
              <span key={i}>
                {line}
                {i !== lines.length - 1 && <><br className="hidden sm:block" /></>}
              </span>
            ))}
          </p>
        </div>
      </div>
    </section>
  );
}