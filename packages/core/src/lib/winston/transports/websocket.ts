import { Server } from "http";
import Transport, { TransportStreamOptions } from "winston-transport";
import { WebSocket, WebSocketServer } from "ws";

/**
 * WebSocketTransport is a transport for Winston that creates a WebSocket server and sends logs to connected clients to the WebSocket server.
 */
export class WebSocketTransport extends Transport {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket>;
  private pendingMessages: Map<WebSocket, string>;
  private path: string;

  /**
   * Creates a new WebSocketTransport and starts a WebSocket server on the given port and path
   * @param {Object} options - The options for the transport
   * @param {string} options.path - The path to listen on
   * @param {TransportStreamOptions} [opts] - The options for the transport
   */
  constructor({ path }: { path: string }, opts?: TransportStreamOptions) {
    super(opts);
    this.path = path;
    this.clients = new Set<WebSocket>();
    this.pendingMessages = new Map<WebSocket, string>();
  }

  /**
   * Attaches the transport to an HTTP server instance. Called internally by the Runtime.
   */
  public attachToServer(server: Server): void {
    if (this.wss) return; // Already attached

    // Create WebSocketServer with noServer: true to manually handle upgrade
    this.wss = new WebSocketServer({ noServer: true });

    // Handle upgrade events manually
    server.on("upgrade", (request, socket, head) => {
      if (request.url === this.path) {
        this.wss!.handleUpgrade(request, socket, head, (ws) => {
          this.wss!.emit("connection", ws, request);
        });
      }
    });

    // When the underlying server is closed, close the WebSocket server
    server.on("close", () => {
      this.close();
    });

    this.wss.on("connection", (ws) => {
      this.clients.add(ws);

      // Send pending messages
      for (const message of this.pendingMessages.get(ws) || []) {
        ws.send(message);
      }

      ws.on("close", () => {
        this.clients.delete(ws);
      });
    });
  }

  /**
   * Broadcasts a log message to all connected clients
   * @param {any} info - The message to log
   * @param {Function} next - The next function to call
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  public log(info: any, next: () => void): void {
    const log = { ...info, timestamp: new Date().toISOString() };
    setImmediate(() => this.emit("logged", log));

    for (const ws of this.clients) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(log));
      }
    }

    next();
  }

  /** Gracefully closes all clients *and* the server */
  public close(): void {
    if (!this.wss) return;
    for (const client of this.clients) {
      try {
        client.terminate();
      } catch {
        /* ignore */
      }
    }
    // Close the WS server itself
    try {
      this.wss.close();
    } catch {
      /* ignore */
    }
    this.wss = null;
    this.clients.clear();
  }
}

/**
 * Factory helper for the WebSocketTransport.
 * By default we set `level` to "debug" so that debug-level records are forwarded
 * to clients (console already inherits the logger level). Callers can override
 * this by passing an `opts.level` field.
 */
export const websocket = (
  { path }: { path: string },
  opts: TransportStreamOptions = {}
) =>
  new WebSocketTransport(
    { path },
    {
      level: opts.level || "debug",
      ...opts
    }
  );
