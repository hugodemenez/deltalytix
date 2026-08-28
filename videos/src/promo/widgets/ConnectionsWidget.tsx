import { Easing, Interactive, interpolate, useCurrentFrame } from "remotion";
import { fontFamily } from "../../fonts";
import { tokens } from "../tokens";
import { PlusIcon, RefreshIcon } from "./Icons";
import { WhiteLogo } from "./WhiteLogo";
import {
  connectionsCopy,
  fileImportChips,
  promoConnections,
} from "./product-copy";

const BEZIER = Easing.bezier(0.16, 1, 0.3, 1);

const outlineButton: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  height: 44,
  paddingLeft: 24,
  paddingRight: 24,
  borderRadius: 4,
  border: "1px solid rgba(255,255,255,0.2)",
  color: tokens.ink,
  fontSize: 16,
  fontWeight: 500,
};

type ConnectionsWidgetProps = {
  readonly startFrame?: number;
};

export const ConnectionsWidget: React.FC<ConnectionsWidgetProps> = ({
  startFrame = 0,
}) => {
  const frame = Math.max(0, useCurrentFrame() - startFrame);

  return (
    <Interactive.Div
      name="Connections page"
      style={{
        width: "100%",
        height: "100%",
        fontFamily,
        color: tokens.ink,
      }}
    >
      <Interactive.Div
        name="Connections header"
        style={{
          opacity: interpolate(frame, [0, 8], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: BEZIER,
          }),
        }}
      >
        <Interactive.Div
          name="Connections title"
          style={{
            fontSize: 48,
            fontWeight: 400,
            letterSpacing: "-0.04em",
            lineHeight: 1.05,
          }}
        >
          {connectionsCopy.title}
        </Interactive.Div>
        <Interactive.Div
          name="Connections description"
          style={{
            marginTop: 12,
            maxWidth: 720,
            color: tokens.subtle,
            fontSize: 18,
            lineHeight: 1.45,
          }}
        >
          {connectionsCopy.description}
        </Interactive.Div>
        <Interactive.Div
          name="Connections actions"
          style={{
            display: "flex",
            gap: 12,
            marginTop: 20,
          }}
        >
          <Interactive.Div
            name="Add connection"
            style={{
              ...outlineButton,
              backgroundColor: tokens.action,
              color: tokens.actionInk,
              border: "none",
            }}
          >
            <PlusIcon name="Add icon" size={16} color={tokens.actionInk} />
            {connectionsCopy.addConnection}
          </Interactive.Div>
          <Interactive.Div name="Upload a file" style={outlineButton}>
            {connectionsCopy.uploadFile}
          </Interactive.Div>
          <Interactive.Div name="Sync all" style={outlineButton}>
            <RefreshIcon name="Sync icon" size={16} color={tokens.ink} />
            {connectionsCopy.syncAll}
          </Interactive.Div>
        </Interactive.Div>
      </Interactive.Div>

      <Interactive.Div
        name="Connection sections"
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          columnGap: 48,
          rowGap: 18,
          marginTop: 22,
        }}
      >
        {promoConnections.map((connection, index) => {
          const start = 8 + index * 4;
          return (
            <Interactive.Div
              key={connection.service}
              name={`${connection.label} section`}
              style={{
                opacity: interpolate(frame, [start, start + 8], [0, 1], {
                  extrapolateLeft: "clamp",
                  extrapolateRight: "clamp",
                  easing: BEZIER,
                }),
              }}
            >
              <Interactive.Div
                name={`${connection.label} heading`}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontSize: 22,
                  fontWeight: 400,
                  letterSpacing: "-0.02em",
                }}
              >
                <WhiteLogo
                  name={`${connection.label} logo`}
                  slug={connection.slug}
                  ext={connection.ext}
                  size={28}
                />
                {connection.label}
              </Interactive.Div>
              <Interactive.Div
                name={`${connection.label} row`}
                style={{
                  marginTop: 8,
                  paddingTop: 12,
                  paddingBottom: 12,
                  borderTop: `1px solid ${tokens.line}`,
                  borderBottom: `1px solid ${tokens.line}`,
                }}
              >
                <Interactive.Div
                  name={`${connection.label} identity`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: 12,
                  }}
                >
                  <Interactive.Span
                    name={`${connection.label} display name`}
                    style={{
                      fontSize: 20,
                      fontWeight: 400,
                      letterSpacing: "-0.02em",
                    }}
                  >
                    {connection.displayName}
                  </Interactive.Span>
                  <Interactive.Span
                    name={`${connection.label} status`}
                    style={{
                      color: tokens.subtle,
                      fontSize: 14,
                      flexShrink: 0,
                    }}
                  >
                    {connectionsCopy.connected}
                  </Interactive.Span>
                </Interactive.Div>
                <Interactive.Div
                  name={`${connection.label} meta`}
                  style={{
                    marginTop: 4,
                    color: tokens.subtle,
                    fontSize: 13,
                  }}
                >
                  {[
                    connection.loginLabel,
                    connectionsCopy.lastSynced,
                    connection.accountCount,
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </Interactive.Div>
                <Interactive.Div
                  name={`${connection.label} account`}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    marginTop: 8,
                    fontSize: 14,
                  }}
                >
                  <Interactive.Span
                    name={`${connection.label} account number`}
                    style={{ fontWeight: 500 }}
                  >
                    {connection.accountNumber}
                  </Interactive.Span>
                  <Interactive.Span
                    name={`${connection.label} trades`}
                    style={{
                      color: tokens.subtle,
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {connection.tradeCount}
                    {" · "}
                    {connectionsCopy.lastTrade}
                  </Interactive.Span>
                </Interactive.Div>
              </Interactive.Div>
            </Interactive.Div>
          );
        })}
      </Interactive.Div>

      <Interactive.Div
        name="File import strip"
        style={{
          marginTop: 16,
          opacity: interpolate(frame, [36, 48], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
            easing: BEZIER,
          }),
        }}
      >
        <Interactive.Div
          name="File import label"
          style={{
            color: tokens.muted,
            fontSize: 12,
            fontWeight: 500,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {connectionsCopy.fileImport}
        </Interactive.Div>
        <Interactive.Div
          name="File import chips"
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: 8,
            marginTop: 8,
          }}
        >
          {fileImportChips.map((chip) => (
            <Interactive.Div
              key={chip.slug}
              name={`${chip.label} chip`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 8,
                height: 32,
                paddingLeft: 8,
                paddingRight: 10,
                borderRadius: 4,
                border: `1px solid ${tokens.border}`,
                fontSize: 13,
                color: tokens.ink,
              }}
            >
              <WhiteLogo
                name={`${chip.label} file logo`}
                slug={chip.slug}
                ext={chip.ext}
                size={14}
              />
              {chip.label}
            </Interactive.Div>
          ))}
        </Interactive.Div>
      </Interactive.Div>
    </Interactive.Div>
  );
};
