import cors from "cors";
import express, { Express, NextFunction, Request, Response } from "express";
import { Server } from "http";

export type CorsOptions = cors.CorsOptions;

export interface ServerManagerConfig {
  port: number;
  cors: cors.CorsOptions;
}

export class ServerManager {
  private app: Express;
  private _server: Server | undefined;
  private port: number;
  private cors: cors.CorsOptions;
  constructor(config: ServerManagerConfig) {
    this.app = express();
    this.port = config.port;
    this.cors = config.cors;
  }

  public get server(): Server {
    if (!this._server) throw new Error("Server not available");
    return this._server;
  }

  public registerRoute(
    path: string,
    handler: (req: Request, res: Response) => Promise<void> | void
  ): void {
    this.app.post(
      path,
      async (req: Request, res: Response, next: NextFunction) => {
        await handler(req, res);
        next();
      }
    );
  }

  public async start(): Promise<void> {
    this.app.use(express.json());

    this.app.use(cors(this.cors));

    this._server = this.app.listen(this.port);
  }

  public async stop(): Promise<void> {
    await new Promise((resolve) => this.server.close(resolve));
  }
}
