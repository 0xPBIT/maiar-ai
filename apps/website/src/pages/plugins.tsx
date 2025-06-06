import React, { useEffect, useState } from "react";

import Layout from "@theme/Layout";
import clsx from "clsx";
import { Plug } from "lucide-react";

import styles from "../css/plugins.module.css";

/* --------------------- */
/* Inline SVG Icons      */
/* --------------------- */
const StarIcon = ({ className, ...rest }: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={clsx(styles.icon, className)}
    {...rest}
  >
    <defs>
      <linearGradient id="gradStar" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F3FFE5" />
        <stop offset="100%" stopColor="#C2FF66" />
      </linearGradient>
    </defs>
    <path
      fill="url(#gradStar)"
      d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.62L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"
    />
  </svg>
);

const GitHubIcon = ({ className, ...rest }: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={clsx(styles.icon, className)}
    {...rest}
  >
    <defs>
      <linearGradient id="gradGithub" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F3FFE5" />
        <stop offset="100%" stopColor="#C2FF66" />
      </linearGradient>
    </defs>
    <path
      fill="url(#gradGithub)"
      d="M12 .296C5.373.296 0 5.67 0 12.296c0 5.292 3.438 9.787 8.207 11.387.6.11.793-.26.793-.577 0-.285-.01-1.04-.016-2.04-3.338.726-4.042-1.608-4.042-1.608-.546-1.387-1.333-1.756-1.333-1.756-1.09-.745.082-.729.082-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.835 2.809 1.306 3.495.998.108-.775.418-1.306.762-1.606-2.665-.303-5.466-1.332-5.466-5.931 0-1.31.467-2.381 1.236-3.221-.124-.303-.536-1.524.117-3.176 0 0 1.008-.323 3.301 1.23.957-.266 1.983-.399 3.003-.403 1.02.004 2.047.137 3.006.404 2.291-1.554 3.297-1.23 3.297-1.23.655 1.653.243 2.874.12 3.176.77.84 1.235 1.912 1.235 3.221 0 4.61-2.804 5.625-5.476 5.922.43.372.815 1.104.815 2.226 0 1.606-.015 2.902-.015 3.293 0 .319.192.694.801.576C20.565 22.08 24 17.587 24 12.296 24 5.67 18.627.296 12 .296z"
    />
  </svg>
);

const PackageIcon = ({ className, ...rest }: React.SVGProps<SVGSVGElement>) => (
  <svg
    viewBox="0 0 24 24"
    aria-hidden="true"
    className={clsx(styles.icon, className)}
    {...rest}
  >
    <defs>
      <linearGradient id="gradPkg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#F3FFE5" />
        <stop offset="100%" stopColor="#C2FF66" />
      </linearGradient>
    </defs>
    <path
      fill="url(#gradPkg)"
      d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4a2 2 0 0 0 1-1.73zM12 3.15L18.26 7 12 10.85 5.74 7 12 3.15zM5 9.47l6 3.4v6.92l-6-3.43V9.47zm8 10.32v-6.92l6-3.4v6.9l-6 3.42z"
    />
  </svg>
);

interface Plugin {
  name: string;
  description: string;
  author: string;
  authorAvatar: string;
  repository: string;
  version: string;
  tags: string[];
  isOfficial?: boolean;
  npmPackage?: string;
  stars: number;
  lastPublished: string;
}

interface CommunityPlugin {
  repo: string;
  owner: string;
  npm_package_name: string;
}

interface GithubRepo {
  html_url: string;
  organization: {
    login: string;
    avatar_url: string;
  };
  description?: string;
  owner: {
    login: string;
    avatar_url: string;
  };
  topics: string[];
  stargazers_count: number;
}

interface GithubDirectory {
  name: string;
  path: string;
  type: string;
}

interface GithubRelease {
  tag_name: string;
}

export default function Plugins(): React.JSX.Element {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredPlugins, setFilteredPlugins] = useState<Plugin[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPlugins = async () => {
      try {
        setError(null);
        setIsLoading(true);
        // First, fetch the official packages directory contents
        const packagesResponse = await fetch(
          "https://api.github.com/repos/UraniumCorporation/maiar-ai/contents/packages"
        );
        const packagesData: GithubDirectory[] = await packagesResponse.json();

        // Get repository info for metadata
        const repoResponse = await fetch(
          "https://api.github.com/repos/UraniumCorporation/maiar-ai"
        );
        const repoData: GithubRepo = await repoResponse.json();

        // Get latest release version
        const releasesResponse = await fetch(
          "https://api.github.com/repos/UraniumCorporation/maiar-ai/releases/latest"
        );
        const releaseData: GithubRelease = await releasesResponse.json();
        const latestVersion = releaseData.tag_name.replace("v", "");

        // Filter for directories and transform them into plugins
        const pluginDirectories = packagesData.filter(
          (item) =>
            item.type === "dir" &&
            (item.name.startsWith("plugin-") ||
              item.name.startsWith("memory-") ||
              item.name.startsWith("model-"))
        );

        // Transform directory data into official plugin format
        const officialPlugins = await Promise.all(
          pluginDirectories.map(async (dir) => {
            // Fetch latest version from npm for official plugins
            const npmResponse = await fetch(
              `https://registry.npmjs.org/@maiar-ai/${dir.name}`
            );
            const npmData = await npmResponse.json();
            const npmLatestVersion =
              npmData["dist-tags"]?.latest || latestVersion;
            const lastPublished =
              npmData.time?.[npmLatestVersion] || releaseData.tag_name;

            return {
              name: dir.name,
              description: `Official ${dir.name.split("-")[1]} ${
                dir.name.startsWith("plugin-")
                  ? "plugin"
                  : dir.name.startsWith("memory-")
                    ? "memory package"
                    : "model package"
              } for Maiar framework`,
              author: repoData.organization.login,
              authorAvatar: `${repoData.organization.avatar_url}&s=48`,
              repository: `${repoData.html_url}/tree/main/packages/${dir.name}`,
              version: npmLatestVersion,
              tags: [
                "official",
                dir.name.startsWith("plugin-")
                  ? "plugin"
                  : dir.name.startsWith("memory-")
                    ? "memory"
                    : "model",
                dir.name.split("-")[1]
              ],
              isOfficial: true,
              stars: repoData.stargazers_count,
              lastPublished
            };
          })
        );

        // Fetch community plugins from the official plugin registry
        const communityDataResponse = await fetch(
          "https://raw.githubusercontent.com/UraniumCorporation/plugin-registry/refs/heads/main/index.json"
        );
        const communityData: CommunityPlugin[] =
          await communityDataResponse.json();

        // Fetch additional data for each community plugin
        const communityPlugins = await Promise.all(
          communityData.map(async (plugin) => {
            try {
              const repoResponse = await fetch(
                `https://api.github.com/repos/${plugin.owner}/${plugin.repo}`,
                {
                  headers: {
                    Accept: "application/vnd.github.mercy-preview+json"
                  }
                }
              );
              const repoData: GithubRepo = await repoResponse.json();

              // Fetch latest version from npm
              const npmResponse = await fetch(
                `https://registry.npmjs.org/${plugin.npm_package_name}`
              );
              const npmData = await npmResponse.json();
              const latestVersion = npmData["dist-tags"]?.latest || "latest";
              const lastPublished = npmData.time?.[latestVersion] || "Unknown";

              return {
                name: plugin.repo,
                description:
                  repoData.description ||
                  `Community plugin for the Maiar framework: ${plugin.repo}`,
                author: plugin.owner,
                authorAvatar: `${repoData.owner?.avatar_url || `https://github.com/${plugin.owner}.png`}&s=48`,
                repository: `https://github.com/${plugin.owner}/${plugin.repo}`,
                version: latestVersion,
                tags: repoData.topics || [],
                isOfficial: false,
                npmPackage: plugin.npm_package_name,
                stars: repoData.stargazers_count,
                lastPublished
              };
            } catch (error) {
              console.error(`Error fetching data for ${plugin.repo}:`, error);
              return null;
            }
          })
        );

        // Combine official and valid community plugins
        const allPlugins = [
          ...communityPlugins.filter(
            (plugin): plugin is NonNullable<typeof plugin> => plugin !== null
          ),
          ...officialPlugins
        ];

        setPlugins(allPlugins);
        setFilteredPlugins(allPlugins);
      } catch (error) {
        console.error("Error fetching plugins:", error);
        setPlugins([]);
        setFilteredPlugins([]);
        setError("Failed to load plugins. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };

    fetchPlugins();
  }, []);

  // Fuzzy search implementation
  useEffect(() => {
    if (!searchQuery) {
      setFilteredPlugins(plugins);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = plugins.filter((plugin) => {
      const officialNpmPackage = plugin.isOfficial
        ? `@maiar-ai/${plugin.name}`
        : null;
      const communityNpmPackage = plugin.npmPackage;

      return (
        plugin.name.toLowerCase().includes(query) ||
        plugin.description.toLowerCase().includes(query) ||
        plugin.author.toLowerCase().includes(query) ||
        plugin.tags.some((tag) => tag.toLowerCase().includes(query)) ||
        officialNpmPackage?.toLowerCase().includes(query) ||
        communityNpmPackage?.toLowerCase().includes(query)
      );
    });
    setFilteredPlugins(filtered);
  }, [searchQuery, plugins]);

  return (
    <Layout title="Maiar Plugins" description="Browse and search Maiar plugins">
      <main className={clsx("container", styles.pluginsContainer)}>
        <div className={styles.searchContainer}>
          <input
            type="text"
            placeholder="Search plugins..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={styles.searchInput}
          />
          <div className={styles.registerPluginContainer}>
            <a
              href="https://github.com/UraniumCorporation/plugin-registry"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.registerPluginLink}
            >
              <Plug strokeWidth={2} className={styles.icon} /> Register your
              plugin
            </a>
          </div>
          {error && <div className={styles.errorMessage}>{error}</div>}
        </div>

        {isLoading ? (
          <div className={styles.loadingContainer}>
            <div className={styles.loadingSpinner}></div>
            <p className={styles.loadingText}>Loading plugins...</p>
          </div>
        ) : (
          <div className={styles.pluginsList}>
            {filteredPlugins.map((plugin) => (
              <div key={plugin.name} className={styles.pluginItem}>
                <div className={styles.pluginHeader}>
                  <div className={styles.pluginNameVersion}>
                    <div className={styles.nameLine}>
                      <a
                        href={plugin.repository}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.pluginName}
                      >
                        {plugin.name}
                      </a>
                      <span className={styles.versionNumber}>
                        {plugin.version}
                      </span>
                    </div>
                    <div className={styles.authorInfo}>
                      <a
                        href={`https://github.com/${plugin.author}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <img
                          src={plugin.authorAvatar}
                          alt={`${plugin.author} avatar`}
                          className={styles.authorAvatar}
                        />
                      </a>
                      <a
                        href={`https://github.com/${plugin.author}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={styles.authorLink}
                      >
                        {plugin.author}
                      </a>
                    </div>
                  </div>
                  <div className={styles.metadataContainer}>
                    <span className={styles.publishInfo}>
                      updated –{" "}
                      {new Date(plugin.lastPublished).toLocaleDateString()}
                    </span>
                    <p className={styles.versionLabel}>
                      <StarIcon
                        style={{ marginLeft: "0.5rem", marginRight: "0.25rem" }}
                      />
                      {plugin.stars}
                    </p>
                  </div>
                </div>
                <p className={styles.pluginDescription}>{plugin.description}</p>
                <div className={styles.pluginFooter}>
                  <div className={styles.pluginTags}>
                    {plugin.tags.map((tag) => (
                      <span key={tag} className={styles.tag}>
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className={styles.buttonGroup}>
                    <a
                      href={plugin.repository}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.pluginLink}
                      aria-label="View Repository on GitHub"
                      title="View Repository"
                    >
                      <GitHubIcon />
                    </a>
                    <a
                      href={
                        plugin.isOfficial
                          ? `https://www.npmjs.com/package/@maiar-ai/${plugin.name}`
                          : `https://www.npmjs.com/package/${plugin.npmPackage}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.pluginLink}
                      aria-label="View Package on npm"
                      title="View Package"
                    >
                      <PackageIcon />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </Layout>
  );
}
