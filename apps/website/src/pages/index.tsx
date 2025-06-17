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
  Eye,
  FileText,
  MessageCircle,
  Music,
  PenTool,
  Server,
  Shapes,
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
            /* ---- Color variables (edit these to change palette) ---- */
            :root {
              /* greens */
              --blob-color-1: #6CFF6C; /* light green */
              --blob-color-2: #00F000; /* neon green */
              --blob-color-3: #009800; /* deep green */
              --blob-color-4: #00EB00; /* mid green */
              /* yellows */
              --blob-color-5: #F7FF00; /* bright yellow */
              --blob-color-6: #99FF00; /* lime yellow */
            }

            /* ---- Layout ---- */
            html,body{margin:0;padding:0;width:100%;height:100%;}
            body{font-family:'Inter',-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#fff;background:#000;}

            .hero{position:relative;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;min-height:100vh;overflow:hidden;padding:0 1.5rem;}

            /* ---- Navigation ---- */
            .nav{position:absolute;top:0;left:0;width:100%;display:flex;justify-content:space-between;align-items:center;padding:1.25rem 2rem;z-index:10;}
            .logo{font-size:3rem;font-weight:1000;letter-spacing:0.05em;text-transform:uppercase;color:#fff;text-decoration:none;}
            .nav-links{display:flex;gap:1rem;font-size:0.9rem;font-weight:800;letter-spacing:0.075em;text-transform:uppercase;}
            .nav-links a{color:#fff;text-decoration:none;opacity:0.9;transition:opacity .25s ease;}
            .nav-links a:hover{opacity:1;}

            /* ---- Ucorp Callout ---- */
            .ucorp-callout {
              position: fixed;
              bottom: 1.5rem;
              left: 1.5rem;
              display: flex;
              align-items: center;
              gap: 0.75rem;
              padding: 0.5rem 1rem;
              background: rgba(255, 255, 255, 0.05);
              border: 1px solid rgba(255, 255, 255, 0.1);
              border-radius: 999px;
              backdrop-filter: blur(10px);
              z-index: 100;
              transition: all 0.3s ease;
              text-decoration: none !important;
            }
            .ucorp-callout:hover {
              background: rgba(255, 255, 255, 0.1);
              transform: translateY(-2px);
            }
            .ucorp-callout img {
              height: 20px;
              width: 20px;
            }
            .ucorp-callout span {
              font-size: 0.8rem;
              font-weight: 600;
              color: rgba(255, 255, 255, 0.8);
              letter-spacing: 0.02em;
            }

            /* ---- Hero text ---- */
            .hero-content{
              max-width:70rem;
              z-index:5;
              transform:translateY(1vmin);
              text-align: left;
            }
            .hero-content h1 {
              font-size: clamp(1.8rem, 4vw + 1rem, 3.2rem);
              font-weight: 900;
              margin: 0 auto 1.25rem;
              line-height: 1.1;
              letter-spacing: 0.02em;
              text-transform: uppercase;
            }
            .subheading {
              font-size: 1.35rem;
              opacity: 0.9;
            }

            /* ---- Demo image ---- */
            .hero-image {
              width: 100%;
              max-width: min(1000px, 100vw, 75vh);
              margin: 2.5rem auto 0;
              display: block;
              border-radius: 0.5rem;
              box-shadow: 0 0 40px rgba(0, 255, 0, 0.15);
              border: 1px solid rgba(194, 255, 102, 0.25);
            }

            /* ---- CTA buttons ---- */
            .actions {
              display: flex;
              gap: 1rem;
              justify-content: left;
              flex-wrap: wrap;
            }

            .btn{
              display:inline-flex;
              align-items:center;
              gap:0.25rem;
              padding:0.5rem 1.75rem;
              border-radius:9999px;
              font-size:0.875rem;
              font-weight:600;
              text-decoration:none;
              letter-spacing:0.05em;
              transition:background .25s ease,color .25s ease,border-color .25s ease;
            }
            
            .btn.primary {
              background: #f3ffe5;
              color: #0e4500;
              box-shadow: 0 0 10px 0 rgba(255, 255, 255, 0.5);
            }

            .btn.primary:hover {
              background:#e2e2e2;
            }

            .btn.secondary {
              background:rgba(255,255,255,0.1);
              color:#fff;
              border:2px solid #fff;
            }

            .btn.secondary:hover {
              background:rgba(255,255,255,0.2);
            }

            /* ---- Moving blurred blobs ---- */
            .blur-bg {
              pointer-events:none;
              position:fixed;
              inset:0;
              overflow:hidden;
              z-index:-1;
            }
            .blob{position:absolute;border-radius:50%;filter:blur(100px) saturate(110%);mix-blend-mode:screen;will-change:transform;}

            /* top-left cluster - two slim tilted ellipses */
            .blob-1{width:320px;height:630px;top:-85px;left:50%;margin-left:-535px;background:var(--blob-color-1);opacity:0.5;animation:blob1Drift 90s ease-in-out infinite alternate;}
            .blob-2{width:345px;height:660px;top:-60px;left:50%;margin-left:-490px;background:var(--blob-color-2);opacity:0.5;animation:blob2Drift 100s ease-in-out infinite alternate-reverse;}

            /* top-right cluster -s two overlapping greens */
            .blob-3{width:375px;height:550px;top:60px;left:50%;margin-left:415px;background:var(--blob-color-3);opacity:0.5;animation:blob3Drift 110s linear infinite;}
            .blob-4{width:345px;height:375px;top:0;left:50%;margin-left:405px;background:var(--blob-color-4);opacity:0.5;animation:blob4Drift 95s ease-in-out infinite alternate;}

            /* central yellows sweeping across hero */
            .blob-5{width:145px;height:460px;top:0;left:50%;margin-left:-260px;background:var(--blob-color-5);opacity:0.9;animation:blob5Drift 120s ease-in-out infinite;}
            .blob-6{width:320px;height:530px;top:85px;left:50%;margin-left:-145px;background:var(--blob-color-6);opacity:0.5;animation:blob6Drift 115s ease-in-out infinite alternate-reverse;}

            /* Path animations intentionally route through center so blobs intersect */
            @keyframes blob1Drift{
              0%{transform:translate(calc(var(--scroll-translate-x-1, 0px)), 0) rotate(45deg);}
              50%{transform:translate(calc(6% + var(--scroll-translate-x-1, 0px)), 10%) rotate(35deg);}
              100%{transform:translate(calc(var(--scroll-translate-x-1, 0px)), 0) rotate(30deg);} }
            @keyframes blob2Drift{
              0%{transform:translate(calc(var(--scroll-translate-x-2, 0px)), 0) rotate(50deg);}
              50%{transform:translate(calc(-5% + var(--scroll-translate-x-2, 0px)), 6%) rotate(55deg);}
              100%{transform:translate(calc(var(--scroll-translate-x-2, 0px)), 0) rotate(50deg);} }
            @keyframes blob3Drift{
              0%{transform:translate(calc(var(--scroll-translate-x-3, 0px)), 0) rotate(-40deg);}
              50%{transform:translate(calc(-6% + var(--scroll-translate-x-3, 0px)), 4%) rotate(-35deg);}
              100%{transform:translate(calc(var(--scroll-translate-x-3, 0px)), 0) rotate(-40deg);} }
            @keyframes blob4Drift{
              0%{transform:translate(calc(var(--scroll-translate-x-4, 0px)), 0) rotate(-35deg);}
              50%{transform:translate(calc(4% + var(--scroll-translate-x-4, 0px)), 6%) rotate(-30deg);}
              100%{transform:translate(calc(var(--scroll-translate-x-4, 0px)), 0) rotate(-35deg);} }
            @keyframes blob5Drift{
              0%{transform:translate(calc(var(--scroll-translate-x-5, 0px)), 0) rotate(calc(75deg + var(--scroll-rotate-5, 0deg)));}
              50%{transform:translate(calc(8% + var(--scroll-translate-x-5, 0px)), -4%) rotate(calc(234deg + var(--scroll-rotate-5, 0deg)));}
              100%{transform:translate(calc(var(--scroll-translate-x-5, 0px)), 0) rotate(calc(75deg + var(--scroll-rotate-5, 0deg)));} }
            @keyframes blob6Drift{
              0%{transform:translate(calc(var(--scroll-translate-x-6, 0px)), 0) rotate(calc(18deg + var(--scroll-rotate-6, 0deg)));}
              50%{transform:translate(calc(-8% + var(--scroll-translate-x-6, 0px)), 6%) rotate(calc(23deg + var(--scroll-rotate-6, 0deg)));}
              100%{transform:translate(calc(var(--scroll-translate-x-6, 0px)), 0) rotate(calc(18deg + var(--scroll-rotate-6, 0deg)));} }

            /* ---- Motion preference ---- */
            @media (prefers-reduced-motion:reduce){
              .blob{animation:none;}
            }

            @media (max-width: 900px) {
              .ucorp-callout span{
                display: none;
              }

            .ucorp-callout {
                gap: 0;
                padding: 0.5rem;
              }
            }

            /* ---- Mobile adjustments ---- */
            @media (max-width: 600px) {
              .nav {
                flex-direction: column;
                align-items: center;
                padding: 1rem 1rem;
              }
              .logo {
                font-size: 2rem;
                margin-bottom: 0.5rem;
              }
              .nav-links {
                font-size: 0.75rem;
                gap: 0.5rem;
                flex-wrap: wrap;
                justify-content: center;
                text-align: center;
              }
              .ucorp-callout span {
                display: none;
              }
              .ucorp-callout {
                gap: 0;
                padding: 0.5rem;
              }
              /* Tighter padding for code on phones */
              .code-block-container { padding: 0px !important; }
            }

            /* ---- Scroll behaviour & native snap ---- */
            html{scroll-behavior:smooth;scroll-snap-type:y mandatory;}
            .hero,.slide{scroll-snap-align:start;}

            body{margin:0;}

            .scroll-arrow{position:absolute;bottom:2rem;left:50%;transform:translateX(-50%);font-size:2.25rem;color:#fff;text-decoration:none;opacity:0.8;animation:bounce 2s infinite;z-index:5;}
            @keyframes bounce{0%,100%{transform:translate(-50%,0);}50%{transform:translate(-50%,-10px);}}

            /* ---- Slide sections ---- */
            .slide{
              position:relative;
              min-height:100vh;
              display:flex;
              flex-direction:column;
              justify-content:center;
              align-items:center;
              text-align:center;
              padding:1rem 1.5rem; /* reduced horizontal padding */
              background:transparent;
              overflow:hidden; /* prevent horizontal bleed */
              box-sizing:border-box;
            }
            .slide h2{font-size:clamp(2rem, 3.5vw + 1rem, 2.8rem);margin-bottom:1.5rem;letter-spacing:0.04em;font-weight:800;text-transform:uppercase;}
            .slide p{font-size:1.5rem;max-width:58ch;opacity:0.9;line-height:1.7;margin:0 auto;font-weight:600;}

            #slide-1 > h2,
            #slide-1 > p {
              width: 100%;
              max-width: 1300px;
              text-align: left;
            }

            /* Wrapper for cube and code block */
            .slide-content-wrapper {
              display:flex;
              align-items:center;
              justify-content:center;
              gap:2rem;
              flex-wrap:wrap; /* allow wrapping when viewport narrower */
              width:100%;
              max-width:1100px; /* tighter width to remove bleed */
              margin-top:0.5rem;
              box-sizing:border-box;
            }

            /* Code block styles */
            .code-block-container {
              background: rgba(14, 28, 14, 0.4);
              border:1px solid rgba(108,255,108,0.25);
              border-radius:0.75rem;
              padding:1.25rem;
              backdrop-filter:blur(10px);
              width:100%;
              max-width:600px; /* narrower to fit alongside cube */
              flex:1 1 300px; /* allow grow/shrink */
              box-shadow:0 4px 20px rgba(0,0,0,0.25);
              transition:opacity 0.3s ease;
              text-align:left;
              overflow-x:auto;
            }

            .code-block-container pre {
              margin: 0;
              background: transparent !important;
              white-space: pre-wrap;
              word-break: break-word;
            }

            /* Cube visualization styles */
            .cube-container {
              position: relative;
              display: flex;
              justify-content: center;
              align-items: center;
              width: 440px;
              height: 380px;
              flex-shrink: 0;
            }
            
            /* Ensure the cube image always remains perfectly square */
            .cube-image {
              width: min(180px, 40vw);
              height: min(180px, 40vw);
              object-fit: contain;      /* Prevent any stretching/compression */
              max-width: 500px;
              max-height: 500px;
              position: relative;
              z-index: 2;
            }
            
            .spline-svg {
              position: absolute;
              top: 0;
              left: 0;
              width: 100%;
              height: 100%;
              pointer-events: none;
              z-index: 1;
            }
            
            .spline-path {
              fill: none;
              stroke: url(#splineGradient);
              stroke-width: 2;
              stroke-dasharray: 200;
              stroke-dashoffset: 200;
              animation: drawSpline 3s ease-in-out infinite;
            }


            .capability-icon {
              position: absolute;
              width: 44px;
              height: 44px;
              background: linear-gradient(
                135deg,
                rgba(108, 255, 108, 0.1) 0%,
                rgba(247, 255, 0, 0.1) 50%,
                rgba(153, 255, 0, 0.1) 100%
              );
              border-radius: 50%;
              /* Increased blur for a more glassy effect */
              backdrop-filter: blur(40px) saturate(120%);
              display: flex;
              align-items: center;
              justify-content: center;
              transition: all 0.3s ease;
              z-index: 3;

              /* 
                Neon glass effect based on tutorial.
                Using neon green (108, 255, 108) instead of white.
                Shadows are layered in order, first on top.
              */
              box-shadow:
                /* 1. Main highlight from top */
                inset 0 6px 12px rgba(172, 255, 108, 0.4),
                /* 2. Dark contour for depth from bottom */
                inset 0 -40px 40px rgba(0, 0, 0, 0.2),
                /* 3. Highlight from bottom edge */
                inset 0 -6px 18px rgba(108, 255, 108, 0.4),
                /* 4. Diffused glow from top */
                inset 0 40px 40px rgba(108, 255, 108, 0.24),
                /* 5. Sharp reflection on top edge */
                inset 0 2px 1px rgba(108, 255, 108, 0.8),
                /* Outer drop shadow for hierarchy */
                0 0 20px rgba(0, 0, 0, 0.2);
            }
          
            /* Position icons around the cube */
            .icon-vision {
              top: 30px;
              left: 50%;
              transform: translateX(-50%);
            }
            
            .icon-music {
              top: 60px;
              right: 100px;
            }
            
            .icon-audio {
              right: 80px;
              top: 50%;
              transform: translateY(-50%);
            }
            
            .icon-chart {
              bottom: 60px;
              right: 100px;
            }
            
            .icon-video {
              bottom: 30px;
              left: 50%;
              transform: translateX(-50%);
            }
            
            .icon-shapes {
              bottom: 60px;
              left: 100px;
            }
            
            .icon-text {
              left: 80px;
              top: 50%;
              transform: translateY(-50%);
            }
            
            .icon-vector {
              top: 60px;
              left: 100px;
            }
            
            .capability-icon svg {
              width: 20px;
              height: 20px;
              color: rgba(108, 255, 108, 0.9);
              filter: drop-shadow(0 0 8px rgba(108, 255, 108, 0.3));
            }
            
            @keyframes drawSpline {
              0% {
                stroke-dashoffset: 200;
                opacity: 0.3;
              }
              50% {
                stroke-dashoffset: 0;
                opacity: 0.8;
              }
              100% {
                stroke-dashoffset: -200;
                opacity: 0.3;
              }
            }
            
            /* Remove floating animation to stabilize icon position */
            .capability-icon { animation: none; }
            
            /* Floating blobs added at runtime have their motion handled via JS */
            .blob-floating { animation: none; }
            
            /* Responsive adjustments */
            @media (max-width: 768px) {
              .slide-content-wrapper {
                margin-top: 1rem;
                gap: 1.25rem;
              }

              /* Reduce gap between paragraph and code carousel on Slide-2 */
              #slide-2 .fade-slider {
                margin-top: 1rem; /* was 2rem */
              }

              .cube-container {
                height: 400px;
                margin: 2rem 0;
              }
              
              .cube-image {
                width: min(250px, 50vw);
                height: min(250px, 50vw);
              }
              
              .capability-icon {
                width: 36px;
                height: 36px;
              }
              
              .capability-icon svg {
                width: 16px;
                height: 16px;
              }
              
              .icon-vision, .icon-video {
                transform: translateX(-50%);
              }
              
              .icon-audio, .icon-text {
                transform: translateY(-50%);
              }

              /* Hide splines and bring side icons closer on small screens */
              .spline-svg {
                display: none;
              }

              /* Right-side icons */
              .icon-audio {
                right: 20px;
              }
              .icon-music {
                right: 40px;
                top: 40px;
              }
              .icon-chart {
                right: 40px;
                bottom: 40px;
              }

              /* Left-side icons */
              .icon-text {
                left: 20px;
              }
              .icon-vector {
                left: 40px;
                top: 40px;
              }
              .icon-shapes {
                left: 40px;
                bottom: 40px;
              }

              /* Reduce container height slightly */
              .cube-container {
                height: 320px;
                max-width: 300px;
                width: 80vw;
                margin-top: 1rem;
                margin-bottom: 3rem;
              }
            }

            /* ---- Highlights section ---- */
            .highlights{position:relative;min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:0 1.5rem;background:transparent;}
            .highlights h2{font-size:clamp(2.4rem, 4.5vw + 1rem, 3.4rem);margin-bottom:3rem;letter-spacing:0.04em;font-weight:800;text-transform:uppercase;}
            .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1.5rem;max-width:1100px;width:100%;}
            .card{position:relative;padding:2rem 1.75rem;border-radius:1rem;background:rgba(255,255,255,0.04);border:1px solid rgba(194,255,102,0.25);backdrop-filter:blur(12px) saturate(120%);overflow:hidden;}
            .card::before{content:"";position:absolute;inset:0;border-radius:inherit;background:linear-gradient(135deg,rgba(243,255,229,0.15) 0%,rgba(194,255,102,0.15) 100%);mix-blend-mode:screen;pointer-events:none;}
            .card:hover{transform:translateY(-6px);box-shadow:0 6px 18px rgba(0,0,0,0.35),0 0 12px rgba(194,255,102,0.25);border-color:rgba(194,255,102,0.4);}
            .card h3{margin:0 0 0.75rem;font-size:1.25rem;font-weight:800;letter-spacing:0.03em;text-transform:uppercase;}
            .card p{margin:0;font-size:1.05rem;opacity:0.9;line-height:1.5;font-weight:600;}
            @media(max-width:600px){.highlights h2{margin-bottom:2rem;}.cards{gap:1rem;}.card{padding:1.5rem 1.25rem;}}

            /* ---- Overlay ---- */
             .overlay{position:fixed;inset:0;pointer-events:none;background:#000;opacity:0;transition:opacity .1s linear;z-index:1;}

            /* Bring main sections above overlay */
            .hero,.slide{position:relative;z-index:2;}

            /* Fade slider ------------------------------------------------------------------*/
            .fade-slider {
              position: relative;
              width: 100%;
              max-width: 750px;
              margin: 2rem auto 0;
            }
            .fade-slide {
              position: absolute;
              inset: 0;
              opacity: 0;
              transition: opacity 0.6s ease-in-out;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
            }
            .fade-slide.active {
              opacity: 1;
              position: relative; /* take space when active */
            }
            .fade-dots {
              display: flex;
              justify-content: center;
              gap: 0.5rem;
              margin-top: 1rem;
            }
            .fade-dot {
              width: 10px;
              height: 10px;
              border-radius: 50%;
              background: rgba(255, 255, 255, 0.4);
              cursor: pointer;
              transition: background 0.25s ease;
            }
            .fade-dot.active {
              background: #6CFF6C;
            }
            @media (min-width: 1301px) {
              .fade-slider { display: none; }
            }

            /* Icon row for triggers -> executors visualization */
            .trigger-executor-visual {
              display: flex;
              align-items: center;
              gap: 1.25rem;
              margin: 1.5rem 0;
            }
            .trigger-icons, .executor-icons {
              display: flex;
              gap: 0.75rem;
            }
            .trigger-executor-visual svg {
              width: 32px;
              height: 32px;
              color: #6CFF6C;
              filter: drop-shadow(0 0 6px rgba(108, 255, 108, 0.35));
            }
            .arrow-divider {
              font-size: 1.75rem;
              font-weight: 900;
              color: #fff;
            }

            .code-title {
              font-size: 1rem;
              font-weight: 800;
              margin-bottom: 0.4rem;
              text-align: left;
              letter-spacing: 0.03em;
            }

            /* Stack title above code in Slide-2 carousel */
            .carousel-code .carousel-item {
              flex-direction: column;
              width: 100vw;
              align-items: stretch; /* allow children to fill width */
            }

            /* Ensure Slide-2 carousel is visible on large screens */
            #slide-2 .carousel-code {
              display: block;
              max-width: 750px;
              width: 100%;
              margin-top: 0.5rem;
            }

            /* Make Slide-2 code blocks span full carousel width */
            #slide-2 .carousel-code .code-block-container {
              max-width: none;
              width: 100%;
              flex: 1 1 auto;
            }

            /* Tweak item alignment so vertical centering doesn't squash width */
            #slide-2 .carousel-code .carousel-item {
              justify-content: flex-start; /* stack title + code at top */
            }

            /* Allow Slide-2 carousel height to shrink with content */
            #slide-2 .carousel-inner {
              min-height: auto;
            }

            /* Left-align custom text blocks on Slide-2 and Slide-2b */
            #slide-2 .slide-text-left, #slide-2b .slide-text-left {
              text-align: left;
              width: 100%;
              max-width: 75ch; /* slightly wider paragraph */
              margin: 1.5rem 0; /* breathing room */
              align-self: flex-start; /* left-align within slide flex container */
            }

            /* Container for paragraph + morphing logo */
            #slide-2 .executor-detail, #slide-2b .executor-detail {
              display: flex;
              align-items: center; /* vertically center svg relative to paragraph */
              gap: 2.5rem; /* balanced spacing between paragraph and icon */
              width: 100%;
              max-width: 90ch; /* allow wider paragraph */
              align-self: flex-start;
            }

            /* Morphing logo animation */
            .logo-morph {
              position: relative;
              width: 100px; /* enlarged icon size */
              height: 100px; /* enlarged icon size */
              display: flex;
              justify-content: center;
              align-items: center;
              flex-shrink: 0;
            }
            .logo-morph img {
              position: absolute;
              inset: 0;
              width: 100%;
              height: 100%;
              object-fit: contain;
              opacity: 0;
              transform: scale(0.8);
              animation: logoMorph 9s infinite ease-in-out;
            }
            .logo-morph img:nth-child(1) { animation-delay: 0s; }
            .logo-morph img:nth-child(2) { animation-delay: 3s; }
            .logo-morph img:nth-child(3) { animation-delay: 6s; }

            @keyframes logoMorph {
              0% { opacity: 1; transform: scale(1); filter: blur(0); }
              28% { opacity: 1; transform: scale(1.15); filter: blur(0); }
              33% { opacity: 0; transform: scale(0.8); filter: blur(1px); }
              95% { opacity: 0; transform: scale(0.8); filter: blur(4px); }
              100% { opacity: 1; transform: scale(1); filter: blur(0); }
            }

            /* Stack vertically on mobile */
            @media (max-width: 600px) {
              #slide-2 .executor-detail {
                flex-direction: column;
                align-items: center; /* center children horizontally */
              }
              #slide-2 .logo-morph {
                align-self: center; /* ensure icon itself is centered */
                margin-top: 1rem;
              }
            }

            /* Color morphing SVG logos with site accent green */
            #slide-2 .logo-morph svg, #slide-2b .logo-morph svg {
              color: var(--blob-color-1);
            }

            /* Override previous width overrides to keep slides full width */
            .carousel-item {
              padding: 0; /* remove extra padding that caused width overflow */
              flex: 0 0 100% !important; /* full width */
              max-width: 100% !important;
              box-sizing: border-box;
            }
            .carousel-item > * {
              max-width: 100% !important;
              flex: 1 1 100% !important;
            }
            /* Ensure code-block respects border-box so borders don't add width */
            .code-block-container {
              box-sizing: border-box;
            }

            /* Mobile font size adjustments */
            @media (max-width: 600px) {
              html { font-size: 75%; }
              .hero-content h1 { font-size: clamp(1.3rem, 5vw + 0.5rem, 2.2rem); }
              .subheading { font-size: 1.1rem; }
              .slide h2 { font-size: clamp(1.6rem, 4vw + 0.8rem, 2.1rem); }
              .slide p { font-size: 1.2rem; }
              .nav-links { font-size: 0.65rem; }
              .card h3 { font-size: 1rem; }
              .card p { font-size: 0.9rem; }
            }

            /* Layout tweaks for Slide-2b: stack logo above paragraph */
            #slide-2b .executor-detail {
              flex-direction: column;
              align-items: center;
            }
            #slide-2b .slide-text-left {
              text-align: center;
              align-self: center;
            }

            /* Responsive mobile adjustments for new Slide-2b */
            @media (max-width: 600px) {
              #slide-2b .executor-detail {
                flex-direction: column;
                align-items: center;
              }
              #slide-2b .logo-morph {
                align-self: center;
                margin-top: 1rem;
              }
            }
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
            A Composable, Extensible,
            <br /> Plugin-Based AI Agent Framework
          </h1>
          <p className="subheading">
            A ready-to-use, open framework featuring{" "}
            <b>multimodal capabilities</b>, swappable memory infrastructure, and
            a <b>plugin ecosystem</b>. Fully customizable to use your models,
            tools, and system prompts. <b>Launch your agents on day one.</b>
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
        <h2>Community Plugin Registry &amp; Platform Integrations</h2>
        <p>
          Discover, share, and integrate community-built plugins from our open
          GitHub registry, plus official integrations for Discord, X, Telegram,
          and more.
        </p>
      </section>
    </div>
  );
}
