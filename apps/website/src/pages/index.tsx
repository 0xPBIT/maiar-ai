import React, { useEffect, useRef, useState } from "react";
import type { JSX } from "react";

import Head from "@docusaurus/Head";
import Link from "@docusaurus/Link";

// NEW HOMEPAGE IMPLEMENTATION
export default function Home(): JSX.Element {
  // Reference to the scroll container (entire page content)
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [overlayOpacity, setOverlayOpacity] = useState(0);

  // Store random horizontal shift factors for each blob
  const blobShiftFactors = useRef<number[]>([]);
  // Store random rotation factors for yellow blobs (5 and 6)
  const blobRotationFactors = useRef<number[]>([]);

  // Update overlay opacity and blob positions based on scroll
  useEffect(() => {
    const blobs = Array.from(
      document.querySelectorAll(".blob")
    ) as HTMLElement[];

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

  return (
    <div ref={scrollRef}>
      <Head>
        <title>MAIAR</title>
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
            body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#fff;background:#000;}

            .hero{position:relative;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;min-height:100vh;overflow:hidden;padding:0 1.5rem;}

            /* ---- Navigation ---- */
            .nav{position:absolute;top:0;left:0;width:100%;display:flex;justify-content:space-between;align-items:center;padding:1.25rem 2rem;z-index:10;}
            .logo{font-size:3rem;font-weight:1000;letter-spacing:0.05em;text-transform:uppercase;color:#fff;text-decoration:none;}
            .nav-links{display:flex;gap:1rem;font-size:0.9rem;font-weight:800;letter-spacing:0.075em;text-transform:uppercase;}
            .nav-links a{color:#fff;text-decoration:none;opacity:0.9;transition:opacity .25s ease;}
            .nav-links a:hover{opacity:1;}

            /* ---- Hero text ---- */
            .hero-content{max-width:52rem;z-index:5;transform:translateY(1vmin);}
            .hero-content h1{font-size:clamp(2.25rem,4vw+1rem,3.5rem);font-weight:700;margin:0 auto 1rem;line-height:1.15;}
            .subheading{font-size:1rem;opacity:0.85;margin-bottom:2.25rem;line-height:1.5;}

            /* ---- Demo image ---- */
            .hero-image{width:100%;max-width:900px;margin:2.5rem auto 0;display:block;border-radius:0.5rem;box-shadow:0 0 40px rgba(0,255,0,0.05);}

            /* ---- CTA buttons ---- */
            .actions{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;}
            .btn{display:inline-block;padding:0.5rem 1.75rem;border-radius:9999px;font-size:0.875rem;font-weight:600;text-decoration:none;letter-spacing:0.05em;transition:background .25s ease,color .25s ease,border-color .25s ease;}
            .btn.primary{background:#F3FFE5;color:#0E4500;box-shadow:0 0 10px 0 rgba(255,255,255,0.5);}
            .btn.primary:hover{background:#e2e2e2;}
            .btn.secondary{background:rgba(255,255,255,0.1);color:#fff;border:2px solid #fff;}
            .btn.secondary:hover{background:rgba(255,255,255,0.2);}

            /* ---- Moving blurred blobs ---- */
            .blur-bg{pointer-events:none;position:fixed;inset:0;overflow:hidden;z-index:-1;}
            .blob{position:absolute;border-radius:50%;filter:blur(100px) saturate(110%);mix-blend-mode:screen;will-change:transform;}

            /* top-left cluster - two slim tilted ellipses */
            .blob-1{width:22vmax;height:44vmax;top:-6vmax;left:13vmax;background:var(--blob-color-1);opacity:0.5;animation:blob1Drift 90s ease-in-out infinite alternate;}
            .blob-2{width:24vmax;height:46vmax;top:-4vmax;left:16vmax;background:var(--blob-color-2);opacity:0.5;animation:blob2Drift 100s ease-in-out infinite alternate-reverse;}

            /* top-right cluster -s two overlapping greens */
            .blob-3{width:26vmax;height:38vmax;top:4vmax;right:-5vmax;background:var(--blob-color-3);opacity:0.5;animation:blob3Drift 110s linear infinite;}
            .blob-4{width:24vmax;height:26vmax;top:0;right:-2vmax;background:var(--blob-color-4);opacity:0.5;animation:blob4Drift 95s ease-in-out infinite alternate;}

            /* central yellows sweeping across hero */
            .blob-5{width:10vmax;height:32vmax;top:0vmax;left:32vmax;background:var(--blob-color-5);opacity:0.9;animation:blob5Drift 120s ease-in-out infinite;}
            .blob-6{width:22vmax;height:37vmax;top:6vmax;left:40vmax;background:var(--blob-color-6);opacity:0.5;animation:blob6Drift 115s ease-in-out infinite alternate-reverse;}

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
            }

            /* ---- Scroll behaviour & native snap ---- */
            html{scroll-behavior:smooth;scroll-snap-type:y mandatory;}
            .hero,.highlights{scroll-snap-align:start;}

            body{margin:0;}

            .scroll-arrow{position:absolute;bottom:2rem;left:50%;transform:translateX(-50%);font-size:2.25rem;color:#fff;text-decoration:none;opacity:0.8;animation:bounce 2s infinite;z-index:5;}
            @keyframes bounce{0%,100%{transform:translate(-50%,0);}50%{transform:translate(-50%,-10px);}}

            /* ---- Highlights section ---- */
            .highlights{position:relative;min-height:100vh;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:0 1.5rem;background:transparent;}
            .highlights h2{font-size:clamp(1.75rem,4vw+1rem,2.75rem);margin-bottom:3rem;letter-spacing:0.03em;font-weight:700;}
            .cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:1.5rem;max-width:1000px;width:100%;}
            .card{position:relative;padding:2rem 1.75rem;border-radius:1rem;background:rgba(255,255,255,0.04);border:1px solid rgba(194,255,102,0.25);backdrop-filter:blur(12px) saturate(120%);overflow:hidden;}
            .card::before{content:"";position:absolute;inset:0;border-radius:inherit;background:linear-gradient(135deg,rgba(243,255,229,0.15) 0%,rgba(194,255,102,0.15) 100%);mix-blend-mode:screen;pointer-events:none;}
            .card:hover{transform:translateY(-6px);box-shadow:0 6px 18px rgba(0,0,0,0.35),0 0 12px rgba(194,255,102,0.25);border-color:rgba(194,255,102,0.4);}
            .card h3{margin:0 0 0.75rem;font-size:1.25rem;font-weight:700;}
            .card p{margin:0;font-size:0.9rem;opacity:0.9;line-height:1.5;}
            @media(max-width:600px){.highlights h2{margin-bottom:2rem;}.cards{gap:1rem;}.card{padding:1.5rem 1.25rem;}}

            /* ---- Overlay ---- */
             .overlay{position:fixed;inset:0;pointer-events:none;background:#000;opacity:0;transition:opacity .1s linear;z-index:1;}

            /* Bring main sections above overlay */
            .hero,.highlights{position:relative;z-index:2;}
          `}
        </style>
      </Head>

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
            A ready-to-use, open framework featuring a plugin
            ecosystem—customize every piece and launch your AI agents on day
            one.
          </p>
          <div className="actions">
            <Link className="btn primary" to="/docs/getting-started">
              Get Started
            </Link>
            <Link
              className="btn secondary"
              href="https://x.com/maiar_ai/status/1902235957560013069"
            >
              Watch Demo
            </Link>
          </div>

          {/* Demo image */}
          <img
            src="/img/demo.png"
            alt="MAIAR demo screenshot"
            className="hero-image"
          />
        </main>

        {/* Scroll arrow */}
        <a
          href="#highlights"
          className="scroll-arrow"
          aria-label="Scroll to highlights"
        >
          &#8595;
        </a>
      </header>

      {/* Highlights Section */}
      <section id="highlights" className="highlights">
        <h2>Why Choose MAIAR?</h2>
        <div className="cards">
          <div className="card">
            <h3>Triggers &amp; Actions Architecture</h3>
            <p>
              Separate what starts work (triggers) from what does work
              (actions), keeping your agent flexible and event-driven.
            </p>
          </div>
          <div className="card">
            <h3>Model-Agnostic &amp; Future-Proof</h3>
            <p>
              Swap between GPT-4, local LLMs, or custom providers with a single
              line. The unopinionated core ensures you're never locked in.
            </p>
          </div>
          <div className="card">
            <h3>Declarative Capabilities</h3>
            <p>
              Plugins declare their own capabilities and MAIAR's runtime
              intelligently orchestrates them—less wiring, more building.
            </p>
          </div>
          <div className="card">
            <h3>Community Plugin Registry</h3>
            <p>
              Discover, share, and integrate community-built plugins from our
              open GitHub registry to extend your agent in minutes.
            </p>
          </div>
          <div className="card">
            <h3>Platform Integrations</h3>
            <p>
              Connect your agent to the world with official plugins for Discord,
              X (Twitter), Telegram, and more.
            </p>
          </div>
          <div className="card">
            <h3>Multimodal Capabilities</h3>
            <p>
              Go beyond text. With support for image and audio models, your
              agent can see, hear, and generate rich content for advanced,
              real-world tasks.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
