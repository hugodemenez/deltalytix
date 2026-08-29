import { AbsoluteFill, Easing, Interactive, interpolate, useCurrentFrame } from "remotion";
import { fontFamily } from "../../fonts";
import { usePromoTokens } from "../tokens";
import {
  DASH_CHAT_AT,
  DASH_CONN_AT,
  DASH_PAGE_PX,
  DASH_PROP_AT,
  DASH_SCROLL_TO_CHAT,
  DASH_SCROLL_TO_CONN,
  DASH_SCROLL_TO_PROP,
} from "../timing";
import { ChatWidget } from "../widgets/ChatWidget";
import { ConnectionsWidget } from "../widgets/ConnectionsWidget";
import { DashboardOverview } from "../widgets/DashboardOverview";
import { PropFirmCard } from "../widgets/PropFirmCard";
import {
  chatFeatureCaption,
  connectionsFeatureCaption,
  promoPropAccounts,
  propFirmCaption,
} from "../widgets/product-copy";

const SCROLL_EASE = Easing.inOut(Easing.cubic);

type SectionCaptionProps = {
  readonly name: string;
  readonly eyebrow: string;
  readonly title: string;
};

const SectionCaption: React.FC<SectionCaptionProps> = ({
  name,
  eyebrow,
  title,
}) => {
  const tokens = usePromoTokens();

  return (
    <Interactive.Div
      name={`${name} caption`}
      style={{
        position: "absolute",
        left: 80,
        top: 56,
        width: 1760,
      }}
    >
      <Interactive.Div
        name={`${name} eyebrow`}
        style={{
          color: tokens.muted,
          fontSize: 16,
          fontWeight: 500,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
        }}
      >
        {eyebrow}
      </Interactive.Div>
      <Interactive.Div
        name={`${name} title`}
        style={{
          marginTop: 8,
          color: tokens.ink,
          fontSize: 40,
          fontWeight: 300,
          letterSpacing: "-0.05em",
          lineHeight: 1.1,
        }}
      >
        {title}
      </Interactive.Div>
    </Interactive.Div>
  );
};

const SectionStage: React.FC<{
  readonly name: string;
  readonly children: React.ReactNode;
}> = ({ name, children }) => {
  return (
    <Interactive.Div
      name={`${name} stage`}
      style={{
        position: "absolute",
        left: 80,
        top: 160,
        width: 1760,
        height: 860,
      }}
    >
      {children}
    </Interactive.Div>
  );
};

const pageStyle = (top: number): React.CSSProperties => ({
  position: "absolute",
  left: 0,
  top,
  width: 1920,
  height: DASH_PAGE_PX,
});

/**
 * One long dashboard. Calendar / equity / P&L share the first viewport,
 * then the camera translates down (no scale) and later widgets play as
 * they enter.
 */
export const DashboardScroll: React.FC = () => {
  const tokens = usePromoTokens();
  const frame = useCurrentFrame();
  const scrollY = Math.round(
    interpolate(
      frame,
      [
        0,
        DASH_SCROLL_TO_CHAT,
        DASH_CHAT_AT,
        DASH_SCROLL_TO_PROP,
        DASH_PROP_AT,
        DASH_SCROLL_TO_CONN,
        DASH_CONN_AT,
      ],
      [0, 0, DASH_PAGE_PX, DASH_PAGE_PX, DASH_PAGE_PX * 2, DASH_PAGE_PX * 2, DASH_PAGE_PX * 3],
      {
        extrapolateLeft: "clamp",
        extrapolateRight: "clamp",
        easing: SCROLL_EASE,
      },
    ),
  );

  return (
    <AbsoluteFill
      name="Dashboard scroll"
      style={{
        overflow: "hidden",
        backgroundColor: tokens.canvas,
        fontFamily,
      }}
    >
      <Interactive.Div
        name="Dashboard pages"
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          width: 1920,
          height: DASH_PAGE_PX * 4,
          translate: `0px ${-scrollY}px`,
        }}
      >
        <Interactive.Div name="Overview page" style={pageStyle(0)}>
          <SectionCaption
            name="Overview"
            eyebrow="One dashboard"
            title="Calendar, equity, and P&L together."
          />
          <SectionStage name="Overview">
            <DashboardOverview draw />
          </SectionStage>
        </Interactive.Div>

        <Interactive.Div name="Chat page" style={pageStyle(DASH_PAGE_PX)}>
          <SectionCaption
            name="Chat"
            eyebrow={chatFeatureCaption.eyebrow}
            title={chatFeatureCaption.title}
          />
          <SectionStage name="Chat">
            <ChatWidget startFrame={DASH_SCROLL_TO_CHAT} />
          </SectionStage>
        </Interactive.Div>

        <Interactive.Div name="Accounts page" style={pageStyle(DASH_PAGE_PX * 2)}>
          <SectionCaption
            name="Accounts"
            eyebrow={propFirmCaption.eyebrow}
            title={propFirmCaption.title}
          />
          <SectionStage name="Accounts">
            <Interactive.Div
              name="Prop firm row"
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr 1fr",
                alignItems: "start",
                gap: 20,
                width: "100%",
              }}
            >
              {promoPropAccounts.map((account, index) => (
                <PropFirmCard
                  key={account.number}
                  account={account}
                  delay={DASH_SCROLL_TO_PROP + 4 + index * 6}
                />
              ))}
            </Interactive.Div>
          </SectionStage>
        </Interactive.Div>

        <Interactive.Div name="Connections page" style={pageStyle(DASH_PAGE_PX * 3)}>
          <SectionCaption
            name="Connections"
            eyebrow={connectionsFeatureCaption.eyebrow}
            title={connectionsFeatureCaption.title}
          />
          <SectionStage name="Connections">
            <ConnectionsWidget startFrame={DASH_SCROLL_TO_CONN} />
          </SectionStage>
        </Interactive.Div>
      </Interactive.Div>
    </AbsoluteFill>
  );
};
