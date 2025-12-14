'use client';

interface ScoreRingProps {
  score: number;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export function ScoreRing({ score, size = 'md', showLabel = true }: ScoreRingProps) {
  const sizes = {
    sm: { width: 60, strokeWidth: 4, fontSize: 'text-sm' },
    md: { width: 80, strokeWidth: 5, fontSize: 'text-lg' },
    lg: { width: 120, strokeWidth: 6, fontSize: 'text-2xl' },
  };

  const { width, strokeWidth, fontSize } = sizes[size];
  const radius = (width - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const offset = circumference - (score / 100) * circumference;

  const getColor = (score: number) => {
    if (score >= 80) return { stroke: '#22c55e', text: 'text-green-600' };
    if (score >= 60) return { stroke: '#eab308', text: 'text-yellow-600' };
    if (score >= 40) return { stroke: '#f97316', text: 'text-orange-600' };
    return { stroke: '#ef4444', text: 'text-red-600' };
  };

  const color = getColor(score);

  return (
    <div className="flex flex-col items-center">
      <svg width={width} height={width} className="transform -rotate-90">
        <circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
        />
        <circle
          cx={width / 2}
          cy={width / 2}
          r={radius}
          fill="none"
          stroke={color.stroke}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-500"
        />
      </svg>
      <span className={`${fontSize} font-bold ${color.text} -mt-${width / 2 + 8}`} style={{ marginTop: `-${width / 2 + 10}px` }}>
        {score}
      </span>
      {showLabel && <span className="text-xs text-gray-500 mt-1">/ 100</span>}
    </div>
  );
}
