# Contributing to This Project

First off, thanks for considering contributing! Your help makes this project better for everyone. We welcome contributions from everyone, regardless of experience level.

## How to Contribute

1. **Fork the Repo** – Click the Fork button on GitHub.
2. **Clone Your Fork** – `git clone https://github.com/your-username/project-name.git`
3. **Create a Branch** – `git checkout -b feature-or-bugfix-name`
4. **Make Changes** – Ensure your code follows the project's style guide and guidlines below.
5. **Commit Your Changes using Conventional Commits** – `git commit -m "type(scope): Brief but descriptive commit message"`
6. **Push to Your Fork** – `git push origin feature-or-bugfix-name`
7. **Open a Pull Request** – Go to the original repo and create a PR.

## Guidelines

- Keep PRs focused. One feature or fix per PR.
- Write clear commit messages using Conventional Commits.
- Follow existing code style, conventions, and commit history policy.
- Update documentation if needed.

## Style Guide

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

### JavaScript Styleguide

- All JavaScript must adhere to [JavaScript Standard Style](https://standardjs.com/).

### TypeScript Styleguide

- All TypeScript must adhere to [TypeScript Standard Style](https://github.com/standard/ts-standard).

### Documentation Styleguide

- Use [Markdown](https://daringfireball.net/projects/markdown/) for documentation.

## Commit History Policy

To maintain a clean and linear commit history, this repository only allows rebasing -- merge commits are not permitted. When contributing:

- Always rebase your branch onto the latest main (or the relevant base branch) before submitting a PR.
- PRs will be merged using Rebase and Merge -- Squash Merging and Merge Commits are disabled.
- If your branch falls behind, rebase interactively rather than merging upstream changes.
- If you fork this repository, ensure your PRs are rebased properly before submission.

## Conventional Commits

We use [Conventional Commits](https://www.conventionalcommits.org/en/v1.0.0/) for our commit messages. This allows us to automatically generate a changelog, handle package versioning, and enforce a standard commit message format.

The full specification can be found at [https://conventionalcommits.org](https://www.conventionalcommits.org/en/v1.0.0/#specification)

### Conventional Commit Message Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

For example: `feat(core): add new feature`

Common scopes for this project can be for main components and include:

- core
- memory-filesystem
- memory-sqlite
- model-ollama
- model-openai
- plugin-express
- plugin-image
- plugin-telegram
- plugin-terminal
- plugin-text
- plugin-time
- plugin-websocket
- maiar-starter
- website

This is not an exhaustive list, and additional scopes can be added in [.commitlintrc.ts](https://github.com/UraniumCorporation/maiar-ai/blob/main/.commitlintrc.ts) as needed.

For multiple scopes, use a comma-separated list i.e. `fix(bug,plugin-express): fix bug in express plugin`

### Enforcing Conventional Commits

Conventional commits will be enforced using [commitlint](https://commitlint.js.org/). This will be run as part of the CI pipeline and pre-commit hooks (via Husky) and will fail the CI workflow if the commit message does not follow the Conventional Commits format.

- [commitizen](https://commitizen.github.io/cz-cli/) is recommended for creating conventional commits. This is a command-line tool that guides the user through creating a commit message that follows the Conventional Commits format. To use Commitizen, run `pnpm commit` at the root of the project and interactively create a commit message.

### Important Commit Message Rules - Please Read

- `fix`, `feat`, and `BREAKING CHANGE` in the commit body will only be accepted in a commit message if it is editing the core or official plugins' source code (i.e., `packages/*/src/*.ts`) – this will trigger a version bump, potentially generate new API docs based on the change, and publish a new release of the package to the npm registry.

  - If these commit messages are found for editing other files inside the core or official plugins' source code, the PR will be rejected.

- Conventional commits for the website (no matter what it is - `fix`, `feat`, `BREAKING CHANGE`, `chore`, etc.) will not trigger a version bump or publish a new release of the package to the npm registry; therefore, they can be used for updating the website and documentation.

## Reporting Issues

- Search existing issues before opening a new one.
- If reporting a bug, include steps to reproduce.
- If suggesting a feature, explain the use case and potential benefits.

## Bounty Program

To participate, please refer to the [Bounty Program Docs](https://maiar.dev/docs/bounty-program) for comprehensive details on how to earn bounties by contributing to the MAIAR project.

## Code of Conduct

Be respectful, constructive, and inclusive. Follow the [Code of Conduct](https://github.com/UraniumCorporation/maiar-ai/blob/main/.github/CODE_OF_CONDUCT.md).

## Need Help?

- Join [Discord](https://discord.gg/7CAjkpCsED)
- Create [GitHub issues](https://github.com/UraniumCorporation/maiar-ai/issues)

Talk to us in discussions or open an issue. Happy coding!
