import React from "react";
import type { JSX } from "react";

import Head from "@docusaurus/Head";
import Link from "@docusaurus/Link";

// NEW HOMEPAGE IMPLEMENTATION
export default function Home(): JSX.Element {
  return (
    <>
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
            .nav-links{display:flex;gap:1.5rem;font-size:1.2rem;font-weight:700;letter-spacing:0.075em;text-transform:uppercase;}
            .nav-links a{color:#fff;text-decoration:none;opacity:0.9;transition:opacity .25s ease;}
            .nav-links a:hover{opacity:1;}

            /* ---- Hero text ---- */
            .hero-content{max-width:52rem;z-index:5;}
            .hero-content h1{font-size:clamp(2.25rem,4vw+1rem,3.5rem);font-weight:700;margin:0 auto 1rem;line-height:1.15;}
            .subheading{font-size:1rem;opacity:0.85;margin-bottom:2.25rem;line-height:1.5;}

            /* ---- CTA buttons ---- */
            .actions{display:flex;gap:1rem;justify-content:center;flex-wrap:wrap;}
            .btn{display:inline-block;padding:0.85rem 1.75rem;border-radius:9999px;font-size:0.875rem;font-weight:600;text-decoration:none;letter-spacing:0.05em;transition:background .25s ease,color .25s ease,border-color .25s ease;}
            .btn.primary{background:#fff;color:#000;box-shadow:0 0 20px 0 rgba(255,255,255,0.75);}
            .btn.primary:hover{background:#e2e2e2;}
            .btn.secondary{background:rgba(255,255,255,0.1);color:#fff;border:2px solid #fff;}
            .btn.secondary:hover{background:rgba(255,255,255,0.2);}

            /* ---- Moving blurred blobs ---- */
            .blur-bg{pointer-events:none;position:absolute;inset:0;overflow:hidden;z-index:1;}
            .blob{position:absolute;border-radius:50%;filter:blur(100px) saturate(110%);mix-blend-mode:screen;will-change:transform;}

            /* top-left cluster – two slim tilted ellipses */
            .blob-1{width:22vmax;height:44vmax;top:-6vmax;left:13vmax;background:var(--blob-color-1);opacity:0.5;animation:blob1Drift 90s ease-in-out infinite alternate;}
            .blob-2{width:24vmax;height:46vmax;top:-4vmax;left:16vmax;background:var(--blob-color-2);opacity:0.5;animation:blob2Drift 100s ease-in-out infinite alternate-reverse;}

            /* top-right cluster – two overlapping greens */
            .blob-3{width:26vmax;height:38vmax;top:4vmax;right:-5vmax;background:var(--blob-color-3);opacity:0.5;animation:blob3Drift 110s linear infinite;}
            .blob-4{width:24vmax;height:26vmax;top:0;right:-2vmax;background:var(--blob-color-4);opacity:0.5;animation:blob4Drift 95s ease-in-out infinite alternate;}

            /* central yellows sweeping across hero */
            .blob-5{width:10vmax;height:32vmax;top:0vmax;left:32vmax;background:var(--blob-color-5);opacity:0.9;animation:blob5Drift 120s ease-in-out infinite;}
            .blob-6{width:22vmax;height:37vmax;top:6vmax;left:40vmax;background:var(--blob-color-6);opacity:0.5;animation:blob6Drift 115s ease-in-out infinite alternate-reverse;}

            /* Path animations intentionally route through center so blobs intersect */
            @keyframes blob1Drift{
              0%{transform:translate(0,0) rotate(45deg);}50%{transform:translate(6%,10%) rotate(35deg);}100%{transform:translate(0,0) rotate(30deg);} }
            @keyframes blob2Drift{
              0%{transform:translate(0,0) rotate(50deg);}50%{transform:translate(-5%,6%) rotate(55deg);}100%{transform:translate(0,0) rotate(50deg);} }
            @keyframes blob3Drift{
              0%{transform:translate(0,0) rotate(-40deg);}50%{transform:translate(-6%,4%) rotate(-35deg);}100%{transform:translate(0,0) rotate(-40deg);} }
            @keyframes blob4Drift{
              0%{transform:translate(0,0) rotate(-35deg);}50%{transform:translate(4%,6%) rotate(-30deg);}100%{transform:translate(0,0) rotate(-35deg);} }
            @keyframes blob5Drift{
              0%{transform:translate(0,0) rotate(75deg);}50%{transform:translate(8%,-4%) rotate(234deg);}100%{transform:translate(0,0) rotate(75deg);} }
            @keyframes blob6Drift{
              0%{transform:translate(0,0) rotate(18deg);}50%{transform:translate(-8%,6%) rotate(23deg);}100%{transform:translate(0,0) rotate(18deg);} }

            /* ---- Motion preference ---- */
            @media (prefers-reduced-motion:reduce){
              .blob{animation:none;}
            }
          `}
        </style>
      </Head>

      <header className="hero">
        {/* Animated blurred background */}
        <div className="blur-bg">
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
            <Link href="#">TOKEN</Link>
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
              href="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
            >
              Watch Demo
            </Link>
          </div>
        </main>

        {/* Triangular glow accent */}
        <div className="triangle" />
      </header>
    </>
  );
}
