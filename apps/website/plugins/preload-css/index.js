/*
 Docusaurus plugin that adds a <link rel="preload" as="style"> for the main
 stylesheet that Docusaurus emits (assets/css/styles.<hash>.css).  This boosts
 its fetch priority and helps eliminate flash-of-unstyled-content (FOUC).
*/

const fs = require("fs");
const path = require("path");

module.exports = function preloadCssPlugin() {
  /** @type {string | undefined} */
  let cssHref;

  return {
    name: "preload-css-plugin",

    // After the build finishes we know the output directory and can look for
    // the hashed stylesheet file that Docusaurus generates.
    async postBuild({ outDir, baseUrl }) {
      const cssDir = path.join(outDir, "assets", "css");
      if (!fs.existsSync(cssDir)) return;

      const fileName = fs
        .readdirSync(cssDir)
        .find((f) => f.startsWith("styles.") && f.endsWith(".css"));

      if (fileName) {
        // baseUrl is usually "/".  We need POSIX separators for URLs.
        cssHref = path.posix.join(baseUrl, "assets/css", fileName);
      }
    },

    // Inject <link rel="preload" …> + <noscript> fallback into every page.
    injectHtmlTags() {
      if (!cssHref) return {};

      return {
        headTags: [
          {
            tagName: "link",
            attributes: {
              rel: "preload",
              as: "style",
              href: cssHref,
              // When the resource finishes loading, convert the link to a
              // regular stylesheet so it applies if the normal <link> tag runs
              // later than this one.
              onload: "this.onload=null;this.rel='stylesheet'"
            }
          },
          {
            tagName: "noscript",
            innerHTML: `<link rel="stylesheet" href="${cssHref}">`
          }
        ]
      };
    }
  };
};
