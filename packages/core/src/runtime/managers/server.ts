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

  private mountIntrospectionRoute(): void {
    this.app.get("/introspect", (_req: Request, res: Response) => {
      res.json({
        routes: this.app._router.stack
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .filter((r: any) => r.route)
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((r: any) => ({
            path: r.route.path,
            methods: Object.keys(r.route.methods).reduce(
              (acc: Record<string, boolean>, method: string) => {
                acc[method] = r.route.methods[method];
                return acc;
              },
              {}
            )
          }))
      });
    });
  }

  public async start(): Promise<void> {
    this.app.use(express.json());
    this.app.use(cors(this.cors));

    this.mountIntrospectionRoute();

    this._server = this.app.listen(this.port);
  }

  public async stop(): Promise<void> {
    await new Promise((resolve) => this.server.close(resolve));
  }
}
