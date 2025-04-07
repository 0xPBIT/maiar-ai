import express, {
  Express,
  Response as ExpressResponse,
  NextFunction,
  Request,
  RequestHandler
} from "express";
import { Server } from "http";

export interface PluginTriggerRequest extends Request {
  pluginContext?: {
    pluginId: string;
  };
}

//TODO: Is this even necessary? Should all plugin mounts be POST anyway?
export type PluginTriggerHTTPMethod =
  | "get"
  | "post"
  | "put"
  | "delete"
  | "patch";

export class ServerManager {
  private app: Express;
  private _server: Server | null = null;
  private port: number;
  private isRunning: boolean = false;

  constructor(port: number = 3000) {
    this.app = express();
    this.port = port;
  }

  public get expressApp(): Express {
    return this.app;
  }

  public get server(): Server {
    if (!this._server) {
      throw new Error("Server not started");
    }
    return this._server;
  }

  public registerRoute(
    pluginId: string,
    method: PluginTriggerHTTPMethod,
    path: string,
    handler: (
      req: PluginTriggerRequest,
      res: ExpressResponse,
      next: NextFunction
    ) => Promise<void>
  ): void {
    this.app[method](path, (req: PluginTriggerRequest, res, next) => {
      req.pluginContext = { pluginId };
      handler(req, res, next);
    });
  }

  public registerMiddleware(
    pluginId: string,
    middleware: RequestHandler
  ): void {
    this.app.use((req: PluginTriggerRequest, res, next) => {
      req.pluginContext = { pluginId };
      middleware(req, res, next);
    });
  }

  public async start(): Promise<void> {
    if (this.isRunning) return;

    this._server = this.app.listen(this.port);
    this.isRunning = true;
  }

  public async stop(): Promise<void> {
    if (!this.isRunning) return;

    await new Promise((resolve) => this._server?.close(resolve));
    this.isRunning = false;
  }
}
