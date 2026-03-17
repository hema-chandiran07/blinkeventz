"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface ChartData {
  label: string;
  value: number;
  color?: string;
}

interface BarChartProps {
  data: ChartData[];
  title?: string;
  height?: number;
  className?: string;
  showValues?: boolean;
  color?: string;
}

export function BarChart({
  data,
  title,
  height = 200,
  className,
  showValues = true,
  color = "bg-neutral-900",
}: BarChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);

  return (
    <Card className={cn("border-silver-200 bg-white", className)}>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold text-black">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <div className="flex items-end justify-between gap-2" style={{ height }}>
          {data.map((item, index) => {
            const heightPercent = (item.value / maxValue) * 100;
            return (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                {showValues && (
                  <span className="text-xs font-medium text-neutral-600">
                    {item.value >= 1000 ? `₹${(item.value / 1000).toFixed(1)}L` : `₹${item.value.toLocaleString()}`}
                  </span>
                )}
                <div
                  className={cn("w-full rounded-t-md transition-all duration-500 hover:opacity-80", color)}
                  style={{ height: `${heightPercent}%`, minHeight: "4px" }}
                />
                <span className="text-xs text-neutral-500 text-center truncate w-full">
                  {item.label}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

interface LineChartProps {
  data: ChartData[];
  title?: string;
  height?: number;
  className?: string;
  color?: string;
  fill?: boolean;
}

export function LineChart({
  data,
  title,
  height = 200,
  className,
  color = "stroke-neutral-900",
  fill = true,
}: LineChartProps) {
  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const minValue = Math.min(...data.map((d) => d.value), 0);
  const range = maxValue - minValue || 1;

  const points = data.map((item, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((item.value - minValue) / range) * 80 - 10;
    return `${x},${y}`;
  }).join(" ");

  const fillPath = `M0,100 L0,${100 - ((data[0]?.value - minValue) / range) * 80 - 10} ` +
    data.map((item, index) => {
      const x = (index / (data.length - 1)) * 100;
      const y = 100 - ((item.value - minValue) / range) * 80 - 10;
      return `L${x},${y}`;
    }).join(" ") +
    ` L100,100 Z`;

  return (
    <Card className={cn("border-silver-200 bg-white", className)}>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold text-black">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent>
        <div className="relative" style={{ height }}>
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
            {fill && (
              <defs>
                <linearGradient id="lineGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="rgb(26, 26, 26)" stopOpacity="0.3" />
                  <stop offset="100%" stopColor="rgb(26, 26, 26)" stopOpacity="0" />
                </linearGradient>
              </defs>
            )}
            {fill && (
              <path d={fillPath} fill="url(#lineGradient)" />
            )}
            <polyline
              points={points}
              fill="none"
              className={cn("stroke-[0.5]", color)}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            {data.map((item, index) => {
              const x = (index / (data.length - 1)) * 100;
              const y = 100 - ((item.value - minValue) / range) * 80 - 10;
              return (
                <circle
                  key={index}
                  cx={x}
                  cy={y}
                  r="1.5"
                  className="fill-neutral-900"
                />
              );
            })}
          </svg>
          <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-neutral-500">
            {data.map((item, index) => (
              <span key={index} className="flex-1 text-center">
                {item.label}
              </span>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

interface StatCardProps {
  title: string;
  value: string | number;
  subtext?: string;
  icon?: React.ElementType;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  className?: string;
}

export function StatCard({
  title,
  value,
  subtext,
  icon: Icon,
  trend,
  trendValue,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("border-silver-200 bg-white hover:shadow-lg transition-shadow", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-neutral-600">{title}</p>
            <p className="text-2xl font-bold text-black mt-1">{value}</p>
            {subtext && <p className="text-xs text-neutral-500 mt-1">{subtext}</p>}
            {trend && trendValue && (
              <p className={cn(
                "text-xs mt-1 font-medium",
                trend === "up" && "text-green-600",
                trend === "down" && "text-red-600",
                trend === "neutral" && "text-neutral-500"
              )}>
                {trend === "up" && "↑"} {trend === "down" && "↓"} {trendValue}
              </p>
            )}
          </div>
          {Icon && (
            <div className="p-3 rounded-full bg-silver-100 text-neutral-700">
              <Icon className="h-5 w-5" />
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

interface DonutChartProps {
  data: { label: string; value: number; color: string }[];
  title?: string;
  size?: number;
  className?: string;
}

export function DonutChart({
  data,
  title,
  size = 200,
  className,
}: DonutChartProps) {
  const total = data.reduce((sum, item) => sum + item.value, 0);

  const slices = data.reduce<{ path: string; color: string }[]>((acc, item) => {
    const cumulativePercent = acc.length === 0 ? 0 : 
      acc.reduce((sum, _, i) => sum + (data[i].value / total), 0);
    const percent = item.value / total;
    const startAngle = cumulativePercent * 360;
    const endAngle = (cumulativePercent + percent) * 360;

    const startX = Math.cos((startAngle - 90) * Math.PI / 180);
    const startY = Math.sin((startAngle - 90) * Math.PI / 180);
    const endX = Math.cos((endAngle - 90) * Math.PI / 180);
    const endY = Math.sin((endAngle - 90) * Math.PI / 180);

    const largeArcFlag = percent > 0.5 ? 1 : 0;

    const pathData = [
      `M ${startX} ${startY}`,
      `A 1 1 0 ${largeArcFlag} 1 ${endX} ${endY}`,
      `L 0 0`,
    ].join(" ");

    acc.push({ path: pathData, color: item.color });
    return acc;
  }, []);

  return (
    <Card className={cn("border-silver-200 bg-white", className)}>
      {title && (
        <CardHeader className="pb-2">
          <CardTitle className="text-lg font-semibold text-black">{title}</CardTitle>
        </CardHeader>
      )}
      <CardContent className="flex flex-col items-center">
        <svg viewBox="-1.1 -1.1 2.2 2.2" style={{ width: size, height: size }}>
          <g transform="rotate(-90)">
            {slices.map((slice, index) => (
              <path
                key={index}
                d={slice.path}
                fill={slice.color}
                className="transition-opacity hover:opacity-80"
              />
            ))}
          </g>
        </svg>
        <div className="flex flex-wrap justify-center gap-4 mt-4">
          {data.map((item, index) => (
            <div key={index} className="flex items-center gap-2">
              <div
                className="w-3 h-3 rounded-full"
                style={{ backgroundColor: item.color }}
              />
              <span className="text-sm text-neutral-600">
                {item.label} ({Math.round((item.value / total) * 100)}%)
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
