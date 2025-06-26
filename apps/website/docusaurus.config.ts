import type * as Preset from "@docusaurus/preset-classic";
import type { Config } from "@docusaurus/types";
import { themes as prismThemes } from "prism-react-renderer";

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: "MAIAR",
  tagline: "Build AI agents with ease",
  favicon: "img/favicon.ico",

  // Set the production url of your site here
  url: "https://maiar.dev",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/",

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "UraniumCorporation", // Usually your GitHub org/user name.
  projectName: "maiar-ai", // Usually your repo name.

  onBrokenLinks: "throw",
  onBrokenMarkdownLinks: "throw",

  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"]
  },
  trailingSlash: true,
  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebar-docs.ts",
          // Please change this to your repo.
          // Remove this to remove the "edit this page" links.
          editUrl:
            "https://github.com/UraniumCorporation/maiar-ai/tree/main/website/docs"
        },
        theme: {
          customCss: "./src/css/custom.css"
        }
      } satisfies Preset.Options
    ]
  ],

  themeConfig: {
    announcementBar: {
      id: "bounty-program",
      content:
        '💰 The MAIAR Bounty Program is now live! Check out the <a href="/docs/bounty-program">Bounty Program Docs</a> for details.',
      backgroundColor: "#3D4F27",
      textColor: "#D1FF8C",
      isCloseable: true
    },
    colorMode: {
      defaultMode: "dark",
      disableSwitch: true,
      respectPrefersColorScheme: false
    },
    // Replace with your project's social card
    image: "img/banner-seo.webp",
    navbar: {
      title: "MAIAR",
      hideOnScroll: true,
      logo: {
        alt: "MAIAR Logo",
        src: "img/logo.svg"
      },
      items: [
        {
          type: "docSidebar",
          sidebarId: "docs",
          position: "left",
          label: "Documentation",
          docsPluginId: "default"
        },
        {
          to: "/api",
          position: "left",
          label: "API"
        },
        {
          to: "/plugins",
          position: "left",
          label: "Plugins"
        },
        {
          to: "/docs/bounty-program",
          position: "left",
          label: "Bounty Program"
        },
        {
          href: "https://github.com/UraniumCorporation/maiar-ai",
          label: "GitHub",
          position: "right"
        },
        {
          href: "https://maiar.dev/maiar.pdf",
          label: "Whitepaper",
          position: "right"
        }
      ]
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Docs",
          items: [
            {
              label: "Getting Started",
              to: "/docs/getting-started"
            },
            {
              label: "Contributing to MAIAR",
              to: "/docs/contributing-guide"
            },
            {
              label: "Bounty Program",
              to: "/docs/bounty-program"
            },
            {
              label: "API",
              to: "/api"
            },
            {
              label: "Whitepaper",
              href: "https://maiar.dev/maiar.pdf"
            }
          ]
        },
        {
          title: "Community",
          items: [
            {
              label: "Discord",
              href: "https://discord.gg/7CAjkpCsED"
            },
            {
              label: "X",
              href: "https://x.com/maiar_ai"
            }
          ]
        },
        {
          title: "More",
          items: [
            {
              label: "GitHub",
              href: "https://github.com/UraniumCorporation/maiar-ai"
            }
          ]
        }
      ],
      copyright: `MAIAR AI ${new Date().getFullYear()} - A Uranium Corporation Product`
    },
    prism: {
      theme: prismThemes.okaidia,
      darkTheme: prismThemes.okaidia
    },
    metadata: [
      {
        name: "description",
        content: "Build AI agents with ease using MAIAR's powerful framework"
      },
      {
        property: "og:description",
        content: "Build AI agents with ease using MAIAR's powerful framework"
      },
      {
        name: "twitter:description",
        content: "Build AI agents with ease using MAIAR's powerful framework"
      },
      {
        property: "og:image",
        content: "https://maiar.dev/img/banner-seo.webp"
      },
      {
        name: "twitter:image",
        content: "https://maiar.dev/img/banner-seo.webp"
      },
      { name: "twitter:card", content: "summary_large_image" }
    ]
  } satisfies Preset.ThemeConfig,

  plugins: [
    require.resolve("./plugins/preload-css"),
    [
      "docusaurus-plugin-typedoc",
      {
        entryPoints: ["../../packages/core/src/index.ts"],
        tsconfig: "../../packages/core/tsconfig.json",
        out: "api",
        plugin: ["typedoc-plugin-markdown"],
        hideGenerator: true,
        cleanOutputDir: true,
        categorizeByGroup: true,
        pretty: true,
        includeVersion: true,
        sort: ["source-order", "required-first", "visibility"],
        gitRevision: "main",
        readme: "none",
        commentStyle: "all",
        preserveAnchorCasing: false,
        hideBreadcrumbs: false,
        preserveWatchOutput: true,
        disableSources: false,
        validation: {
          notExported: true,
          invalidLink: true,
          notDocumented: false
        },
        exclude: [
          "**/_media/**",
          "**/node_modules/**",
          "**/dist/**",
          "**/*.test.ts",
          "**/*.spec.ts"
        ],
        watch: false,
        treatWarningsAsErrors: true,
        treatValidationWarningsAsErrors: true,
        searchInComments: true
      }
    ],
    [
      "@docusaurus/plugin-content-docs",
      {
        id: "api",
        path: "api",
        routeBasePath: "api",
        sidebarPath: "sidebar-api.ts"
      }
    ],
    [
      "@docusaurus/plugin-pwa",
      {
        debug: true,
        offlineModeActivationStrategies: [
          "appInstalled",
          "standalone",
          "queryString"
        ],
        pwaHead: [
          {
            tagName: "link",
            rel: "manifest",
            href: "manifest.json"
          },
          {
            tagName: "link",
            rel: "icon",
            href: "img/logo.svg"
          },
          {
            tagName: "link",
            rel: "mask-icon",
            href: "img/logo.svg"
          },
          {
            tagName: "meta",
            name: "theme-color",
            content: "#111412"
          },
          {
            tagName: "meta",
            name: "msapplication-square70x70logo",
            content: "img/icons/mstile-icon-128.png"
          },
          {
            tagName: "meta",
            name: "msapplication-square150x150logo",
            content: "img/icons/mstile-icon-270.png"
          },
          {
            tagName: "meta",
            name: "msapplication-square310x310logo",
            content: "img/icons/mstile-icon-558.png"
          },
          {
            tagName: "meta",
            name: "msapplication-wide310x150logo",
            content: "img/icons/mstile-icon-558-270.png"
          },
          {
            tagName: "link",
            rel: "apple-touch-icon",
            href: "img/icons/apple-icon-180.png"
          },
          {
            tagName: "meta",
            name: "apple-mobile-web-app-capable",
            content: "yes"
          },
          {
            tagName: "link",
            rel: "apple-touch-startup-image",
            href: "img/icons/apple-splash-2048-2732.png",
            media:
              "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
          },
          {
            tagName: "link",
            rel: "apple-touch-startup-image",
            href: "img/icons/apple-splash-2732-2048.png",
            media:
              "(device-width: 1024px) and (device-height: 1366px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"
          },
          {
            tagName: "link",
            rel: "apple-touch-startup-image",
            href: "img/icons/apple-splash-1668-2388.png",
            media:
              "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
          },
          {
            tagName: "link",
            rel: "apple-touch-startup-image",
            href: "img/icons/apple-splash-2388-1668.png",
            media:
              "(device-width: 834px) and (device-height: 1194px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"
          },
          {
            tagName: "link",
            rel: "apple-touch-startup-image",
            href: "img/icons/apple-splash-1536-2048.png",
            media:
              "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
          },
          {
            tagName: "link",
            rel: "apple-touch-startup-image",
            href: "img/icons/apple-splash-2048-1536.png",
            media:
              "(device-width: 768px) and (device-height: 1024px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"
          },
          {
            tagName: "link",
            rel: "apple-touch-startup-image",
            href: "img/icons/apple-splash-1640-2360.png",
            media:
              "(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
          },
          {
            tagName: "link",
            rel: "apple-touch-startup-image",
            href: "img/icons/apple-splash-2360-1640.png",
            media:
              "(device-width: 820px) and (device-height: 1180px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"
          },
          {
            tagName: "link",
            rel: "apple-touch-startup-image",
            href: "img/icons/apple-splash-1668-2224.png",
            media:
              "(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
          },
          {
            tagName: "link",
            rel: "apple-touch-startup-image",
            href: "img/icons/apple-splash-2224-1668.png",
            media:
              "(device-width: 834px) and (device-height: 1112px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"
          },
          {
            tagName: "link",
            rel: "apple-touch-startup-image",
            href: "img/icons/apple-splash-1620-2160.png",
            media:
              "(device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
          },
          {
            tagName: "link",
            rel: "apple-touch-startup-image",
            href: "img/icons/apple-splash-2160-1620.png",
            media:
              "(device-width: 810px) and (device-height: 1080px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"
          },
          {
            tagName: "link",
            rel: "apple-touch-startup-image",
            href: "img/icons/apple-splash-1488-2266.png",
            media:
              "(device-width: 744px) and (device-height: 1133px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
          },
          {
            tagName: "link",
            rel: "apple-touch-startup-image",
            href: "img/icons/apple-splash-2266-1488.png",
            media:
              "(device-width: 744px) and (device-height: 1133px) and (-webkit-device-pixel-ratio: 2) and (orientation: landscape)"
          },
          {
            tagName: "link",
            rel: "apple-touch-startup-image",
            href: "img/icons/apple-splash-1320-2868.png",
            media:
              "(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
          },
          {
            tagName: "link",
            rel: "apple-touch-startup-image",
            href: "img/icons/apple-splash-2868-1320.png",
            media:
              "(device-width: 440px) and (device-height: 956px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)"
          },
          {
            tagName: "link",
            rel: "apple-touch-startup-image",
            href: "img/icons/apple-splash-1206-2622.png",
            media:
              "(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
          },
          {
            tagName: "link",
            rel: "apple-touch-startup-image",
            href: "img/icons/apple-splash-2622-1206.png",
            media:
              "(device-width: 402px) and (device-height: 874px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)"
          },
          {
            tagName: "link",
            rel: "apple-touch-startup-image",
            href: "img/icons/apple-splash-1290-2796.png",
            media:
              "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
          },
          {
            tagName: "link",
            rel: "apple-touch-startup-image",
            href: "img/icons/apple-splash-2796-1290.png",
            media:
              "(device-width: 430px) and (device-height: 932px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)"
          },
          {
            tagName: "link",
            rel: "apple-touch-startup-image",
            href: "img/icons/apple-splash-1179-2556.png",
            media:
              "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
          },
          {
            tagName: "link",
            rel: "apple-touch-startup-image",
            href: "img/icons/apple-splash-2556-1179.png",
            media:
              "(device-width: 393px) and (device-height: 852px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)"
          },
          {
            tagName: "link",
            rel: "apple-touch-startup-image",
            href: "img/icons/apple-splash-1170-2532.png",
            media:
              "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
          },
          {
            tagName: "link",
            rel: "apple-touch-startup-image",
            href: "img/icons/apple-splash-2532-1170.png",
            media:
              "(device-width: 390px) and (device-height: 844px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)"
          },
          {
            tagName: "link",
            rel: "apple-touch-startup-image",
            href: "img/icons/apple-splash-1284-2778.png",
            media:
              "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
          },
          {
            tagName: "link",
            rel: "apple-touch-startup-image",
            href: "img/icons/apple-splash-2778-1284.png",
            media:
              "(device-width: 428px) and (device-height: 926px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)"
          },
          {
            tagName: "link",
            rel: "apple-touch-startup-image",
            href: "img/icons/apple-splash-1125-2436.png",
            media:
              "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
          },
          {
            tagName: "link",
            rel: "apple-touch-startup-image",
            href: "img/icons/apple-splash-2436-1125.png",
            media:
              "(device-width: 375px) and (device-height: 812px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)"
          },
          {
            tagName: "link",
            rel: "apple-touch-startup-image",
            href: "img/icons/apple-splash-1242-2688.png",
            media:
              "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: portrait)"
          },
          {
            tagName: "link",
            rel: "apple-touch-startup-image",
            href: "img/icons/apple-splash-2688-1242.png",
            media:
              "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 3) and (orientation: landscape)"
          },
          {
            tagName: "link",
            rel: "apple-touch-startup-image",
            href: "img/icons/apple-splash-828-1792.png",
            media:
              "(device-width: 414px) and (device-height: 896px) and (-webkit-device-pixel-ratio: 2) and (orientation: portrait)"
          }
        ]
      }
    ]
  ]
};

export default config;
