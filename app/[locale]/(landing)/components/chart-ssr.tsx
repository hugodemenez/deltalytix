import * as d3 from "d3";

export function ChartSSR({
  data,
  dots = false,
}: {
  dots?: boolean;
  data: { value: number; date: Date }[];
}) {
  // Ensure we have valid data
  if (!data || data.length < 2) {
    return null;
  }

  // Ensure all dates are Date objects and sort by date
  const sortedData = [...data]
    .map(d => ({
      ...d,
      date: d.date instanceof Date ? d.date : new Date(d.date)
    }))
    .filter(d => !isNaN(d.date.getTime())) // Remove invalid dates
    .sort((a, b) => a.date.getTime() - b.date.getTime());

  // Check if we still have valid data after filtering
  if (sortedData.length < 2) {
    return null;
  }
  
  const xScale = d3
    .scaleTime()
    .domain(d3.extent(sortedData, d => d.date) as [Date, Date])
    .range([0, 100]);
    
  const maxValue = d3.max(sortedData, d => d.value) ?? 0;
  const yScale = d3
    .scaleLinear()
    .domain([0, Math.max(maxValue, 1)]) // Ensure minimum domain of 1 for better visualization
    .range([100, 0]);

  const line = d3
    .line<(typeof sortedData)[number]>()
    .curve(d3.curveCatmullRom.alpha(0.5)) // Smoother curve for daily data
    .x((d) => xScale(d.date))
    .y((d) => yScale(d.value));

  const area = d3
    .area<(typeof sortedData)[number]>()
    .curve(d3.curveCatmullRom.alpha(0.5)) // Match the line curve
    .x((d) => xScale(d.date))
    .y0(yScale(0))
    .y1((d) => yScale(d.value));

  const pathLine = line(sortedData);
  const pathArea = area(sortedData);

  if (!pathLine) {
    return null;
  }

  return (
    <div className="relative h-full w-full">
      {/* Chart area */}
      <svg className="absolute inset-0 h-full w-full overflow-visible">
        <svg
          viewBox="0 0 100 100"
          className="overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient
              id="gradient"
              x1="0"
              y1="0"
              x2="0"
              y2="100%"
              gradientUnits="userSpaceOnUse"
            >
              <stop offset="0%" stopColor="#00B35D" stopOpacity={0.9} />
              <stop offset="50%" stopColor="#00B35D" stopOpacity={0.09} />
              <stop offset="100%" stopColor="04B560" stopOpacity={0} />
            </linearGradient>
          </defs>
          {/* Gradient area */}
          {pathArea && (
            <path
              d={pathArea}
              fill="url(#gradient)"
              vectorEffect="non-scaling-stroke"
            />
          )}
          {/* Line */}
          <path
            d={pathLine}
            fill="none"
            className="text-[#00C969]"
            stroke="currentColor"
            strokeWidth="4"
            vectorEffect="non-scaling-stroke"
          />
        </svg>
      </svg>
    </div>
  );
}
