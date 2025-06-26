import React, { useEffect, useRef, useState } from "react";
import type { JSX } from "react";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import Xarrow from "react-xarrows";
import { Xwrapper } from "react-xarrows";

import Head from "@docusaurus/Head";
import Link from "@docusaurus/Link";
import {
  ArrowRight,
  BarChart2,
  Bot,
  Coins,
  Eye,
  FileText,
  Github,
  Music,
  Package,
  PenTool,
  Send,
  Server,
  Shapes,
  Skull,
  Video,
  Volume2
} from "lucide-react";

import FadeSlider from "../components/FadeSlider";

// NEW HOMEPAGE IMPLEMENTATION
export default function Home(): JSX.Element {
  // Reference to the scroll container (entire page content)
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState(0);

  // Store random horizontal shift factors for each blob
  const blobShiftFactors = useRef<number[]>([]);
  // Store random rotation factors for yellow blobs (5 and 6)
  const blobRotationFactors = useRef<number[]>([]);

  // How many additional drifting blobs to create
  const EXTRA_BLOB_COUNT = 14;

  // ---------------------------------------------------------------------------
  // Carousel state & responsiveness for the capability section
  const [useSlider, setUseSlider] = useState(false);

  useEffect(() => {
    const updateMode = () => {
      setUseSlider(window.innerWidth <= 1300);
    };
    updateMode();
    window.addEventListener("resize", updateMode);
    return () => window.removeEventListener("resize", updateMode);
  }, []);

  const codeString = `defineCapability({
  id: "multi-modal-text-generation",
  description: "create text using text and images",
  input: z.object({
    prompt: z.string(),
    images: z.array(z.string()).optional()
  }),
  output: z.string()
});`;

  // Reusable render helpers ---------------------------------------------------
  const CodeBlockSection: React.FC = () => (
    <div className="code-block-container">
      <SyntaxHighlighter
        language="typescript"
        style={vscDarkPlus}
        customStyle={{
          background: "transparent",
          margin: 0
        }}
        codeTagProps={{
          style: {
            fontSize: "clamp(0.72rem, 1.4vw, 0.9rem)",
            fontFamily: `"SF Mono", "Fira Code", "Consolas", "Monaco", monospace`
          }
        }}
      >
        {codeString}
      </SyntaxHighlighter>
    </div>
  );

  const CubeVisualization: React.FC = () => (
    <div className="cube-container">
      <Xwrapper>
        {/* Arrows */}
        <Xarrow
          start="icon-vision"
          end="cube-center"
          endAnchor="middle"
          path="smooth"
          strokeWidth={2}
          showHead={false}
          color="#6CFF6C"
        />
        <Xarrow
          start="icon-music"
          end="cube-center"
          endAnchor="middle"
          path="smooth"
          strokeWidth={2}
          showHead={false}
          color="#6CFF6C"
        />
        <Xarrow
          start="icon-audio"
          end="cube-center"
          endAnchor="middle"
          path="smooth"
          strokeWidth={2}
          showHead={false}
          color="#6CFF6C"
        />
        <Xarrow
          start="icon-chart"
          end="cube-center"
          endAnchor="middle"
          path="smooth"
          strokeWidth={2}
          showHead={false}
          color="#6CFF6C"
        />
        <Xarrow
          start="icon-video"
          end="cube-center"
          endAnchor="middle"
          path="smooth"
          strokeWidth={2}
          showHead={false}
          color="#6CFF6C"
        />
        <Xarrow
          start="icon-shapes"
          end="cube-center"
          endAnchor="middle"
          path="smooth"
          strokeWidth={2}
          showHead={false}
          color="#6CFF6C"
        />
        <Xarrow
          start="icon-text"
          end="cube-center"
          endAnchor="middle"
          path="smooth"
          strokeWidth={2}
          showHead={false}
          color="#6CFF6C"
        />
        <Xarrow
          start="icon-vector"
          end="cube-center"
          endAnchor="middle"
          path="smooth"
          strokeWidth={2}
          showHead={false}
          color="#6CFF6C"
        />

        {/* Capability icons positioned around cube */}
        <div id="icon-vision" className="capability-icon icon-vision">
          <Eye />
        </div>
        <div id="icon-music" className="capability-icon icon-music">
          <Music />
        </div>
        <div id="icon-audio" className="capability-icon icon-audio">
          <Volume2 />
        </div>
        <div id="icon-chart" className="capability-icon icon-chart">
          <BarChart2 />
        </div>
        <div id="icon-video" className="capability-icon icon-video">
          <Video />
        </div>
        <div id="icon-shapes" className="capability-icon icon-shapes">
          <Shapes />
        </div>
        <div id="icon-text" className="capability-icon icon-text">
          <FileText />
        </div>
        <div id="icon-vector" className="capability-icon icon-vector">
          <PenTool />
        </div>

        {/* Cube image centered */}
        <img
          id="cube-center"
          src="/img/cube.png"
          alt="Cube illustration"
          className="cube-image"
        />
      </Xwrapper>
    </div>
  );

  // New generic code block component for reuse across slides
  const CodeBlock: React.FC<{ code: string }> = ({ code }) => (
    <div className="code-block-container">
      <SyntaxHighlighter
        language="typescript"
        style={vscDarkPlus}
        customStyle={{ background: "transparent", margin: 0 }}
        codeTagProps={{
          style: {
            fontSize: "clamp(0.72rem, 1.4vw, 0.9rem)",
            fontFamily: `"SF Mono", "Fira Code", "Consolas", "Monaco", monospace`
          }
        }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );

  /* Simplified code snippets for Slide-2 */
  const triggerCode = `this.triggers = [\n  {\n    name: \"server_chat\",\n    route: {\n      path: \"/chat\",\n      handler: this.handleChat.bind(this)\n    }\n  }\n];`;

  const discordTriggerCode = `return {\n  name: \"discord_post_listener\",\n  start: () => {\n    discordService.client.on(\n      Events.MessageCreate,\n      handleMessage.bind(this)\n    );\n  }\n};`;

  const executorCode = `this.executors.push({\n  name: \"generate_image\",\n  description: \"Create an image from a prompt\",\n  fn: async (task) => {\n    const { prompt } = await this.runtime.getObject(\n      z.object({ prompt: z.string() }),\n      task\n    );\n    return imageService.create(prompt);\n  }\n});`;

  // Slide-2 carousel state & data -------------------------------------------
  const codeSlides = [
    { title: "Executor Registration", code: executorCode },
    { title: "HTTP Route Trigger", code: triggerCode },
    { title: "Discord Event Trigger", code: discordTriggerCode }
  ];
  const [codeSlide, setCodeSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCodeSlide((prev) => (prev + 1) % codeSlides.length);
    }, 5500);
    return () => clearInterval(interval);
  }, []);

  // Update overlay opacity and blob positions based on scroll
  useEffect(() => {
    const blobs = Array.from(
      document.querySelectorAll(".blob")
    ) as HTMLElement[];

    // Randomize initial positions for each blob only once
    blobs.forEach((blob) => {
      if (blob.dataset.randomized) return;
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const maxX = vw - blob.offsetWidth;
      const maxY = vh - blob.offsetHeight;

      // Choose a random position within the viewport (allowing slight overflow for natural look)
      const randomX =
        Math.random() * (maxX + blob.offsetWidth) - blob.offsetWidth * 0.5;
      const randomY =
        Math.random() * (maxY + blob.offsetHeight) - blob.offsetHeight * 0.5;

      blob.style.left = `${randomX}px`;
      blob.style.top = `${randomY}px`;
      blob.style.marginLeft = "0"; // Clear preset margin offsets so left positioning works everywhere

      // Mark as randomized so we don't reposition on subsequent effect calls / re-renders
      blob.dataset.randomized = "true";
    });

    // Initialize random horizontal shift factors for each blob
    if (blobShiftFactors.current.length === 0 && blobs.length > 0) {
      blobShiftFactors.current = blobs.map((_, i) => {
        // Alternate directions to ensure variety, with random magnitude
        const direction = i % 2 === 0 ? 1 : -1;
        return direction * (Math.random() * 0.5 + 0.5); // Random magnitude: 0.5 to 1.0
      });
    }

    // Initialize random rotation factors for yellow blobs (5 and 6)
    if (blobRotationFactors.current.length === 0 && blobs.length >= 6) {
      blobRotationFactors.current = [
        (Math.random() - 0.5) * 2, // blob 5
        (Math.random() - 0.5) * 2 // blob 6
      ];
    }

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const vh = window.innerHeight;
      const ratio = Math.min(scrollY / vh, 1); // 0 -> 1 across first viewport
      setOverlayOpacity(ratio);

      // Move blobs laterally based on scroll
      const maxShift = vh * 0.3; // Max shift is 30% of viewport height
      const maxRotation = 180; // Max rotation of 180 degrees

      blobs.forEach((blob, i) => {
        const shift = ratio * maxShift * (blobShiftFactors.current[i] || 0);
        blob.style.setProperty(`--scroll-translate-x-${i + 1}`, `${shift}px`);

        // Apply rotation only to blobs 5 and 6
        if (i === 4 || i === 5) {
          // Blobs are 0-indexed (4 -> blob-5, 5 -> blob-6)
          const rotationFactor = blobRotationFactors.current[i - 4] || 0;
          const rotation = ratio * maxRotation * rotationFactor;
          blob.style.setProperty(`--scroll-rotate-${i + 1}`, `${rotation}deg`);
        }
      });
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  // Random drifting animation for additional blobs ---------------------------------
  useEffect(() => {
    const floatingBlobs = Array.from(
      document.querySelectorAll(".blob-floating")
    ) as HTMLElement[];

    if (floatingBlobs.length === 0) return;

    // Initialize state for each blob
    interface DriftState {
      x: number;
      y: number;
      angle: number;
      speed: number; // px per millisecond
      rotation: number;
      rotationSpeed: number; // deg per millisecond
    }

    const vw = window.innerWidth;
    const vh = window.innerHeight;

    const states: DriftState[] = floatingBlobs.map((blob) => {
      // Random size and aspect ratio
      const baseSize = Math.random() * 250 + 150; // 150-400 px
      const aspect = Math.random() * 0.7 + 0.6; // 0.6-1.3
      blob.style.width = `${baseSize}px`;
      blob.style.height = `${baseSize * aspect}px`;

      // Assign random color from palette 1-6
      const colorIdx = Math.floor(Math.random() * 6) + 1;
      blob.style.background = `var(--blob-color-${colorIdx})`;

      // Starting position anywhere onscreen (with some overflow)
      const startX = Math.random() * vw;
      const startY = Math.random() * vh;

      // Apply initial transform so there's no jump on first frame
      blob.style.transform = `translate(${startX}px, ${startY}px)`;

      return {
        x: startX,
        y: startY,
        angle: Math.random() * Math.PI * 2,
        speed: Math.random() * 0.05 + 0.02, // px per ms (later scaled by dt)
        rotation: Math.random() * 360,
        rotationSpeed: (Math.random() - 0.5) * 0.03 // deg per ms
      } as DriftState;
    });

    let frameId: number;
    let last = performance.now();

    const animate = (now: number) => {
      const dt = now - last; // elapsed ms
      last = now;

      const vwDynamic = window.innerWidth;
      const vhDynamic = window.innerHeight;

      floatingBlobs.forEach((blob, i) => {
        const state = states[i];

        // Slightly change direction to create meandering path
        state.angle += (Math.random() - 0.5) * 0.01;

        // Update position
        state.x += Math.cos(state.angle) * state.speed * dt;
        state.y += Math.sin(state.angle) * state.speed * dt;

        // Wrap around viewport with buffer
        const buffer = 200;
        if (state.x < -buffer) {
          state.x = -buffer;
          state.angle = Math.PI - state.angle; // reflect horizontally
        }
        if (state.x > vwDynamic + buffer) {
          state.x = vwDynamic + buffer;
          state.angle = Math.PI - state.angle;
        }
        if (state.y < -buffer) {
          state.y = -buffer;
          state.angle = -state.angle; // reflect vertically
        }
        if (state.y > vhDynamic + buffer) {
          state.y = vhDynamic + buffer;
          state.angle = -state.angle;
        }

        // Update rotation
        state.rotation += state.rotationSpeed * dt;

        // Apply transform
        blob.style.transform = `translate(${state.x}px, ${state.y}px) rotate(${state.rotation}deg)`;
      });

      frameId = requestAnimationFrame(animate);
    };

    frameId = requestAnimationFrame(animate);

    return () => cancelAnimationFrame(frameId);
  }, []);

  // Add generic CodeBlock component, triggerCode and executorCode definitions (place after other helper components).

  return (
    <div ref={scrollRef}>
      <Head>
        <title>MAIAR</title>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@600;800;900&display=swap"
          rel="stylesheet"
        />
        <style>
          {`
           
          `}
        </style>
      </Head>

      <Link
        href="https://uraniumcube.com"
        target="_blank"
        rel="noopener noreferrer"
        className="ucorp-callout"
      >
        <img src="/img/ucorp.svg" alt="Uranium Corporation Logo" />
        <span>A Uranium Corporation Product</span>
      </Link>

      <header className="hero">
        {/* Animated blurred background */}
        <div className="blur-bg">
          {/* Darkening overlay (opacity driven by scroll) */}
          <div
            className="overlay"
            style={{ opacity: overlayOpacity * 0.65 }}
            aria-hidden
          />
          <span className="blob blob-1" />
          <span className="blob blob-2" />
          <span className="blob blob-3" />
          <span className="blob blob-4" />
          <span className="blob blob-5" />
          <span className="blob blob-6" />

          {/* Dynamically generated drifting blobs */}
          {Array.from({ length: EXTRA_BLOB_COUNT }).map((_, idx) => (
            <span key={`blob-drift-${idx}`} className="blob blob-floating" />
          ))}
        </div>

        {/* Navigation bar */}
        <nav className="nav">
          <Link className="logo" to="/">
            MAIAR
          </Link>
          <div className="nav-links">
            <Link to="/docs/getting-started">DOCS</Link>
            <Link href="https://x.com/Maiar_AI">X.COM</Link>
            <Link href="https://github.com/UraniumCorporation/maiar-ai">
              GITHUB
            </Link>
            <Link to="/plugins">PLUGINS</Link>
            <Link href="https://www.geckoterminal.com/solana/pools/9NtsQ8GprqrhZMzTK8Jhu2AoAqPnHEmZiUTLVfWeEDLP">
              TOKEN
            </Link>
          </div>
        </nav>

        {/* Hero content */}
        <main className="hero-content">
          <h1>
            An Extensible,
            <br /> Plugin-Based AI Agent Framework
          </h1>
          <p className="subheading">
            A ready-to-use, open framework featuring{" "}
            <b>multimodal capabilities</b>, swappable memory infrastructure, and
            a <b>plugin ecosystem</b>.
          </p>
          <div className="actions">
            <Link className="btn primary" to="/docs/getting-started">
              Get Started <ArrowRight size={16} />
            </Link>
            <Link
              className="btn secondary"
              href="https://x.com/maiar_ai/status/1902235957560013069"
            >
              Watch Demo
            </Link>
          </div>

          {/* Demo video */}
          <video
            src="/demo.mp4"
            autoPlay
            loop
            muted
            playsInline
            className="hero-image"
          />

          {/* Agent CEO & social entities */}
          <div className="agent-callout">
            <div className="agent-accounts">
              <div className="agent-account" aria-label="Agent CEO">
                <Link
                  href="https://x.com/UraniumCEO"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="agent-account"
                  aria-label="Agent CEO on X"
                >
                  <img
                    src="/img/CEO.png"
                    alt="Agent CEO portrait"
                    className="agent-account-avatar ceo-avatar"
                  />
                  <span className="agent-account-name">CEO</span>
                </Link>
              </div>

              <Link
                href="https://x.com/UraniumCubeCorp"
                target="_blank"
                rel="noopener noreferrer"
                className="agent-account"
                aria-label="Uranium Corporation on X"
              >
                <img
                  src="/img/ucorp_alpha.svg"
                  alt="Uranium Corporation X logo"
                  className="agent-account-avatar"
                />
                <span className="agent-account-name">UCORP</span>
              </Link>

              <Link
                href="https://x.com/Maiar_AI"
                target="_blank"
                rel="noopener noreferrer"
                className="agent-account"
                aria-label="MAIAR_AI on X"
              >
                <img
                  src="/img/maiar_alpha.svg"
                  alt="MAIAR_AI X logo"
                  className="agent-account-avatar"
                />
                <span className="agent-account-name">MAIAR</span>
              </Link>
            </div>
          </div>
        </main>

        {/* Scroll arrow */}
        <a
          href="#slide-1"
          className="scroll-arrow"
          aria-label="Scroll to next section"
        >
          &#8595;
        </a>
      </header>

      {/* Slides Section */}
      <section id="slide-1" className="slide">
        <h2>Declarative Multimodal Capabilities</h2>
        <p>
          MAIAR agents{" "}
          <a
            href="https://x.com/maiar_ai/status/1921316119375147283"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "#6CFF6C", textDecoration: "underline" }}
          >
            natively support multimodal input and output
          </a>
          —text, audio, vision, and beyond. The framework abstracts modality
          handling to a runtime level capability registry, enabling
          forward-compatible support for the accelerating scope of multimodal
          model capabilities without patching the core.
        </p>
        {useSlider ? (
          <FadeSlider
            slides={[
              <CodeBlock code={codeString} key="code" />,
              <CubeVisualization key="cube" />
            ]}
          />
        ) : (
          <div className="slide-content-wrapper">
            <CodeBlock code={codeString} />
            <CubeVisualization />
          </div>
        )}
      </section>

      <section id="slide-2" className="slide">
        <h2>Triggers &amp; Executors Architecture</h2>
        <p className="slide-text-left">
          A <b>trigger</b> starts the chain &mdash; an <b>executor</b> does the
          work. MAIAR's runtime lets you declare <b>HTTP&nbsp;routes</b> or hook
          into
          <b> native event listeners</b> (Discord, Slack, webhooks &mdash; you
          name it), each one dropping a fully-typed <code>Context</code> object
          onto the queue.
        </p>

        {useSlider ? (
          <FadeSlider
            slides={codeSlides.map((c, idx) => (
              <div key={idx} style={{ width: "100%" }}>
                <div className="code-title" style={{ marginBottom: "0.4rem" }}>
                  {c.title}
                </div>
                <CodeBlock code={c.code} />
              </div>
            ))}
            interval={5500}
          />
        ) : (
          <div className="carousel-code" style={{ display: "none" }} />
        )}
      </section>

      {/* Executor detail moved to its own dedicated slide */}
      <section id="slide-2b" className="slide">
        <div className="executor-detail">
          <div className="logo-morph" aria-hidden="true">
            <img src="/img/mcp.svg" alt="MCP logo placeholder" />
            <img src="/img/openai.svg" alt="OpenAI Codex logo placeholder" />
            <img src="/img/claude.svg" alt="Claude logo placeholder" />
          </div>
          <p className="slide-text-left">
            Executors live inside our <b>dynamic executor library</b>. Tool
            names and descriptions are generated on&nbsp;the&nbsp;fly with{" "}
            <code>.liquid</code> templates, and the same executor interface can
            wrap popular AI tooling like <b>MCP</b>,<b> OpenAI&nbsp;Codex</b>,{" "}
            <b>Claude</b>, or any custom&nbsp;SDK &mdash; no changes required to
            your agent logic.
          </p>
        </div>
      </section>

      <section id="slide-3" className="slide">
        <h2>Platform Integrations</h2>

        <div className="platform-section">
          <p className="platform-blurb">
            The MAIAR team maintains a growing roster of
            officially&nbsp;supported platform integrations so you can deploy
            your agent to popular social channels&nbsp;instantly.
          </p>

          {/* Icons row */}
          <div
            className="platform-icons-row"
            aria-label="Official platform connectors"
          >
            <Link
              href="https://github.com/UraniumCorporation/maiar-ai/tree/main/packages/plugin-discord"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Discord Plugin"
            >
              <img
                src="/img/discord.svg"
                alt="Discord logo"
                className="platform-icon"
              />
            </Link>
            <Link
              href="https://github.com/UraniumCorporation/maiar-ai/tree/main/packages/plugin-x"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X Plugin"
            >
              <img
                src="/img/x.svg"
                alt="X logo"
                className="platform-icon x-icon"
              />
            </Link>
            <Link
              href="https://github.com/UraniumCorporation/maiar-ai/tree/main/packages/plugin-telegram"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Telegram Plugin"
            >
              <Send className="platform-icon" />
            </Link>
          </div>
        </div>
      </section>

      {/* New Slide 3b: MAIAR Community */}
      <section id="slide-3b" className="slide">
        <h2>MAIAR Community</h2>

        <div className="platform-section">
          <div className="community-features">
            {/* Plugin Registry Feature */}
            <div className="community-feature">
              <div className="feature-icon">
                <Package />
              </div>
              <h3>Open Plugin Registry</h3>
              <p className="feature-desc">
                Browse or publish capabilities with a single command, and
                Supercharge your agent with community tooling.
              </p>
              <Link className="btn primary" to="/plugins">
                Browse Plugins
              </Link>
            </div>

            {/* Bounty Program Feature */}
            <div className="community-feature bounty-feature">
              <div className="feature-icon">
                <Skull />
              </div>
              <h3>Bounty Program</h3>
              <p className="feature-desc" style={{ textAlign: "right" }}>
                Automated, on-chain rewards for high-priority issues &mdash; no
                waiting, no ambiguity.
              </p>
              <p className="bounty-detail" style={{ textAlign: "right" }}>
                Uranium Corporation's GitHub Action workflow guarantees
                transparent payouts and prevents duplicate work through an RFC
                gate. It's also{" "}
                <a
                  href="https://github.com/UraniumCorporation/solana-payout-action"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  open sourced
                </a>{" "}
                and available for any Solana project.
              </p>
              <div className="feature-actions">
                <Link className="btn secondary" to="/docs/bounty-program">
                  How Bounties Work
                </Link>
                <Link
                  className="btn secondary"
                  href="https://x.com/maiar_ai/status/1898165736964772162"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Read Announcement
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Final Slide 4: Call-to-Action & Social Grid */}
      <section id="slide-4" className="slide">
        <h2>Ready to Build with MAIAR?</h2>
        <p>
          Dive into the docs, join our community spaces, and help shape the next
          wave of composable AI agents.
        </p>

        <div className="actions final-actions">
          <Link className="btn primary" to="/docs/getting-started">
            Get Started <ArrowRight size={16} />
          </Link>
          <Link
            className="btn secondary"
            href="https://x.com/maiar_ai/status/1902235957560013069"
            target="_blank"
            rel="noopener noreferrer"
          >
            Watch Demo
          </Link>
        </div>

        <div className="social-grid">
          {/* GitHub */}
          <Link
            href="https://github.com/UraniumCorporation/maiar-ai"
            target="_blank"
            rel="noopener noreferrer"
            className="social-item"
            aria-label="GitHub Repository"
          >
            <Github className="social-icon" />
            <span>GitHub</span>
          </Link>

          {/* Discord */}
          <Link
            href="https://discord.com/invite/7CAjkpCsED"
            target="_blank"
            rel="noopener noreferrer"
            className="social-item"
            aria-label="Join Discord"
          >
            <img src="/img/discord.svg" alt="Discord" className="social-icon" />
            <span>Discord</span>
          </Link>

          {/* Whitepaper */}
          <Link
            href="https://maiar.dev/maiar.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="social-item"
            aria-label="MAIAR Whitepaper PDF"
          >
            <FileText className="social-icon" />
            <span>Whitepaper</span>
          </Link>
          <Link
            href="https://t.me/MaiarAI"
            target="_blank"
            rel="noopener noreferrer"
            className="social-item"
            aria-label="Telegram"
          >
            <Send className="social-icon" />
            <span>Telegram</span>
          </Link>
          <Link
            href="https://x.com/i/communities/1873262529368969344"
            target="_blank"
            rel="noopener noreferrer"
            className="social-item"
            aria-label="MAIAR Community on X"
          >
            <img src="/img/x.svg" alt="X" className="social-icon" />
            <span>X&nbsp;Community</span>
          </Link>
        </div>
        {/* Socials avatar grid */}
        <div className="socials-section">
          <h3 className="socials-heading">Socials</h3>
          <div className="socials-grid">
            <Link
              href="https://x.com/UraniumCubeCorp"
              target="_blank"
              rel="noopener noreferrer"
              className="dev-item"
              aria-label="UCorp on X"
            >
              <img
                src="/img/ucorp_x.png"
                alt="UCorp avatar"
                className="dev-avatar"
              />
              <span>UCORP</span>
            </Link>
            <Link
              href="https://x.com/Maiar_AI"
              target="_blank"
              rel="noopener noreferrer"
              className="dev-item"
              aria-label="MAIAR on X"
            >
              <img
                src="/img/maiar_x.png"
                alt="MAIAR avatar"
                className="dev-avatar"
              />
              <span>MAIAR</span>
            </Link>
            <Link
              href="https://x.com/UraniumCEO"
              target="_blank"
              rel="noopener noreferrer"
              className="dev-item"
              aria-label="CEO on X"
            >
              <img
                src="/img/ceo_x.jpg"
                alt="CEO avatar"
                className="dev-avatar"
              />
              <span>CEO</span>
            </Link>
          </div>
        </div>

        {/* Dev team section (outside grid) */}
        <div className="dev-section">
          <h3 className="dev-heading">Lead Devs</h3>
          <div className="dev-grid">
            <Link
              href="https://x.com/0xPBIT"
              target="_blank"
              rel="noopener noreferrer"
              className="dev-item"
              aria-label="0xPBIT on X"
            >
              <img
                src="/img/0xpbit.jpg"
                alt="0xPBIT avatar"
                className="dev-avatar"
              />
              <span>0xPBIT</span>
            </Link>
            <Link
              href="https://x.com/0xOdditor"
              target="_blank"
              rel="noopener noreferrer"
              className="dev-item"
              aria-label="0xOdditor on X"
            >
              <img
                src="/img/0xodditor.jpg"
                alt="0xOdditor avatar"
                className="dev-avatar"
              />
              <span>0xODDITOR</span>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
