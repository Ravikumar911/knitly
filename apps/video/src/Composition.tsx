import {
  AbsoluteFill,
  Audio,
  Easing,
  Img,
  interpolate,
  Sequence,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from "remotion";

const palette = {
  ink: "#10130f",
  paper: "#f7f7f0",
  mist: "#e8f1eb",
  line: "rgba(16, 19, 15, 0.12)",
  green: "#30bf72",
  citron: "#d8f04c",
  coral: "#ff6b57",
  blue: "#5d86ff",
  violet: "#9b7cff",
  muted: "#6d746d",
};

const brand = {
  bg: "#fafafa",
  panel: "#ffffff",
  ink: "#0a0a0a",
  muted: "#525252",
  faint: "#737373",
  border: "rgba(0, 0, 0, 0.08)",
  violet: "#635bff",
  blue: "#2f6ceb",
  sky: "#0ea5e9",
  teal: "#14b8a6",
  coral: "#ff5f57",
  green: "#10b981",
  gradient:
    "linear-gradient(135deg, #635bff 0%, #2f6ceb 38%, #0ea5e9 68%, #14b8a6 100%)",
  softGradient:
    "linear-gradient(135deg, rgba(99,91,255,0.12), rgba(47,108,235,0.08), rgba(20,184,166,0.1))",
  shadow:
    "0 1px 2px rgba(0,0,0,0.04), 0 28px 80px -32px rgba(47,108,235,0.35)",
};

const ease = Easing.out(Easing.cubic);

const soundtrack = {
  src: "audio/powerhouse-first-30.mp3",
  title: "Powerhouse",
  artist: "Anirudh",
  source: "Local file",
};

const clamp = (value: number) => Math.max(0, Math.min(1, value));

// Legacy linear tween (kept for a few internal transitions)
const between = (frame: number, start: number, end: number) =>
  interpolate(frame, [start, end], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: ease,
  });

const sceneFade = (frame: number, start: number, end: number) => {
  const fadeIn = between(frame, start, start + 24);
  const fadeOut = 1 - between(frame, end - 24, end);
  return Math.min(fadeIn, fadeOut);
};

// === VIRAL VIDEO PHYSICS (per marketing feedback) ===
// High-stiffness spring for energetic "pop" and bounce. No more slow linear fades.
const POP = { stiffness: 340, damping: 21, mass: 0.55 };
const BOUNCE = { stiffness: 260, damping: 16, mass: 0.7 };

function popSpring(frame: number, delay = 0) {
  return spring({
    frame: Math.max(0, frame - delay),
    fps: 30,
    config: POP,
    from: 0,
    to: 1,
  });
}

function bounceSpring(frame: number, delay = 0) {
  return spring({
    frame: Math.max(0, frame - delay),
    fps: 30,
    config: BOUNCE,
    from: 0,
    to: 1,
  });
}

const SceneTransition = ({
  children,
  duration,
  enterFrom = 54,
  exitTo = -36,
  dark = false,
}: {
  children: React.ReactNode;
  duration: number;
  enterFrom?: number;
  exitTo?: number;
  dark?: boolean;
}) => {
  const frame = useCurrentFrame();
  const enterSpring = spring({
    frame,
    fps: 30,
    config: { stiffness: 190, damping: 24, mass: 0.65 },
    from: 0,
    to: 1,
  });
  const enter = enterFrom === 0 ? 1 : enterSpring;
  const exit = interpolate(frame, [duration - 22, duration], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.in(Easing.cubic),
  });
  const opacity = Math.min(enter, 1 - exit);
  const y = (1 - enter) * enterFrom + exit * exitTo;
  const scale = 0.982 + enter * 0.018 + exit * 0.012;
  const blur = (1 - enter) * 4 + exit * 5;

  return (
    <AbsoluteFill
      style={{
        background: dark ? palette.ink : palette.paper,
        opacity,
        transform: `translateY(${y}px) scale(${scale})`,
        filter: `blur(${blur}px)`,
        transformOrigin: "50% 50%",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

// Kinetic typography: word-by-word or char-by-char with staggered springs
const KineticWords = ({
  text,
  start,
  delayStep = 5,
}: {
  text: string;
  start: number;
  delayStep?: number;
}) => {
  const frame = useCurrentFrame();
  const words = text.split(/\s+/);
  return (
    <>
      {words.map((word, i) => {
        const p = popSpring(frame, start + i * delayStep);
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              opacity: p,
              transform: `translateY(${(1 - p) * 32}px) scale(${0.6 + p * 0.4})`,
              marginRight: "0.18em",
              willChange: "transform, opacity",
            }}
          >
            {word}
          </span>
        );
      })}
    </>
  );
};

// Typewriter for CTA commands.
const Typewriter = ({
  text,
  start,
  speed = 2,
  showCursor = true,
}: {
  text: string;
  start: number;
  speed?: number;
  showCursor?: boolean;
}) => {
  const frame = useCurrentFrame();
  const hasStarted = frame >= start;
  const revealed = Math.max(0, Math.floor((frame - start) / speed));
  const visible = text.slice(0, revealed);
  const cursor = showCursor && hasStarted && revealed < text.length && (frame % 6 < 3) ? "▌" : "";
  return (
    <>
      {visible}
      {cursor}
    </>
  );
};

// Terminal window primitive (emphasizes the local/hacker aesthetic early)
const TerminalWindow = ({
  children,
  title = "slashcash — local",
  width = 820,
  bodyMinHeight,
}: {
  children?: React.ReactNode;
  title?: string;
  width?: number;
  bodyMinHeight?: number;
}) => (
  <div
    style={{
      width,
      borderRadius: 14,
      overflow: "hidden",
      border: "1px solid rgba(255,255,255,0.12)",
      boxShadow: "0 30px 120px -20px rgba(0,0,0,0.6), 0 0 0 1px rgba(0,0,0,0.6) inset",
      background: "#0a0c0a",
      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
    }}
  >
    <div
      style={{
        height: 38,
        background: "#10130f",
        display: "flex",
        alignItems: "center",
        padding: "0 14px",
        gap: 8,
        borderBottom: "1px solid rgba(255,255,255,0.08)",
      }}
    >
      <div style={{ display: "flex", gap: 6 }}>
        <div style={{ width: 11, height: 11, borderRadius: 999, background: "#ff5f57" }} />
        <div style={{ width: 11, height: 11, borderRadius: 999, background: "#febc2e" }} />
        <div style={{ width: 11, height: 11, borderRadius: 999, background: "#28c840" }} />
      </div>
      <div style={{ color: "rgba(247,247,240,0.6)", fontSize: 13, marginLeft: 10 }}>{title}</div>
    </div>
    <div
      style={{
        padding: "18px 20px",
        color: "#d8f04c",
        fontSize: 21,
        lineHeight: 1.35,
        minHeight: bodyMinHeight,
      }}
    >
      {children}
    </div>
  </div>
);

const pop = (frame: number, start: number) => {
  const t = between(frame, start, start + 26);
  return 0.86 + Math.sin(t * Math.PI) * 0.08 + t * 0.14;
};

const Logo = ({ dark = false }: { dark?: boolean }) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: 14,
      color: dark ? palette.ink : palette.paper,
      fontWeight: 850,
      fontSize: 44,
      letterSpacing: 0,
    }}
  >
    <Img
      src={staticFile("brand/slash-cash-coin.svg")}
      style={{
        width: 56,
        height: 56,
        filter: dark
          ? "drop-shadow(0 10px 20px rgba(47,108,235,0.22))"
          : "drop-shadow(0 10px 20px rgba(216,240,76,0.14))",
      }}
    />
    <span>slash.cash</span>
  </div>
);

const Shell = ({ children }: { children?: React.ReactNode }) => (
  <AbsoluteFill
    style={{
      background:
        "linear-gradient(155deg, #10130f 0%, #182017 40%, #d8f04c 155%)",
      color: palette.paper,
      fontFamily:
        'Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      overflow: "hidden",
    }}
  >
    <div
      style={{
        position: "absolute",
        inset: 0,
        backgroundImage:
          "linear-gradient(rgba(247, 247, 240, 0.055) 1px, transparent 1px), linear-gradient(90deg, rgba(247, 247, 240, 0.055) 1px, transparent 1px)",
        backgroundSize: "72px 72px",
        maskImage:
          "linear-gradient(180deg, rgba(0,0,0,0.95), rgba(0,0,0,0.25))",
      }}
    />
    {children}
  </AbsoluteFill>
);

const Pill = ({
  children,
  tone = "light",
}: {
  children: React.ReactNode;
  tone?: "light" | "green" | "dark";
}) => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      minHeight: 56,
      padding: "0 24px",
      borderRadius: 999,
      background:
        tone === "green"
          ? palette.citron
          : tone === "dark"
            ? "rgba(16, 19, 15, 0.82)"
            : "rgba(247, 247, 240, 0.16)",
      color: tone === "green" ? palette.ink : palette.paper,
      border:
        tone === "green"
          ? "1px solid rgba(16, 19, 15, 0.08)"
          : "1px solid rgba(247, 247, 240, 0.18)",
      fontSize: 27,
      fontWeight: 760,
      letterSpacing: 0,
      whiteSpace: "nowrap",
    }}
  >
    {children}
  </div>
);

const ReceiptStack = ({ frame }: { frame: number }) => {
  const labels = ["Gmail receipt", "PDF bill", "SQLite row"];
  return (
    <div style={{ position: "relative", width: 760, height: 520 }}>
      {labels.map((label, index) => {
        const enter = between(frame, 32 + index * 13, 68 + index * 13);
        const rotate = [-5, 3, -1][index];
        return (
          <div
            key={label}
            style={{
              position: "absolute",
              left: 34 + index * 68,
              top: 48 + index * 58,
              width: 570,
              height: 290,
              borderRadius: 28,
              background: palette.paper,
              color: palette.ink,
              boxShadow: "0 30px 90px rgba(0, 0, 0, 0.24)",
              transform: `translateY(${(1 - enter) * 90}px) rotate(${rotate}deg) scale(${0.9 + enter * 0.1})`,
              opacity: enter,
              padding: 34,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 28,
              }}
            >
              <div style={{ fontSize: 30, fontWeight: 850 }}>{label}</div>
              <div
                style={{
                  width: 72,
                  height: 38,
                  borderRadius: 999,
                  background:
                    index === 0
                      ? palette.coral
                      : index === 1
                        ? palette.blue
                        : palette.green,
                }}
              />
            </div>
            <div style={{ display: "grid", gap: 14 }}>
              {[0, 1, 2].map((line) => (
                <div
                  key={line}
                  style={{
                    height: 18,
                    borderRadius: 999,
                    width: `${92 - line * 16}%`,
                    background: "rgba(16, 19, 15, 0.12)",
                  }}
                />
              ))}
            </div>
            <div
              style={{
                position: "absolute",
                right: 34,
                bottom: 30,
                fontSize: 42,
                fontWeight: 900,
              }}
            >
              INR
            </div>
          </div>
        );
      })}
    </div>
  );
};

const HookScene = () => {
  const frame = useCurrentFrame();
  const opacity = sceneFade(frame, 0, 170);
  const title = between(frame, 10, 54);

  return (
    <AbsoluteFill style={{ opacity }}>
      <div style={{ position: "absolute", left: 72, top: 82 }}>
        <Logo />
      </div>
      <div
        style={{
          position: "absolute",
          left: 72,
          right: 72,
          top: 250,
          transform: `translateY(${(1 - title) * 42}px)`,
        }}
      >
        <div
          style={{
            fontSize: 92,
            lineHeight: 0.98,
            fontWeight: 940,
            letterSpacing: 0,
            maxWidth: 900,
          }}
        >
          Your food orders are trying to tell you something.
        </div>
        <div
          style={{
            marginTop: 34,
            fontSize: 36,
            lineHeight: 1.18,
            color: "rgba(247, 247, 240, 0.82)",
            maxWidth: 760,
            fontWeight: 570,
          }}
        >
          Turn receipts into a private spending dashboard.
        </div>
      </div>
      <div style={{ position: "absolute", left: 136, top: 760 }}>
        <ReceiptStack frame={frame} />
      </div>
      <div
        style={{
          position: "absolute",
          left: 72,
          bottom: 120,
          display: "flex",
          gap: 18,
          opacity: between(frame, 92, 128),
        }}
      >
        <Pill>Gmail</Pill>
        <Pill>Swiggy</Pill>
        <Pill tone="green">local-first</Pill>
      </div>
    </AbsoluteFill>
  );
};

const FlowCard = ({
  title,
  body,
  color,
  delay,
}: {
  title: string;
  body: string;
  color: string;
  delay: number;
}) => {
  const frame = useCurrentFrame();
  const enter = between(frame, delay, delay + 32);
  return (
    <div
      style={{
        width: 860,
        minHeight: 230,
        borderRadius: 34,
        background: palette.paper,
        color: palette.ink,
        boxShadow: "0 34px 100px rgba(0, 0, 0, 0.18)",
        padding: 38,
        opacity: enter,
        transform: `translateX(${(1 - enter) * 120}px)`,
      }}
    >
      <div style={{ display: "flex", gap: 26, alignItems: "flex-start" }}>
        <div
          style={{
            width: 82,
            height: 82,
            borderRadius: 24,
            background: color,
            flexShrink: 0,
            display: "grid",
            placeItems: "center",
            fontSize: 38,
            fontWeight: 920,
          }}
        >
          {title.slice(0, 1)}
        </div>
        <div>
          <div style={{ fontSize: 40, fontWeight: 900, marginBottom: 12 }}>
            {title}
          </div>
          <div
            style={{
              fontSize: 29,
              lineHeight: 1.22,
              color: palette.muted,
              fontWeight: 560,
            }}
          >
            {body}
          </div>
        </div>
      </div>
    </div>
  );
};

const PipelineScene = () => {
  const frame = useCurrentFrame();
  const opacity = sceneFade(frame, 145, 330);

  return (
    <AbsoluteFill style={{ opacity }}>
      <div
        style={{
          position: "absolute",
          left: 72,
          right: 72,
          top: 128,
        }}
      >
        <Pill tone="green">Runs on your laptop</Pill>
        <div
          style={{
            marginTop: 42,
            fontSize: 78,
            lineHeight: 0.98,
            fontWeight: 940,
            letterSpacing: 0,
          }}
        >
          Your data stays where your money does.
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 110,
          top: 560,
          display: "grid",
          gap: 34,
        }}
      >
        <FlowCard
          delay={170}
          color={palette.coral}
          title="IMAP sync"
          body="Connect Gmail with an app password. No hosted auth."
        />
        <FlowCard
          delay={210}
          color={palette.citron}
          title="Deterministic ingest"
          body="Receipts and PDFs are parsed into correct Swiggy records."
        />
        <FlowCard
          delay={250}
          color={palette.green}
          title="SQLite dashboard"
          body="Transactions, charts, and attachments live locally."
        />
      </div>
    </AbsoluteFill>
  );
};

const MiniDonut = ({ frame }: { frame: number }) => {
  const fill = between(frame, 315, 370);
  return (
    <div
      style={{
        width: 238,
        height: 238,
        borderRadius: "50%",
        background: `conic-gradient(${palette.green} 0 ${fill * 118}deg, ${palette.coral} ${fill * 118}deg ${fill * 242}deg, ${palette.blue} ${fill * 242}deg ${fill * 328}deg, rgba(16,19,15,0.1) ${fill * 328}deg 360deg)`,
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 46,
          borderRadius: "50%",
          background: palette.paper,
          display: "grid",
          placeItems: "center",
          fontSize: 30,
          fontWeight: 900,
        }}
      >
        128
      </div>
    </div>
  );
};

const MetricCard = ({
  label,
  value,
  color,
  delay,
}: {
  label: string;
  value: string;
  color: string;
  delay: number;
}) => {
  const frame = useCurrentFrame();
  const enter = between(frame, delay, delay + 22);
  return (
    <div
      style={{
        background: "#ffffff",
        border: `1px solid ${palette.line}`,
        borderRadius: 24,
        padding: 24,
        minHeight: 150,
        transform: `scale(${pop(frame, delay)})`,
        opacity: enter,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div
          style={{
            fontSize: 22,
            color: palette.muted,
            fontWeight: 720,
          }}
        >
          {label}
        </div>
        <div
          style={{
            width: 34,
            height: 34,
            borderRadius: 11,
            background: color,
          }}
        />
      </div>
      <div style={{ marginTop: 20, fontSize: 42, fontWeight: 930 }}>
        {value}
      </div>
    </div>
  );
};

const DashboardMock = () => {
  const frame = useCurrentFrame();
  const enter = between(frame, 285, 340);
  return (
    <div
      style={{
        width: 900,
        height: 980,
        borderRadius: 46,
        background: palette.paper,
        color: palette.ink,
        boxShadow: "0 38px 120px rgba(0, 0, 0, 0.28)",
        padding: 30,
        transform: `translateY(${(1 - enter) * 80}px)`,
        opacity: enter,
      }}
    >
      <div
        style={{
          height: 86,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          borderBottom: `1px solid ${palette.line}`,
          paddingBottom: 20,
          marginBottom: 28,
        }}
      >
        <Logo dark />
        <div
          style={{
            color: palette.muted,
            fontSize: 22,
            fontWeight: 760,
          }}
        >
          Last 30 days
        </div>
      </div>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 18,
        }}
      >
        <MetricCard
          delay={320}
          label="Total spend"
          value="INR 42.8k"
          color={palette.green}
        />
        <MetricCard
          delay={334}
          label="Orders"
          value="128"
          color={palette.coral}
        />
        <MetricCard
          delay={348}
          label="Avg order"
          value="INR 335"
          color={palette.blue}
        />
        <MetricCard
          delay={362}
          label="Peak hour"
          value="9 PM"
          color={palette.citron}
        />
      </div>
      <div
        style={{
          marginTop: 24,
          display: "grid",
          gridTemplateColumns: "310px 1fr",
          gap: 22,
        }}
      >
        <div
          style={{
            background: "#ffffff",
            border: `1px solid ${palette.line}`,
            borderRadius: 24,
            padding: 34,
            minHeight: 338,
            display: "grid",
            placeItems: "center",
          }}
        >
          <MiniDonut frame={frame} />
        </div>
        <div
          style={{
            background: "#ffffff",
            border: `1px solid ${palette.line}`,
            borderRadius: 24,
            padding: 28,
          }}
        >
          <div style={{ fontSize: 26, fontWeight: 870, marginBottom: 24 }}>
            Where it went
          </div>
          {[
            ["Food delivery", 0.82, palette.green],
            ["Instamart", 0.58, palette.coral],
            ["Dineout", 0.34, palette.blue],
          ].map(([label, width, color], index) => {
            const grow = between(frame, 350 + index * 13, 405 + index * 13);
            return (
              <div key={label} style={{ marginBottom: 30 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    fontSize: 21,
                    color: palette.muted,
                    fontWeight: 700,
                    marginBottom: 10,
                  }}
                >
                  <span>{label}</span>
                  <span>{Math.round(Number(width) * 100)}%</span>
                </div>
                <div
                  style={{
                    height: 18,
                    borderRadius: 999,
                    background: "rgba(16, 19, 15, 0.08)",
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${Number(width) * grow * 100}%`,
                      background: String(color),
                      borderRadius: 999,
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

const DashboardScene = () => {
  const frame = useCurrentFrame();
  const opacity = sceneFade(frame, 300, 505);
  return (
    <AbsoluteFill style={{ opacity }}>
      <div
        style={{
          position: "absolute",
          left: 72,
          top: 102,
          right: 72,
        }}
      >
        <div
          style={{
            fontSize: 76,
            lineHeight: 1,
            fontWeight: 940,
            letterSpacing: 0,
          }}
        >
          See the spending pattern behind every order.
        </div>
      </div>
      <div style={{ position: "absolute", left: 90, top: 530 }}>
        <DashboardMock />
      </div>
    </AbsoluteFill>
  );
};

const ChatBubble = ({
  children,
  side,
  delay,
}: {
  children: React.ReactNode;
  side: "user" | "assistant";
  delay: number;
}) => {
  const frame = useCurrentFrame();
  const enter = between(frame, delay, delay + 28);
  const isUser = side === "user";
  return (
    <div
      style={{
        alignSelf: isUser ? "flex-end" : "flex-start",
        maxWidth: isUser ? 700 : 790,
        borderRadius: isUser ? "30px 30px 8px 30px" : "30px 30px 30px 8px",
        background: isUser ? palette.ink : "#ffffff",
        color: isUser ? palette.paper : palette.ink,
        padding: "28px 32px",
        fontSize: 32,
        lineHeight: 1.22,
        fontWeight: 680,
        boxShadow: "0 22px 70px rgba(0, 0, 0, 0.14)",
        opacity: enter,
        transform: `translateY(${(1 - enter) * 44}px)`,
      }}
    >
      {children}
    </div>
  );
};

const AssistantScene = () => {
  const frame = useCurrentFrame();
  const opacity = sceneFade(frame, 480, 624);
  const glow = clamp(Math.sin((frame - 520) / 16) * 0.5 + 0.5);
  return (
    <AbsoluteFill style={{ opacity }}>
      <div
        style={{
          position: "absolute",
          left: 72,
          right: 72,
          top: 118,
        }}
      >
        <Pill tone="green">Optional assistant</Pill>
        <div
          style={{
            marginTop: 42,
            fontSize: 77,
            lineHeight: 1,
            fontWeight: 940,
            letterSpacing: 0,
          }}
        >
          Ask questions in plain English.
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 82,
          top: 520,
          width: 916,
          minHeight: 780,
          borderRadius: 44,
          background: brand.bg,
          color: brand.ink,
          padding: 34,
          display: "flex",
          flexDirection: "column",
          gap: 26,
          boxShadow: `0 0 ${44 + glow * 26}px rgba(216, 240, 76, 0.28)`,
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            paddingBottom: 22,
            borderBottom: `1px solid ${palette.line}`,
          }}
        >
          <div style={{ fontSize: 30, fontWeight: 900 }}>Assistant</div>
          <div
            style={{
              fontSize: 22,
              color: palette.muted,
              fontWeight: 760,
            }}
          >
            uses your local data
          </div>
        </div>
        <ChatBubble side="user" delay={520}>
          How much did I spend on Instamart last month?
        </ChatBubble>
        <ChatBubble side="assistant" delay={570}>
          INR 8,240. Up 14% from the month before. Your biggest day was Sunday.
        </ChatBubble>
        <ChatBubble side="user" delay={606}>
          Show me where to cut back.
        </ChatBubble>
      </div>
    </AbsoluteFill>
  );
};

const CtaScene = () => {
  const frame = useCurrentFrame();
  const opacity = sceneFade(frame, 636, 720);
  const title = between(frame, 652, 684);

  return (
    <AbsoluteFill
      style={{
        opacity,
        background: palette.paper,
        color: palette.ink,
      }}
    >
      <div style={{ position: "absolute", left: 72, top: 92 }}>
        <Logo dark />
      </div>
      <div
        style={{
          position: "absolute",
          left: 72,
          right: 72,
          top: 360,
          transform: `translateY(${(1 - title) * 54}px)`,
        }}
      >
        <div
          style={{
            fontSize: 96,
            lineHeight: 0.95,
            fontWeight: 950,
            letterSpacing: 0,
          }}
        >
          Personal finance that starts with your receipts.
        </div>
        <div
          style={{
            marginTop: 38,
            fontSize: 37,
            lineHeight: 1.18,
            color: palette.muted,
            fontWeight: 610,
            maxWidth: 820,
          }}
        >
          Install the CLI. Run onboarding. Open a private dashboard on
          localhost:3000.
        </div>
      </div>
      <div
        style={{
          position: "absolute",
          left: 72,
          right: 72,
          bottom: 240,
          height: 118,
          borderRadius: 28,
          background: palette.ink,
          color: palette.paper,
          display: "flex",
          alignItems: "center",
          padding: "0 34px",
          fontFamily:
            'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace',
          fontSize: 36,
          fontWeight: 760,
          boxShadow: "0 30px 90px rgba(16, 19, 15, 0.22)",
          opacity: between(frame, 682, 708),
        }}
      >
        npm i -g slashcash
        <br />
        slash onboard
      </div>
      <div
        style={{
          position: "absolute",
          left: 72,
          bottom: 118,
          display: "flex",
          gap: 18,
        }}
      >
        <Pill tone="dark">local-first</Pill>
        <Pill tone="dark">SQLite</Pill>
        <Pill tone="dark">no cloud DB</Pill>
      </div>
    </AbsoluteFill>
  );
};

const Soundtrack = () => {
  const { durationInFrames } = useVideoConfig();

  return (
    <Audio
      src={staticFile(soundtrack.src)}
      startFrom={0}
      volume={(frame) => {
        const fadeIn = interpolate(frame, [0, 36], [0, 1], {
          extrapolateLeft: "clamp",
          extrapolateRight: "clamp",
        });
        const fadeOut = interpolate(
          frame,
          [durationInFrames - 54, durationInFrames - 1],
          [1, 0],
          {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          },
        );

        return 0.22 * fadeIn * fadeOut;
      }}
    />
  );
};

const SfxTrack = () => {
  const pops = [6, 16, 24, 126, 138, 254, 278, 314, 326, 400, 412];
  const whooshes = [78, 166, 298];
  const keyClicks = Array.from({ length: 9 }, (_, index) => 362 + index * 4);

  return (
    <>
      {pops.map((from, index) => (
        <Sequence key={`pop-${index}`} from={from} durationInFrames={10}>
          <Audio src={staticFile("audio/sfx-pop.wav")} volume={0.45} />
        </Sequence>
      ))}
      {whooshes.map((from, index) => (
        <Sequence key={`whoosh-${index}`} from={from} durationInFrames={16}>
          <Audio src={staticFile("audio/sfx-whoosh.wav")} volume={0.5} />
        </Sequence>
      ))}
      {keyClicks.map((from, index) => (
        <Sequence key={`key-${index}`} from={from} durationInFrames={4}>
          <Audio src={staticFile("audio/sfx-key.wav")} volume={0.65} />
        </Sequence>
      ))}
    </>
  );
};

export const MyComposition = () => {
  return (
    <Shell>
      <Soundtrack />
      <HookScene />
      <PipelineScene />
      <DashboardScene />
      <AssistantScene />
      <CtaScene />
    </Shell>
  );
};

// =====================================================
// VIRAL SHORT-FORM VERSION (InboxToInsight)
// 510 frames = 17s target. High kinetic energy, spring physics,
// staggered entries, kinetic typography, typewriters.
// Follows the exact 4-phase flow from marketing feedback.
// =====================================================

const ChaoticReceipt = ({
  index,
  start,
  left,
  top,
  rotate,
  amount,
  label,
}: {
  index: number;
  start: number;
  left: number;
  top: number;
  rotate: number;
  amount: string;
  label: string;
}) => {
  const frame = useCurrentFrame();
  // Staggered fast pops (every ~5-6 frames) — "flurry" of receipts
  const p = bounceSpring(frame, start + index * 5);
  const yJitter = Math.sin((frame + index) * 0.6) * (1 - p) * 6;
  return (
    <div
      style={{
        position: "absolute",
        left,
        top: top + yJitter,
        width: 460,
        height: 168,
        borderRadius: 18,
        background: brand.panel,
        color: brand.ink,
        boxShadow: brand.shadow,
        transform: `translateY(${(1 - p) * -140}px) rotate(${rotate + (1 - p) * (index % 2 === 0 ? -18 : 16)}deg) scale(${0.7 + p * 0.32})`,
        opacity: p,
        padding: "16px 20px",
        border: `1px solid ${brand.border}`,
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontSize: 20, fontWeight: 800 }}>{label}</div>
        <div style={{ fontSize: 22, fontWeight: 900, color: brand.coral }}>{amount}</div>
      </div>
      <div style={{ marginTop: 10, height: 7, background: "rgba(0,0,0,0.08)", borderRadius: 999 }} />
      <div style={{ marginTop: 6, height: 7, background: "rgba(0,0,0,0.08)", borderRadius: 999, width: "64%" }} />
      <div style={{ position: "absolute", bottom: 14, right: 18, fontSize: 13, color: brand.faint, letterSpacing: 1 }}>SWIGGY / INSTAMART</div>
    </div>
  );
};

// 0:00-0:03 | THE HOOK — Extreme close-up chaotic overflowing Gmail
const ViralHookScene = () => {
  // Fast slam title: no slow fade (kinetic words + springs handle the pop internally)

  return (
    <AbsoluteFill>
      {/* Branded light shell with motion, not a terminal theme */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: brand.bg,
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle, rgba(14, 165, 233, 0.24) 1.2px, transparent 1.2px)",
          backgroundSize: "30px 30px",
          maskImage:
            "radial-gradient(900px circle at 78% 8%, rgba(0,0,0,0.8), transparent 72%)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: "-18% -12% auto -12%",
          height: "72%",
          background:
            "radial-gradient(circle at 28% 18%, rgba(99,91,255,0.18), transparent 52%), radial-gradient(circle at 70% 42%, rgba(47,108,235,0.14), transparent 55%), radial-gradient(circle at 58% 82%, rgba(20,184,166,0.12), transparent 60%)",
          filter: "blur(10px)",
        }}
      />

      {/* Logo early, small */}
      <div style={{ position: "absolute", left: 68, top: 54 }}>
        <Logo dark />
      </div>

      {/* The big slam hook — kinetic words, super fast */}
      <div
        style={{
          position: "absolute",
          left: 64,
          right: 64,
          top: 168,
          fontSize: 82,
          lineHeight: 0.94,
          fontWeight: 970,
          letterSpacing: -1.2,
        }}
      >
        <span style={{ color: brand.ink }}>
          <KineticWords text="Your Gmail" start={6} delayStep={3} />
          <br />
          <span
            style={{
              background: brand.gradient,
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
            }}
          >
            <KineticWords text="already knows" start={14} delayStep={3} />
          </span>
          <br />
          where your <span style={{ color: brand.coral }}><KineticWords text="money went." start={22} delayStep={3} /></span>
        </span>
      </div>

      {/* Chaotic fast-flying receipt flurry (the visual "slap") */}
      <div style={{ position: "absolute", left: 80, top: 620, width: 920, height: 980 }}>
        <ChaoticReceipt index={0} start={12} left={-20} top={40} rotate={-7} amount="₹742" label="Swiggy • 9:41pm" />
        <ChaoticReceipt index={1} start={17} left={210} top={-30} rotate={5} amount="₹1,284" label="Instamart • 11:12am" />
        <ChaoticReceipt index={2} start={21} left={420} top={90} rotate={-3} amount="₹389" label="Swiggy • 7:58pm" />
        <ChaoticReceipt index={3} start={25} left={90} top={210} rotate={8} amount="₹2,180" label="Dineout • Sat" />
        <ChaoticReceipt index={4} start={29} left={310} top={160} rotate={-11} amount="₹565" label="Instamart • 6:03pm" />
      </div>

      {/* Bottom tag — local-first flex early */}
      <div
        style={{
          position: "absolute",
          left: 68,
          bottom: 92,
          fontSize: 21,
          color: brand.blue,
          display: "flex",
          gap: 14,
          alignItems: "center",
        }}
      >
        <span>localhost:3000</span>
        <span style={{ color: brand.coral }}>•</span>
        <span>NO CLOUD</span>
      </div>
    </AbsoluteFill>
  );
};

// 0:03-0:07 | THE PROBLEM — Alternatives crossed out, fast agitation
const ViralProblemScene = () => {
  const frame = useCurrentFrame();

  const problems = [
    { text: "Bank apps", sub: "Spying + data selling" },
    { text: "Spreadsheets", sub: "Boring manual hell" },
    { text: "Budget apps", sub: "Upload everything" },
  ];

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: palette.paper,
          color: palette.ink,
        }}
      />

      <div style={{ position: "absolute", left: 68, top: 82 }}>
        <Pill tone="dark">THE PROBLEM</Pill>
      </div>

      {/* Kinetic main line */}
      <div
        style={{
          position: "absolute",
          left: 68,
          right: 68,
          top: 178,
          fontSize: 76,
          lineHeight: 0.96,
          fontWeight: 970,
        }}
      >
        <KineticWords text="Receipts only become visible" start={6} delayStep={4} />
        <br />
        <span style={{ color: palette.coral }}>
          <KineticWords text="when they become regret." start={24} delayStep={4} />
        </span>
      </div>

      {/* Fast-staggered crossed-out alternatives (whooshes) */}
      <div style={{ position: "absolute", left: 70, top: 520, display: "grid", gap: 22, width: 920 }}>
        {problems.map((p, i) => {
          const enter = popSpring(frame, 40 + i * 7);
          return (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "22px 32px",
                borderRadius: 18,
                background: brand.panel,
                border: `1px solid ${brand.border}`,
                boxShadow: brand.shadow,
                opacity: enter,
                transform: `translateX(${(1 - enter) * (i % 2 === 0 ? -90 : 90)}px)`,
              }}
            >
              <div style={{ fontSize: 34, fontWeight: 820, textDecoration: "line-through", textDecorationColor: brand.coral, textDecorationThickness: 4 }}>
                x {p.text}
              </div>
              <div style={{ fontSize: 24, color: brand.muted }}>{p.sub}</div>
            </div>
          );
        })}
      </div>

      {/* Punch line */}
      <div
        style={{
          position: "absolute",
          left: 68,
          bottom: 110,
          fontSize: 30,
          color: brand.ink,
          fontWeight: 760,
        }}
      >
        The truth has been sitting in your inbox the whole time.
      </div>
    </AbsoluteFill>
  );
};

// 0:07-0:13 | THE SOLUTION - conversational agent reveal
const ViralSolutionScene = () => {
  const frame = useCurrentFrame();
  const windowPop = popSpring(frame, 18);
  const userBubble = popSpring(frame, 36);
  const typing = popSpring(frame, 62) * (1 - between(frame, 76, 86));
  const answerBubble = popSpring(frame, 84);

  return (
    <AbsoluteFill>
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: brand.bg,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: brand.softGradient,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "radial-gradient(circle, rgba(14, 165, 233, 0.2) 1.2px, transparent 1.2px)",
          backgroundSize: "30px 30px",
          maskImage:
            "radial-gradient(900px circle at 78% 8%, rgba(0,0,0,0.72), transparent 72%)",
        }}
      />

      <div style={{ position: "absolute", left: 64, top: 58 }}>
        <Logo dark />
      </div>

      <div style={{ position: "absolute", left: 64, right: 64, top: 145 }}>
        <span style={{ fontSize: 58, lineHeight: 0.96, fontWeight: 950, color: brand.ink }}>
          <KineticWords text="Ask the question you actually care about." start={8} delayStep={3} />
        </span>
      </div>

      <div
        style={{
          position: "absolute",
          left: 62,
          right: 62,
          top: 405,
          borderRadius: 42,
          background:
            "linear-gradient(135deg, rgba(99,91,255,0.72), rgba(47,108,235,0.68), rgba(20,184,166,0.62))",
          padding: 2,
          boxShadow:
            "0 1px 2px rgba(0,0,0,0.04), 0 32px 100px -28px rgba(47,108,235,0.36)",
          opacity: windowPop,
          transform: `translateY(${(1 - windowPop) * 42}px) scale(${0.94 + windowPop * 0.06})`,
        }}
      >
        <div
          style={{
            borderRadius: 40,
            background: brand.panel,
            minHeight: 750,
            padding: 28,
          }}
        >
          <div
            style={{
              height: 76,
              borderBottom: `1px solid ${brand.border}`,
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "0 4px 22px",
              marginBottom: 30,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
              <Img
                src={staticFile("brand/slash-cash-coin.svg")}
                style={{ width: 44, height: 44 }}
              />
              <div>
                <div style={{ fontSize: 27, fontWeight: 900, color: brand.ink }}>
                  slash.cash agent
                </div>
                <div style={{ marginTop: 3, fontSize: 18, color: brand.faint, fontWeight: 650 }}>
                  answering from your local data
                </div>
              </div>
            </div>
            <div
              style={{
                borderRadius: 999,
                background: "rgba(16,185,129,0.1)",
                color: "#047857",
                padding: "8px 13px",
                fontSize: 17,
                fontWeight: 820,
              }}
            >
              local
            </div>
          </div>
          <div
            style={{
              display: "flex",
              justifyContent: "flex-end",
              opacity: userBubble,
              transform: `translateY(${(1 - userBubble) * 30}px)`,
            }}
          >
            <div
              style={{
                maxWidth: 760,
                borderRadius: "34px 34px 8px 34px",
                background: brand.ink,
                color: brand.panel,
                padding: "28px 32px",
                fontSize: 35,
                lineHeight: 1.13,
                fontWeight: 860,
                boxShadow: "0 18px 50px -22px rgba(0,0,0,0.42)",
              }}
            >
              How much did I spend on food last month?
            </div>
          </div>
          <div
            style={{
              marginTop: 28,
              display: "flex",
              alignItems: "center",
              gap: 13,
              opacity: typing,
            }}
          >
            <Img src={staticFile("brand/slash-cash-coin.svg")} style={{ width: 38, height: 38 }} />
            <div
              style={{
                borderRadius: 999,
                background: "rgba(0,0,0,0.05)",
                padding: "14px 18px",
                display: "flex",
                gap: 8,
              }}
            >
              {[0, 1, 2].map((dot) => (
                <div
                  key={dot}
                  style={{
                    width: 9,
                    height: 9,
                    borderRadius: "50%",
                    background: [brand.violet, brand.blue, brand.teal][dot],
                    opacity: 0.75,
                  }}
                />
              ))}
            </div>
          </div>
          <div
            style={{
              marginTop: 28,
              display: "flex",
              gap: 14,
              alignItems: "flex-start",
              opacity: answerBubble,
              transform: `translateY(${(1 - answerBubble) * 34}px)`,
            }}
          >
            <Img src={staticFile("brand/slash-cash-coin.svg")} style={{ width: 48, height: 48, flexShrink: 0 }} />
            <div
              style={{
                flex: 1,
                borderRadius: "8px 34px 34px 34px",
                background:
                  "linear-gradient(135deg, rgba(99,91,255,0.07), rgba(47,108,235,0.055), rgba(20,184,166,0.07))",
                border: `1px solid ${brand.border}`,
                padding: "28px 30px",
              }}
            >
              <div style={{ fontSize: 34, lineHeight: 1.14, fontWeight: 920, color: brand.ink }}>
                INR 42.8k across 128 orders.
              </div>
              <div style={{ marginTop: 14, fontSize: 25, lineHeight: 1.22, color: brand.muted, fontWeight: 660 }}>
                Food delivery led. Instamart spiked on weekends.
              </div>
              <div style={{ marginTop: 22, display: "flex", gap: 12, flexWrap: "wrap" }}>
                {["Swiggy", "Instamart", "Dineout"].map((label, index) => (
                  <div
                    key={label}
                    style={{
                      minHeight: 42,
                      padding: "0 15px",
                      borderRadius: 999,
                      display: "flex",
                      alignItems: "center",
                      background:
                        [
                          "rgba(99,91,255,0.1)",
                          "rgba(47,108,235,0.1)",
                          "rgba(20,184,166,0.12)",
                        ][index],
                      color: [brand.violet, brand.blue, brand.teal][index],
                      fontSize: 19,
                      fontWeight: 830,
                    }}
                  >
                    {label}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AbsoluteFill>
  );
};

// 0:13-0:17 | THE CTA — Urgency + command that types
const ViralCtaScene = () => {
  const frame = useCurrentFrame();
  const terminalPop = popSpring(frame, 46);
  const proofPop = popSpring(frame, 96);

  return (
    <AbsoluteFill
      style={{
        background: palette.paper,
        color: palette.ink,
      }}
    >
      <div style={{ position: "absolute", left: 68, top: 82 }}>
        <Logo dark />
      </div>

      {/* Big direct CTA line */}
      <div
        style={{
          position: "absolute",
          left: 68,
          right: 68,
          top: 220,
          fontSize: 84,
          lineHeight: 0.94,
          fontWeight: 970,
        }}
      >
        <KineticWords text="No Cloud." start={10} delayStep={4} />
        <br />
        <span style={{ color: palette.green }}>
          <KineticWords text="Local First." start={22} delayStep={4} />
        </span>
      </div>

      {/* The command that actually types out (satisfying) */}
      <div
        style={{
          position: "absolute",
          left: 68,
          top: 520,
          opacity: terminalPop,
          transform: `translateY(${(1 - terminalPop) * 26}px) scale(${0.95 + terminalPop * 0.05})`,
        }}
      >
        <TerminalWindow title="terminal - localhost:3000" width={880} bodyMinHeight={152}>
          <div style={{ color: "#6b7280", fontSize: 18, height: 24, marginBottom: 6 }}>~</div>
          <div style={{ color: "#d8f04c", fontSize: 32, height: 39, lineHeight: 1.2 }}>
            <Typewriter text="npm i -g slashcash" start={58} speed={1.25} />
          </div>
          <div style={{ marginTop: 12, color: "#d8f04c", fontSize: 32, height: 39, lineHeight: 1.2 }}>
            <Typewriter text="slash onboard" start={82} speed={1.25} />
          </div>
          <div style={{ marginTop: 18, fontSize: 19, height: 26, color: "rgba(216,240,76,0.5)" }}>
            Opens http://localhost:3000
          </div>
        </TerminalWindow>
      </div>

      {/* Final urgency line + badges */}
      <div
        style={{
          position: "absolute",
          left: 68,
          bottom: 108,
          opacity: proofPop,
          transform: `translateY(${(1 - proofPop) * 20}px)`,
        }}
      >
        <div style={{ fontSize: 24, fontWeight: 700, marginBottom: 16, color: palette.muted }}>
          Ask once. See where the money actually went.
        </div>
        <div style={{ display: "flex", gap: 12 }}>
          {["No bank login", "Private by default", "Receipts to answers"].map((b, i) => {
            const badgePop = popSpring(frame, 108 + i * 6);
            return (
              <div
                key={i}
                style={{
                  opacity: badgePop,
                  transform: `scale(${0.9 + badgePop * 0.1}) translateY(${(1 - badgePop) * 12}px)`,
                }}
              >
                <Pill tone="dark">{b}</Pill>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

export const InboxToInsightComposition = () => {
  return (
    <>
      <Soundtrack />
      <SfxTrack />

      {/* 0:00 - ~0:03.2  (96 frames) — Hook with chaotic receipt flurry + kinetic slam */}
      <Sequence durationInFrames={106}>
        <SceneTransition duration={106} enterFrom={0} exitTo={-42}>
          <ViralHookScene />
        </SceneTransition>
      </Sequence>

      {/* ~0:03 - 0:06.4 (staggered start for punchy cut) */}
      <Sequence from={84} durationInFrames={106}>
        <SceneTransition duration={106} enterFrom={48} exitTo={-38}>
          <ViralProblemScene />
        </SceneTransition>
      </Sequence>

      {/* ~0:06 - 0:11  Solution: terminal + instant answer pop (fastest energy here) */}
      <Sequence from={172} durationInFrames={152}>
        <SceneTransition duration={152} enterFrom={48} exitTo={-34}>
          <ViralSolutionScene />
        </SceneTransition>
      </Sequence>

      {/* ~0:10 - 0:17  CTA with typing command + strong close */}
      <Sequence from={304} durationInFrames={206}>
        <SceneTransition duration={206} enterFrom={52} exitTo={0}>
          <ViralCtaScene />
        </SceneTransition>
      </Sequence>
    </>
  );
};
