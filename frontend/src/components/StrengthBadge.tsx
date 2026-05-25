interface StrengthBadgeProps {
  strength: number | null;
}

export default function StrengthBadge({ strength }: StrengthBadgeProps) {
  if (strength === null || strength === undefined) {
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-700 text-gray-400">
        N/A
      </span>
    );
  }

  const pct = Math.round(strength * 100);

  let colorClasses: string;
  if (pct < 30) {
    colorClasses = "bg-blue-900/50 text-blue-300 border-blue-700";
  } else if (pct <= 70) {
    colorClasses = "bg-amber-900/50 text-amber-300 border-amber-700";
  } else {
    colorClasses = "bg-red-900/50 text-red-300 border-red-700";
  }

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${colorClasses}`}
    >
      {pct}%
    </span>
  );
}
