import { ImageResponse } from "next/og"
import { getShared } from "@/server/shared"
import type { ReactElement } from "react"
import { Logo } from "@/components/logo"

export const alt = "Shared Trading Performance"
export const size = {
    width: 1200,
    height: 630,
}
export const contentType = "image/png"

// Route segment configuration - these are specialized Route Handlers  
export const runtime = 'nodejs'
export const revalidate = 3600 // 1 hour

export default async function Image({ params }: { params: { slug: string } }) {
    try {
        const sharedData = await getShared(params.slug)
        if (!sharedData) {
            return new Response("Shared data not found", { status: 404 })
        }

        const { params: sharedParams, trades } = sharedData

        // Calculate comprehensive stats
        const totalTrades = trades.length
        const totalPnl = trades.reduce((sum, trade) => sum + (trade.pnl || 0), 0)
        const winningTrades = trades.filter((trade) => (trade.pnl || 0) > 0)
        const losingTrades = trades.filter((trade) => (trade.pnl || 0) < 0)
        const winRate = trades.length > 0 ? (winningTrades.length / trades.length) * 100 : 0

        // Calculate average win/loss for risk-reward ratio
        const avgWin =
            winningTrades.length > 0
                ? winningTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0) / winningTrades.length
                : 0
        const avgLoss =
            losingTrades.length > 0
                ? Math.abs(losingTrades.reduce((sum, trade) => sum + (trade.pnl || 0), 0) / losingTrades.length)
                : 0
        const riskRewardRatio = avgLoss > 0 ? avgWin / avgLoss : 0

        // Calculate cumulative P&L for the equity chart
        const cumulativePnl = trades.reduce((acc, trade) => {
            const lastValue = acc.length > 0 ? acc[acc.length - 1] : 0
            acc.push(lastValue + (trade.pnl || 0))
            return acc
        }, [] as number[])

        // Find min and max for scaling
        const minPnl = Math.min(0, ...cumulativePnl)
        const maxPnl = Math.max(0, ...cumulativePnl)
        const range = Math.max(Math.abs(maxPnl - minPnl), 1)

        // Format the date range
        const fromDate = new Date(sharedParams.dateRange.from)
        const toDate = sharedParams.dateRange.to ? new Date(sharedParams.dateRange.to) : new Date()
        const dateRangeStr = `${fromDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })} - ${toDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}`

        // Equity chart dimensions (full card size)
        const equityChartWidth = 340
        const equityChartHeight = 180
        const equityPadding = 20

        // Generate equity curve path
        const equityPoints = cumulativePnl.map((pnl, i) => {
            const x = equityPadding + (i / Math.max(cumulativePnl.length - 1, 1)) * (equityChartWidth - 2 * equityPadding)
            const y =
                equityPadding +
                (equityChartHeight - 2 * equityPadding) -
                ((pnl - minPnl) / range) * (equityChartHeight - 2 * equityPadding)
            return { x, y, value: pnl }
        })

        const equityPathData =
            equityPoints.length > 1
                ? `M ${equityPoints[0].x} ${equityPoints[0].y} ` +
                equityPoints
                    .slice(1)
                    .map((point) => `L ${point.x} ${point.y}`)
                    .join(" ")
                : `M ${equityChartWidth / 2} ${equityChartHeight / 2}`

        // Doughnut chart calculations
        const doughnutRadius = 70
        const doughnutInnerRadius = 45
        const doughnutCenterX = 90
        const doughnutCenterY = 90

        const winPercentage = winRate / 100
        const lossPercentage = 1 - winPercentage

        // Calculate doughnut paths
        const createArcPath = (startAngle: number, endAngle: number, outerRadius: number, innerRadius: number) => {
            const start = polarToCartesian(doughnutCenterX, doughnutCenterY, outerRadius, endAngle)
            const end = polarToCartesian(doughnutCenterX, doughnutCenterY, outerRadius, startAngle)
            const innerStart = polarToCartesian(doughnutCenterX, doughnutCenterY, innerRadius, endAngle)
            const innerEnd = polarToCartesian(doughnutCenterX, doughnutCenterY, innerRadius, startAngle)

            const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1"

            return [
                "M",
                start.x,
                start.y,
                "A",
                outerRadius,
                outerRadius,
                0,
                largeArcFlag,
                0,
                end.x,
                end.y,
                "L",
                innerEnd.x,
                innerEnd.y,
                "A",
                innerRadius,
                innerRadius,
                0,
                largeArcFlag,
                1,
                innerStart.x,
                innerStart.y,
                "Z",
            ].join(" ")
        }

        function polarToCartesian(centerX: number, centerY: number, radius: number, angleInDegrees: number) {
            const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0
            return {
                x: centerX + radius * Math.cos(angleInRadians),
                y: centerY + radius * Math.sin(angleInRadians),
            }
        }

        const winAngle = winPercentage * 360
        const lossAngle = lossPercentage * 360

        const winPath = createArcPath(0, winAngle, doughnutRadius, doughnutInnerRadius)
        const lossPath = createArcPath(winAngle, 360, doughnutRadius, doughnutInnerRadius)

        // Determine colors based on performance
        const isPositive = totalPnl >= 0
        const primaryColor = isPositive ? "#10B981" : "#EF4444"
        const secondaryColor = isPositive ? "#059669" : "#DC2626"

        const element = (
            <div
                style={{
                    display: "flex",
                    width: "100%",
                    height: "100%",
                    background: "linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #334155 100%)",
                    fontFamily: "system-ui, -apple-system, sans-serif",
                    padding: "32px",
                    position: "relative",
                }}
            >
                {/* Left Column */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        width: "60%",
                        marginRight: "24px",
                    }}
                >
                    {/* Header */}
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            marginBottom: "24px",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                alignItems: "center",
                                marginBottom: "8px",
                            }}
                        >
                            {/* Logo and Brand */}
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    marginRight: "16px",
                                }}
                            >
                                <div
                                    style={{
                                        width: "24px",
                                        height: "24px",
                                        marginRight: "8px",
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "center",
                                    }}
                                >
                                    <svg viewBox="0 0 255 255" xmlns="http://www.w3.org/2000/svg" style={{ width: "24px", height: "24px" }}>
                                        <path fillRule="evenodd" clipRule="evenodd" d="M159 63L127.5 0V255H255L236.5 218H159V63Z" fill="#F8FAFC" />
                                        <path fillRule="evenodd" clipRule="evenodd" d="M-3.05176e-05 255L127.5 -5.96519e-06L127.5 255L-3.05176e-05 255ZM64 217L121 104L121 217L64 217Z" fill="#F8FAFC" />
                                    </svg>
                                </div>
                                <span
                                    style={{
                                        fontSize: "20px",
                                        fontWeight: "700",
                                        color: "#F8FAFC",
                                        marginRight: "16px",
                                    }}
                                >
                                    Deltalytix
                                </span>
                            </div>

                            <div
                                style={{
                                    width: "8px",
                                    height: "8px",
                                    borderRadius: "50%",
                                    backgroundColor: primaryColor,
                                    marginRight: "12px",
                                }}
                            />
                            <h1
                                style={{
                                    fontSize: "32px",
                                    fontWeight: "700",
                                    color: "#F8FAFC",
                                    margin: "0",
                                    letterSpacing: "-0.025em",
                                }}
                            >
                                {sharedParams.title || "Trading Performance"}
                            </h1>
                        </div>
                        <p
                            style={{
                                fontSize: "16px",
                                color: "#94A3B8",
                                margin: "0",
                                fontWeight: "500",
                            }}
                        >
                            {dateRangeStr} • {totalTrades} trades
                        </p>
                    </div>

                    {/* Stats Row */}
                    <div
                        style={{
                            display: "flex",
                            gap: "16px",
                            marginBottom: "24px",
                        }}
                    >
                        {/* Total P&L */}
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                backgroundColor: "rgba(255, 255, 255, 0.05)",
                                borderRadius: "12px",
                                padding: "20px",
                                border: `2px solid ${primaryColor}`,
                                flex: "1",
                            }}
                        >
                            <p
                                style={{
                                    fontSize: "12px",
                                    color: "#94A3B8",
                                    margin: "0 0 6px 0",
                                    fontWeight: "600",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                }}
                            >
                                Total P&L
                            </p>
                            <p
                                style={{
                                    fontSize: "28px",
                                    fontWeight: "800",
                                    color: primaryColor,
                                    margin: "0",
                                    letterSpacing: "-0.025em",
                                }}
                            >
                                {totalPnl >= 0 ? "+" : ""}${totalPnl.toLocaleString()}
                            </p>
                        </div>

                        {/* Risk/Reward */}
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                backgroundColor: "rgba(255, 255, 255, 0.05)",
                                borderRadius: "12px",
                                padding: "20px",
                                border: "2px solid rgba(148, 163, 184, 0.2)",
                                flex: "1",
                            }}
                        >
                            <p
                                style={{
                                    fontSize: "12px",
                                    color: "#94A3B8",
                                    margin: "0 0 6px 0",
                                    fontWeight: "600",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                }}
                            >
                                R:R Ratio
                            </p>
                            <p
                                style={{
                                    fontSize: "28px",
                                    fontWeight: "800",
                                    color: "#F8FAFC",
                                    margin: "0",
                                    letterSpacing: "-0.025em",
                                }}
                            >
                                {riskRewardRatio > 0 ? riskRewardRatio.toFixed(2) : "--"}
                            </p>
                        </div>
                    </div>

                    {/* Equity Chart Card */}
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            backgroundColor: "rgba(255, 255, 255, 0.05)",
                            borderRadius: "16px",
                            padding: "20px",
                            border: "1px solid rgba(148, 163, 184, 0.1)",
                            flex: "1",
                        }}
                    >
                        <p
                            style={{
                                fontSize: "14px",
                                color: "#94A3B8",
                                margin: "0 0 16px 0",
                                fontWeight: "600",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                            }}
                        >
                            Equity Curve
                        </p>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                flex: "1",
                            }}
                        >
                            <svg
                                width={equityChartWidth}
                                height={equityChartHeight}
                                style={{
                                    overflow: "visible",
                                }}
                            >
                                {/* Gradient definition */}
                                <defs>
                                    <linearGradient id="equityGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                                        <stop offset="0%" stopColor={primaryColor} stopOpacity="0.4" />
                                        <stop offset="100%" stopColor={primaryColor} stopOpacity="0.05" />
                                    </linearGradient>
                                </defs>

                                {/* Grid lines */}
                                {[0, 0.25, 0.5, 0.75, 1].map((ratio) => (
                                    <line
                                        key={ratio}
                                        x1={equityPadding}
                                        y1={equityPadding + ratio * (equityChartHeight - 2 * equityPadding)}
                                        x2={equityChartWidth - equityPadding}
                                        y2={equityPadding + ratio * (equityChartHeight - 2 * equityPadding)}
                                        stroke="rgba(148, 163, 184, 0.1)"
                                        strokeWidth="1"
                                    />
                                ))}

                                {/* Zero line */}
                                {minPnl < 0 && maxPnl > 0 && (
                                    <line
                                        x1={equityPadding}
                                        y1={
                                            equityPadding +
                                            (equityChartHeight - 2 * equityPadding) -
                                            ((0 - minPnl) / range) * (equityChartHeight - 2 * equityPadding)
                                        }
                                        x2={equityChartWidth - equityPadding}
                                        y2={
                                            equityPadding +
                                            (equityChartHeight - 2 * equityPadding) -
                                            ((0 - minPnl) / range) * (equityChartHeight - 2 * equityPadding)
                                        }
                                        stroke="rgba(148, 163, 184, 0.4)"
                                        strokeWidth="2"
                                        strokeDasharray="6,6"
                                    />
                                )}

                                {/* Area under curve */}
                                {equityPoints.length > 1 && (
                                    <path
                                        d={`${equityPathData} L ${equityPoints[equityPoints.length - 1].x} ${equityChartHeight - equityPadding} L ${equityPoints[0].x} ${equityChartHeight - equityPadding} Z`}
                                        fill="url(#equityGradient)"
                                    />
                                )}

                                {/* Main line */}
                                {equityPoints.length > 1 && (
                                    <path
                                        d={equityPathData}
                                        fill="none"
                                        stroke={primaryColor}
                                        strokeWidth="4"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                )}

                                {/* Data points */}
                                {equityPoints.map((point, index) => (
                                    <circle key={index} cx={point.x} cy={point.y} r="2" fill={primaryColor} opacity="0.6" />
                                ))}

                                {/* End point indicator */}
                                {equityPoints.length > 0 && (
                                    <circle
                                        cx={equityPoints[equityPoints.length - 1].x}
                                        cy={equityPoints[equityPoints.length - 1].y}
                                        r="6"
                                        fill={primaryColor}
                                        stroke="rgba(15, 23, 42, 0.8)"
                                        strokeWidth="3"
                                    />
                                )}
                            </svg>
                        </div>
                    </div>
                </div>

                {/* Right Column */}
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        width: "40%",
                        gap: "24px",
                    }}
                >
                    {/* Win Rate Doughnut Chart */}
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            backgroundColor: "rgba(255, 255, 255, 0.05)",
                            borderRadius: "16px",
                            padding: "20px",
                            border: "1px solid rgba(148, 163, 184, 0.1)",
                            flex: "1",
                        }}
                    >
                        <p
                            style={{
                                fontSize: "14px",
                                color: "#94A3B8",
                                margin: "0 0 16px 0",
                                fontWeight: "600",
                                textTransform: "uppercase",
                                letterSpacing: "0.05em",
                            }}
                        >
                            Win/Loss Distribution
                        </p>
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                flex: "1",
                                position: "relative",
                            }}
                        >
                            <svg
                                width="180"
                                height="180"
                                style={{
                                    overflow: "visible",
                                }}
                            >
                                {/* Win segment */}
                                {winPercentage > 0 && (
                                    <path d={winPath} fill="#10B981" stroke="rgba(15, 23, 42, 0.2)" strokeWidth="2" />
                                )}

                                {/* Loss segment */}
                                {lossPercentage > 0 && (
                                    <path d={lossPath} fill="#EF4444" stroke="rgba(15, 23, 42, 0.2)" strokeWidth="2" />
                                )}
                            </svg>
                        </div>

                        {/* Legend */}
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "center",
                                gap: "20px",
                                marginTop: "16px",
                            }}
                        >
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                }}
                            >
                                <div
                                    style={{
                                        width: "12px",
                                        height: "12px",
                                        borderRadius: "50%",
                                        backgroundColor: "#10B981",
                                        display: "flex",
                                    }}
                                />
                                <span
                                    style={{
                                        fontSize: "12px",
                                        color: "#94A3B8",
                                        fontWeight: "600",
                                    }}
                                >
                                    Wins ({winningTrades.length})
                                </span>
                            </div>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "8px",
                                }}
                            >
                                <div
                                    style={{
                                        width: "12px",
                                        height: "12px",
                                        borderRadius: "50%",
                                        backgroundColor: "#EF4444",
                                        display: "flex",
                                    }}
                                />
                                <span
                                    style={{
                                        fontSize: "12px",
                                        color: "#94A3B8",
                                        fontWeight: "600",
                                    }}
                                >
                                    Losses ({losingTrades.length})
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Additional Stats */}
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "12px",
                        }}
                    >
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                backgroundColor: "rgba(255, 255, 255, 0.05)",
                                borderRadius: "12px",
                                padding: "16px",
                                border: "1px solid rgba(148, 163, 184, 0.1)",
                            }}
                        >
                            <p
                                style={{
                                    fontSize: "12px",
                                    color: "#94A3B8",
                                    margin: "0 0 4px 0",
                                    fontWeight: "600",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                }}
                            >
                                Avg Win
                            </p>
                            <p
                                style={{
                                    fontSize: "20px",
                                    fontWeight: "700",
                                    color: "#10B981",
                                    margin: "0",
                                }}
                            >
                                +${avgWin.toFixed(0)}
                            </p>
                        </div>
                        <div
                            style={{
                                display: "flex",
                                flexDirection: "column",
                                backgroundColor: "rgba(255, 255, 255, 0.05)",
                                borderRadius: "12px",
                                padding: "16px",
                                border: "1px solid rgba(148, 163, 184, 0.1)",
                            }}
                        >
                            <p
                                style={{
                                    fontSize: "12px",
                                    color: "#94A3B8",
                                    margin: "0 0 4px 0",
                                    fontWeight: "600",
                                    textTransform: "uppercase",
                                    letterSpacing: "0.05em",
                                }}
                            >
                                Avg Loss
                            </p>
                            <p
                                style={{
                                    fontSize: "20px",
                                    fontWeight: "700",
                                    color: "#EF4444",
                                    margin: "0",
                                }}
                            >
                                -${avgLoss.toFixed(0)}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Decorative elements */}
                <div
                    style={{
                        position: "absolute",
                        top: "0",
                        right: "0",
                        width: "200px",
                        height: "200px",
                        background: `radial-gradient(circle, ${primaryColor}15 0%, transparent 70%)`,
                        borderRadius: "50%",
                        transform: "translate(50%, -50%)",
                        display: "flex",
                    }}
                />


            </div>
        ) as ReactElement

        return new ImageResponse(element, {
            ...size,
            headers: {
                "Cache-Control": "public, max-age=3600, s-maxage=3600, stale-while-revalidate=3600",
                "CDN-Cache-Control": "public, max-age=3600", 
                "Vercel-CDN-Cache-Control": "public, max-age=3600",
            },
        })
    } catch (e: unknown) {
        console.log(e instanceof Error ? e.message : "Unknown error")
        return new Response("Failed to generate the image", { status: 500 })
    }
}
