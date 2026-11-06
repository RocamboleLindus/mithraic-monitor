import type { Sample } from "../types";

type SparklineProps = {
  samples: Sample[] | undefined;
  convert?: (value: number) => number;
};

export function Sparkline({ samples, convert }: SparklineProps) {
  const values = (samples ?? []).map((sample) => (convert ? convert(sample.v) : sample.v));
  if (values.length < 2) return <div className="spark spark-empty" />;

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const width = 100;
  const height = 36;
  const line = values
    .map((value, index) => {
      const x = (index / (values.length - 1)) * width;
      const y = height - ((value - min) / span) * (height - 4) - 2;
      return `${index === 0 ? "M" : "L"}${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(" ");

  return (
    <svg className="spark" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" aria-hidden="true">
      <path className="spark-fill" d={`${line} L${width} ${height} L0 ${height} Z`} />
      <path className="spark-line" d={line} />
    </svg>
  );
}
