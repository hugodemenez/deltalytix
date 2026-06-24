import React from "react"
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Svg,
  G,
  Path,
  Rect,
  Line,
} from "@react-pdf/renderer"
import { scaleLinear } from "d3-scale"
import { arc as d3Arc, line as d3Line, pie as d3Pie } from "d3-shape"
import type { PieArcDatum } from "d3-shape"
import { DEFAULT_BREAKEVEN_RANGE } from "@/types/breakeven"
import {
  computeChartData,
  computeSummary,
  resolveHeaderLabels,
  type ExportPdfPayload,
  type PointSeries,
} from "./statement"

// Built-in Helvetica is used throughout: unlike jsPDF it covers WinAnsi
// (Latin-1), so French accents render without embedding a custom font.

const COLORS = {
  headerBg: "#141826",
  headerLine: "#434960",
  text: "#181c25",
  mutedText: "#596073",
  subtleText: "#7a8295",
  cardBg: "#f8fafc",
  cardBorder: "#dfe3ec",
  chartBg: "#ffffff",
  positive: "#2a9d8f",
  negative: "#e76f51",
  neutral: "#64748b",
  line: "#2a9d8f",
  grid: "#e4e8f0",
  axis: "#cbd5e1",
  white: "#ffffff",
}

const styles = StyleSheet.create({
  page: { paddingBottom: 48, fontFamily: "Helvetica", color: COLORS.text },
  header: { backgroundColor: COLORS.headerBg, paddingHorizontal: 40, paddingTop: 28, paddingBottom: 18 },
  headerTitle: { color: COLORS.white, fontSize: 22, fontFamily: "Helvetica-Bold" },
  headerSubtitle: { color: "#c7ccda", fontSize: 11, marginTop: 4 },
  headerMeta: { color: "#aeb4c6", fontSize: 9, marginTop: 8 },
  body: { paddingHorizontal: 40, paddingTop: 20 },
  sectionTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", marginTop: 16, marginBottom: 10 },
  cardRow: { flexDirection: "row", justifyContent: "space-between", marginBottom: 14 },
  metricCard: {
    width: "48.5%",
    backgroundColor: COLORS.cardBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 8,
    padding: 12,
  },
  metricLabel: { fontSize: 10, color: COLORS.mutedText },
  metricValue: { fontSize: 16, fontFamily: "Helvetica-Bold", marginTop: 8 },
  chartCard: {
    width: "48.5%",
    backgroundColor: COLORS.chartBg,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 8,
    overflow: "hidden",
  },
  chartHeader: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.cardBorder,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  chartBody: { padding: 10 },
  chartTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#262b38" },
  empty: { fontSize: 10, color: COLORS.mutedText, marginTop: 8 },
  footer: {
    position: "absolute",
    bottom: 16,
    left: 40,
    right: 40,
    borderTopWidth: 1,
    borderTopColor: COLORS.cardBorder,
    paddingTop: 6,
    fontSize: 9,
    color: "#787e91",
  },
})

const CHART_W = 232
const CHART_H = 128
const PAD = { top: 8, right: 8, bottom: 18, left: 38 }

const fmtMoney = (v: number) => v.toFixed(2)
const fmtAxis = (v: number) => {
  const abs = Math.abs(v)
  if (abs >= 1000) {
    return `${(v / 1000).toFixed(1)}k`
  }
  return v.toFixed(0)
}

interface ChartLabels {
  noData: string
}

interface ChartShellProps {
  title: string
  children: React.ReactNode
}

function ChartShell({ title, children }: ChartShellProps) {
  return (
    <View style={styles.chartCard}>
      <View style={styles.chartHeader}>
        <Text style={styles.chartTitle}>{title}</Text>
      </View>
      <View style={styles.chartBody}>{children}</View>
    </View>
  )
}

function ChartFrame({ children }: { children: React.ReactNode }) {
  return (
    <Svg width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
      {children}
    </Svg>
  )
}

function axisTicks(min: number, max: number) {
  return scaleLinear().domain([min, max]).nice(3).ticks(3)
}

function formatChartDateLabel(label: string) {
  const parts = label.split("-")
  if (parts.length === 3 && parts[1] && parts[2]) {
    return `${parts[1]}-${parts[2]}`
  }
  return label
}

function xTickIndexes(dataLength: number, showEveryLabel?: boolean) {
  if (dataLength <= 0) return []
  if (showEveryLabel || dataLength <= 4) {
    return Array.from({ length: dataLength }, (_v, i) => i)
  }
  return [0, Math.floor((dataLength - 1) / 2), dataLength - 1]
}

function yAxisAndGrid(yScale: (v: number) => number, min: number, max: number) {
  const plotRight = CHART_W - PAD.right
  const ticks = axisTicks(min, max)
  const zeroY = yScale(0)
  const hasZeroTick = ticks.some((tick) => Math.abs(tick) < Number.EPSILON)
  return (
    <>
      {ticks.map((tick, i) => {
        const y = yScale(tick)
        return (
          <React.Fragment key={`tick-${i}-${tick}`}>
            <Line
              x1={PAD.left}
              y1={y}
              x2={plotRight}
              y2={y}
              strokeWidth={tick === 0 ? 0.75 : 0.45}
              stroke={tick === 0 ? COLORS.axis : COLORS.grid}
            />
            <Text x={2} y={y + 2} style={{ fontSize: 6, fill: COLORS.subtleText }}>
              {fmtAxis(tick)}
            </Text>
          </React.Fragment>
        )
      })}
      {min <= 0 && max >= 0 && !hasZeroTick ? (
        <Line x1={PAD.left} y1={zeroY} x2={plotRight} y2={zeroY} strokeWidth={0.6} stroke={COLORS.axis} />
      ) : null}
    </>
  )
}

function LineChartSvg({ data, labels }: { data: PointSeries[]; labels: ChartLabels }) {
  if (data.length === 0) {
    return <Text style={styles.empty}>{labels.noData}</Text>
  }
  const values = data.map((d) => d.value)
  const min = Math.min(0, ...values)
  const max = Math.max(0, ...values)
  const xScale = scaleLinear()
    .domain([0, Math.max(1, data.length - 1)])
    .range([PAD.left, CHART_W - PAD.right])
  const yScale = scaleLinear()
    .domain([min, max])
    .range([CHART_H - PAD.bottom, PAD.top])
  const path = d3Line<PointSeries>()
    .x((_d, i) => xScale(i))
    .y((d) => yScale(d.value))(data)

  return (
    <ChartFrame>
      <Line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={CHART_H - PAD.bottom} strokeWidth={0.45} stroke={COLORS.axis} />
      {yAxisAndGrid((v) => yScale(v), min, max)}
      {path && <Path d={path} strokeWidth={1.6} stroke={COLORS.line} fill="none" />}
      {data.map((d, i) => (
        i === 0 || i === data.length - 1 ? (
          <Rect
            key={`dot-${i}`}
            x={xScale(i) - 1.7}
            y={yScale(d.value) - 1.7}
            width={3.4}
            height={3.4}
            rx={1.7}
            fill={COLORS.line}
          />
        ) : null
      ))}
      {xTickIndexes(data.length).map((i) => (
        <Text key={`x-${i}`} x={xScale(i) - 10} y={CHART_H - 4} style={{ fontSize: 6, fill: COLORS.subtleText }}>
          {formatChartDateLabel(data[i]?.label ?? "")}
        </Text>
      ))}
    </ChartFrame>
  )
}

function BarChartSvg({
  data,
  labels,
  showEveryLabel,
}: {
  data: PointSeries[]
  labels: ChartLabels
  showEveryLabel?: boolean
}) {
  if (data.length === 0) {
    return <Text style={styles.empty}>{labels.noData}</Text>
  }
  const values = data.map((d) => d.value)
  const min = Math.min(0, ...values)
  const max = Math.max(0, ...values)
  const yScale = scaleLinear()
    .domain([min, max])
    .range([CHART_H - PAD.bottom, PAD.top])
  const plotWidth = CHART_W - PAD.left - PAD.right
  const step = plotWidth / data.length
  const barWidth = Math.max(2, Math.min(18, step * 0.62))
  const zeroY = yScale(0)

  return (
    <ChartFrame>
      <Line x1={PAD.left} y1={PAD.top} x2={PAD.left} y2={CHART_H - PAD.bottom} strokeWidth={0.45} stroke={COLORS.axis} />
      {yAxisAndGrid((v) => yScale(v), min, max)}
      {data.map((d, i) => {
        const x = PAD.left + i * step + (step - barWidth) / 2
        const y = d.value >= 0 ? yScale(d.value) : zeroY
        const height = Math.max(0.5, Math.abs(yScale(d.value) - zeroY))
        return (
          <Rect
            key={i}
            x={x}
            y={y}
            width={barWidth}
            height={height}
            rx={2}
            fill={d.value >= 0 ? COLORS.positive : COLORS.negative}
          />
        )
      })}
      {xTickIndexes(data.length, showEveryLabel).map((i) => {
        const d = data[i]
        return (
          <Text
            key={`l-${i}`}
            x={PAD.left + i * step + step / 2 - (showEveryLabel ? 5 : 10)}
            y={CHART_H - 4}
            style={{ fontSize: 6, fill: COLORS.subtleText }}
          >
            {showEveryLabel ? d.label : formatChartDateLabel(d.label)}
          </Text>
        )
      })}
    </ChartFrame>
  )
}

function DistributionSvg({
  distribution,
  labels,
}: {
  distribution: { win: number; breakeven: number; loss: number }
  labels: ChartLabels & { tradesLabel: string; win: string; breakeven: string; loss: string }
}) {
  const rows = [
    { label: labels.win, value: distribution.win, color: COLORS.positive },
    { label: labels.breakeven, value: distribution.breakeven, color: COLORS.neutral },
    { label: labels.loss, value: distribution.loss, color: COLORS.negative },
  ]
  const total = rows.reduce((s, r) => s + r.value, 0)
  if (total === 0) {
    return <Text style={styles.empty}>{labels.noData}</Text>
  }
  const pie = d3Pie<(typeof rows)[number]>()
    .value((d) => d.value)
    .sort(null)
    .padAngle(0.035)(rows)
  const arc = d3Arc<PieArcDatum<(typeof rows)[number]>>()
    .innerRadius(31)
    .outerRadius(47)
    .cornerRadius(3)
  const cx = 66
  const cy = 58

  return (
    <ChartFrame>
      <G transform={`translate(${cx}, ${cy})`}>
        {pie.map((slice) => {
          const path = arc(slice)
          return path ? (
            <Path key={slice.data.label} d={path} fill={slice.data.color} stroke={COLORS.white} strokeWidth={1} />
          ) : null
        })}
      </G>
      <Text x={cx - 14} y={cy - 3} style={{ fontSize: 14, fontFamily: "Helvetica-Bold", fill: COLORS.text }}>
        {String(total)}
      </Text>
      <Text x={cx - 18} y={cy + 10} style={{ fontSize: 6, fill: COLORS.subtleText }}>
        {labels.tradesLabel}
      </Text>
      {rows.map((r, i) => {
        const y = 28 + i * 24
        const pct = (r.value / total) * 100
        return (
          <React.Fragment key={`legend-${r.label}`}>
            <Rect x={130} y={y - 6} width={7} height={7} rx={3.5} fill={r.color} />
            <Text x={143} y={y} style={{ fontSize: 7, fill: COLORS.text }}>
              {r.label}
            </Text>
            <Text x={143} y={y + 10} style={{ fontSize: 7, fill: COLORS.subtleText }}>
              {`${r.value} (${pct.toFixed(1)}%)`}
            </Text>
          </React.Fragment>
        )
      })}
    </ChartFrame>
  )
}

export interface StatementStrings {
  statementTitle: string
  statementSubtitle: string
  generatedOn: string
  dateRange: string
  accounts: string
  allAccounts: string
  allTime: string
  summaryTitle: string
  chartsSectionTitle: string
  noChartsAvailable: string
  footerTitle: string
  page: string
  totalTrades: string
  tradesLabel: string
  grossPnl: string
  netPnl: string
  winRate: string
  // chart titles
  equityChart: string
  pnlChart: string
  weekdayPnl: string
  tradeDistribution: string
  // distribution legend
  win: string
  breakeven: string
  loss: string
}

export function StatementDocument({
  payload,
  strings,
  generatedAt,
}: {
  payload: ExportPdfPayload
  strings: StatementStrings
  generatedAt: string
}) {
  const breakevenRange = payload.breakevenRange ?? DEFAULT_BREAKEVEN_RANGE
  const summary = computeSummary(payload.trades, breakevenRange)
  const charts = computeChartData(payload.trades, payload.timezone, breakevenRange)
  const { dateRangeLabel, accountLabel } = resolveHeaderLabels(
    payload,
    strings.allTime,
    strings.allAccounts,
  )
  const netColor = summary.totalNetPnl >= 0 ? COLORS.positive : COLORS.negative
  const noData: ChartLabels = { noData: strings.noChartsAvailable }

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header} fixed>
          <Text style={styles.headerTitle}>{payload.title.trim() || strings.statementTitle}</Text>
          <Text style={styles.headerSubtitle}>{strings.statementSubtitle}</Text>
          <Text style={styles.headerMeta}>{`${strings.generatedOn}: ${generatedAt}`}</Text>
          <Text style={styles.headerMeta}>{`${strings.dateRange}: ${dateRangeLabel}`}</Text>
          <Text style={styles.headerMeta}>{`${strings.accounts}: ${accountLabel}`}</Text>
        </View>

        <View style={styles.body}>
          <Text style={styles.sectionTitle}>{strings.summaryTitle}</Text>
          <View style={styles.cardRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>{strings.totalTrades}</Text>
              <Text style={styles.metricValue}>{String(summary.totalTrades)}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>{strings.winRate}</Text>
              <Text style={styles.metricValue}>{`${summary.winRate.toFixed(2)}%`}</Text>
            </View>
          </View>
          <View style={styles.cardRow}>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>{strings.grossPnl}</Text>
              <Text style={styles.metricValue}>{fmtMoney(summary.totalGrossPnl)}</Text>
            </View>
            <View style={styles.metricCard}>
              <Text style={styles.metricLabel}>{strings.netPnl}</Text>
              <Text style={[styles.metricValue, { color: netColor }]}>
                {fmtMoney(summary.totalNetPnl)}
              </Text>
            </View>
          </View>

          <Text style={styles.sectionTitle}>{strings.chartsSectionTitle}</Text>
          <View style={styles.cardRow}>
            <ChartShell title={strings.equityChart}>
              <LineChartSvg data={charts.equity} labels={noData} />
            </ChartShell>
            <ChartShell title={strings.pnlChart}>
              <BarChartSvg data={charts.dailyPnl} labels={noData} />
            </ChartShell>
          </View>
          <View style={styles.cardRow}>
            <ChartShell title={strings.weekdayPnl}>
              <BarChartSvg data={charts.weekdayPnl} labels={noData} showEveryLabel />
            </ChartShell>
            <ChartShell title={strings.tradeDistribution}>
              <DistributionSvg
                distribution={charts.distribution}
                labels={{
                  noData: strings.noChartsAvailable,
                  tradesLabel: strings.tradesLabel,
                  win: strings.win,
                  breakeven: strings.breakeven,
                  loss: strings.loss,
                }}
              />
            </ChartShell>
          </View>
        </View>

        <Text
          style={styles.footer}
          fixed
          render={({ pageNumber, totalPages }) =>
            `${strings.footerTitle} • ${strings.page} ${pageNumber}/${totalPages}`
          }
        />
      </Page>
    </Document>
  )
}
