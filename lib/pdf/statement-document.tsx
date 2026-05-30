import React from "react"
import {
  Document,
  Page,
  View,
  Text,
  StyleSheet,
  Svg,
  Path,
  Rect,
  Line,
} from "@react-pdf/renderer"
import { scaleLinear } from "d3-scale"
import { line as d3Line } from "d3-shape"
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
  cardBg: "#f8fafc",
  cardBorder: "#dfe3ec",
  positive: "#188c5c",
  negative: "#c73b44",
  line: "#2563eb",
  grid: "#e4e8f0",
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
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    borderRadius: 8,
    padding: 10,
  },
  chartTitle: { fontSize: 10, fontFamily: "Helvetica-Bold", color: "#262b38", marginBottom: 6 },
  empty: { fontSize: 11, color: COLORS.mutedText, marginTop: 8 },
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
const PAD = { top: 8, right: 8, bottom: 16, left: 34 }

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

function ChartFrame({ children }: { children: React.ReactNode }) {
  return (
    <Svg width={CHART_W} height={CHART_H} viewBox={`0 0 ${CHART_W} ${CHART_H}`}>
      {children}
    </Svg>
  )
}

function yAxisAndBaseline(yScale: (v: number) => number, min: number, max: number) {
  const plotRight = CHART_W - PAD.right
  const zeroY = min < 0 && max > 0 ? yScale(0) : null
  return (
    <>
      <Text x={2} y={PAD.top + 4} style={{ fontSize: 6, fill: COLORS.mutedText }}>
        {fmtAxis(max)}
      </Text>
      <Text x={2} y={CHART_H - PAD.bottom} style={{ fontSize: 6, fill: COLORS.mutedText }}>
        {fmtAxis(min)}
      </Text>
      {zeroY !== null && (
        <Line x1={PAD.left} y1={zeroY} x2={plotRight} y2={zeroY} strokeWidth={0.5} stroke={COLORS.grid} />
      )}
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
  const span = max - min || 1
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
      {yAxisAndBaseline((v) => yScale(v), min, max)}
      {path && <Path d={path} strokeWidth={1.2} stroke={COLORS.line} fill="none" />}
      <Text x={PAD.left} y={CHART_H - 4} style={{ fontSize: 6, fill: COLORS.mutedText }}>
        {data[0]?.label.slice(5)}
      </Text>
      <Text x={CHART_W - PAD.right - 24} y={CHART_H - 4} style={{ fontSize: 6, fill: COLORS.mutedText }}>
        {data[data.length - 1]?.label.slice(5)}
      </Text>
      <Text x={2} y={PAD.top + 4} style={{ fontSize: 6, fill: COLORS.mutedText }}>
        {fmtAxis(max)}
      </Text>
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
  const barWidth = Math.max(1, step * 0.7)
  const zeroY = yScale(0)

  return (
    <ChartFrame>
      {yAxisAndBaseline((v) => yScale(v), min, max)}
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
            fill={d.value >= 0 ? COLORS.positive : COLORS.negative}
          />
        )
      })}
      {showEveryLabel &&
        data.map((d, i) => (
          <Text
            key={`l-${i}`}
            x={PAD.left + i * step + step / 2 - 5}
            y={CHART_H - 4}
            style={{ fontSize: 6, fill: COLORS.mutedText }}
          >
            {d.label}
          </Text>
        ))}
    </ChartFrame>
  )
}

function DistributionSvg({
  distribution,
  labels,
}: {
  distribution: { win: number; breakeven: number; loss: number }
  labels: ChartLabels & { win: string; breakeven: string; loss: string }
}) {
  const rows = [
    { label: labels.win, value: distribution.win, color: COLORS.positive },
    { label: labels.breakeven, value: distribution.breakeven, color: COLORS.mutedText },
    { label: labels.loss, value: distribution.loss, color: COLORS.negative },
  ]
  const total = rows.reduce((s, r) => s + r.value, 0)
  if (total === 0) {
    return <Text style={styles.empty}>{labels.noData}</Text>
  }
  const trackLeft = PAD.left
  const trackWidth = CHART_W - PAD.left - PAD.right
  const rowH = 30

  return (
    <ChartFrame>
      {rows.map((r, i) => {
        const y = 12 + i * rowH
        const w = (r.value / total) * trackWidth
        return (
          <React.Fragment key={i}>
            <Text x={2} y={y - 2} style={{ fontSize: 7, fill: COLORS.text }}>
              {`${r.label}: ${r.value} (${((r.value / total) * 100).toFixed(1)}%)`}
            </Text>
            <Rect x={trackLeft} y={y} width={trackWidth} height={8} fill={COLORS.grid} />
            <Rect x={trackLeft} y={y} width={Math.max(0, w)} height={8} fill={r.color} />
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
  const summary = computeSummary(payload.trades)
  const charts = computeChartData(payload.trades, payload.timezone)
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
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>{strings.equityChart}</Text>
              <LineChartSvg data={charts.equity} labels={noData} />
            </View>
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>{strings.pnlChart}</Text>
              <BarChartSvg data={charts.dailyPnl} labels={noData} />
            </View>
          </View>
          <View style={styles.cardRow}>
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>{strings.weekdayPnl}</Text>
              <BarChartSvg data={charts.weekdayPnl} labels={noData} showEveryLabel />
            </View>
            <View style={styles.chartCard}>
              <Text style={styles.chartTitle}>{strings.tradeDistribution}</Text>
              <DistributionSvg
                distribution={charts.distribution}
                labels={{
                  noData: strings.noChartsAvailable,
                  win: strings.win,
                  breakeven: strings.breakeven,
                  loss: strings.loss,
                }}
              />
            </View>
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
