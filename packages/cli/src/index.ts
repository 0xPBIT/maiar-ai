#!/usr/bin/env node
import { cancel, isCancel, log, outro, spinner, text } from "@clack/prompts";
import { exec } from "child_process";
import { Command } from "commander";
import { existsSync, mkdirSync, writeFileSync } from "fs";
import { Liquid } from "liquidjs";
import { join, resolve } from "path";
import { promisify } from "util";

const templatesDir = resolve(__dirname, "templates");
const engine = new Liquid({
  root: [],
  extname: ".liquid",
  cache: true,
  strictVariables: false
});
const env: string[] = [];

const program = new Command();
program
  .description(engine.renderFileSync(`${templatesDir}/description.liquid`))
  .argument(
    "[name]",
    "The name of the project to create. If not provided, the CLI will prompt for a name."
  )
  .option(
    "--no-install",
    "Skip installing dependencies after project creation."
  )
  .action(async (name, options) => {
    const { install } = options;
    const cwd = process.cwd();
    const cancelOperation = () => cancel("🚫 Operation cancelled");

    log.info(`
      ___           ___                       ___           ___     
     /__/\\         /  /\\        ___          /  /\\         /  /\\    
    |  |::\\       /  /::\\      /  /\\        /  /::\\       /  /::\\   
    |  |:|:\\     /  /:/\\:\\    /  /:/       /  /:/\\:\\     /  /:/\\:\\  
  __|__|:|\\:\\   /  /:/~/::\\  /__/::\\      /  /:/~/::\\   /  /:/~/:/  
 /__/::::| \\:\\ /__/:/ /:/\\:\\ \\__\\/\\:\\__  /__/:/ /:/\\:\\ /__/:/ /:/___
 \\  \\:\\~~\\__\\/ \\  \\:\\/:/__\\/    \\  \\:\\/\\ \\  \\:\\/:/__\\/ \\  \\:\\/:::::/
  \\  \\:\\        \\  \\::/          \\__\\::/  \\  \\::/       \\  \\::/~~~~ 
   \\  \\:\\        \\  \\:\\          /__/:/    \\  \\:\\        \\  \\:\\     
    \\  \\:\\        \\  \\:\\         \\__\\/      \\  \\:\\        \\  \\:\\    
     \\__\\/         \\__\\/                     \\__\\/         \\__\\/    
     
      by Uranium Corporation`);

    // Ask for the project name if not provided
    let projectName = name;
    if (!projectName) {
      const defaultProjectName = "maiar-project";
      projectName = await text({
        message: "🗃️ Project name:",
        placeholder: defaultProjectName,
        defaultValue: defaultProjectName
      });
    }
    if (isCancel(projectName)) return cancelOperation();

    const projectPath = join(cwd, projectName);

    // Check if the directory already exists
    if (existsSync(projectPath)) {
      console.error(
        `❌ The directory "${projectName}" already exists. Please choose a different name or remove the existing directory.`
      );
      return cancelOperation();
    }

    // Ask for the OpenAI API key
    const openaiApiKey = await text({
      message:
        "🔑 OpenAI API Key (Visit https://platform.openai.com/api-keys to create one):",
      placeholder: "sk-...",
      defaultValue: "sk-..."
    });

    if (isCancel(openaiApiKey)) return cancelOperation();
    env.push(`OPENAI_API_KEY=${openaiApiKey}`);

    // Create the project directory
    mkdirSync(projectPath, { recursive: true });

    // Create the package.json file
    const packageJson = engine.renderFileSync(
      `${templatesDir}/package.json.liquid`,
      {
        projectName
      }
    );
    writeFileSync(join(projectPath, "package.json"), packageJson);

    // Create the tsconfig.json file
    const tsconfig = engine.renderFileSync(
      `${templatesDir}/tsconfig.json.liquid`
    );
    writeFileSync(join(projectPath, "tsconfig.json"), tsconfig);

    // Create the .gitignore file
    const gitignore = engine.renderFileSync(`${templatesDir}/gitignore.liquid`);
    writeFileSync(join(projectPath, ".gitignore"), gitignore);

    // Create the .env file
    writeFileSync(join(projectPath, ".env"), env.join("\n"));

    // Create the src directory and index.ts file with starter code
    mkdirSync(join(projectPath, "src"), { recursive: true });
    const starter = engine.renderFileSync(`${templatesDir}/starter.liquid`);
    writeFileSync(join(projectPath, "src", "index.ts"), starter);

    // Create the character.xml file
    const characterXml = engine.renderFileSync(
      `${templatesDir}/character.xml.liquid`
    );
    writeFileSync(join(projectPath, "character.xml"), characterXml);

    // Determine the package manager to use
    let packageManager: "npm" | "yarn" | "pnpm" | "bun";
    const userAgent = process.env.npm_config_user_agent || "";

    switch (true) {
      case userAgent.startsWith("yarn"):
        packageManager = "yarn";
        break;
      case userAgent.startsWith("pnpm"):
        packageManager = "pnpm";
        break;
      case userAgent.startsWith("bun"):
        packageManager = "bun";
        break;
      default:
        packageManager = "npm";
        break;
    }

    // Install command
    const installCommand = {
      npm: "npm install",
      yarn: "yarn",
      pnpm: "pnpm install",
      bun: "bun install"
    }[packageManager];

    // Run command
    const runCommand = {
      npm: "npm run",
      yarn: "yarn",
      pnpm: "pnpm run",
      bun: "bun run"
    }[packageManager];

    // Start command
    const startCommand = {
      npm: "npm start",
      yarn: "yarn start",
      pnpm: "pnpm start",
      bun: "bun start"
    }[packageManager];

    // Install dependencies
    const dependencySpinner = spinner();
    if (install) {
      try {
        dependencySpinner.start("📦 Installing dependencies...");
        await promisify(exec)(installCommand, { cwd: projectPath });
        dependencySpinner.stop("✅ Dependencies installed successfully");
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        dependencySpinner.stop("❌ Failed to install dependencies");
        log.error(error.message);
        log.error(
          `You will need to install the dependencies manually by running "${installCommand}" in the project directory.`
        );
      }
    }

    outro("MAIAR project created successfully 🎉");
    console.log("Now run:\n");
    console.log(`cd ${projectName}`);
    if (!install) console.log(`${installCommand}`);
    console.log(`${runCommand} build`);
    console.log(`${startCommand}`);
  });

program.parse();
