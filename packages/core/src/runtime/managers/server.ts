import cors from "cors";
import express, {
  Express,
  Request,
  RequestHandler,
  Response,
  Router
} from "express";
import { Server } from "http";
import { Socket } from "net";

export interface ServerManagerConfig {
  port: number;
  cors: cors.CorsOptions;
}

export class ServerManager {
  private app: Express;
  private router: Router;
  private _server: Server | undefined;
  private port: number;
  private cors: cors.CorsOptions;
  private sockets: Set<Socket> = new Set();

  constructor({ port, cors }: ServerManagerConfig) {
    this.app = express();
    this.router = Router();
    this.port = port;
    this.cors = cors;
  }

  public get server(): Server {
    if (!this._server) throw new Error("Server not available");
    return this._server;
  }

  /**
   * Register a route handler for the router
   * @param path - The path of the route
   * @param method - The HTTP method of the route
   * @param handler - The handler function for the route
   * @param middleware - The middleware functions for the route
   */
  public registerRoute(
    path: string,
    method: "get" | "post",
    handler: (req: Request, res: Response) => Promise<void> | void,
    middleware?: RequestHandler | RequestHandler[]
  ): void {
    const routeMiddleware = middleware
      ? Array.isArray(middleware)
        ? middleware
        : [middleware]
      : [express.raw({ type: "*/*" })];

    // Register route with the router
    this.router[method](
      path,
      ...routeMiddleware,
      async (req: Request, res: Response) => {
        await handler(req, res);
      }
    );
  }

  /**
   * Register a default route handler for the root path
   * This is useful for health checks and platform deployments
   */
  private setupRootRoute(): void {
    this.app.get("/", (_req: Request, res: Response) => {
      res.status(200).json({
        status: "ok",
        message: "MAIAR AI server is running",
        timestamp: new Date().toISOString()
      });
    });
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
    // Global middleware
    this.app.use(cors(this.cors));

    // Root route for health checks
    this.setupRootRoute();

    // Introspection route
    this.mountIntrospectionRoute();

    // Mount all plugin routes - this allows Express to handle all routing
    this.app.use("/", this.router);

    this._server = this.app.listen(this.port);

    // Track sockets to ensure graceful shutdown
    this._server.on("connection", (socket: Socket) => {
      this.sockets.add(socket);
      socket.on("close", () => this.sockets.delete(socket));
    });
  }

  public async stop(): Promise<void> {
    // create a shallow copy of the sockets since they mutate while they are being destroyed
    const sockets = Array.from(this.sockets);

    // Destroy any remaining sockets to unblock server.close()
    for (const socket of sockets) {
      try {
        socket.destroy();
      } catch {
        /* ignore */
      }
    }
    this.sockets.clear();

    await new Promise((resolve) => this.server.close(resolve));
  }
}
