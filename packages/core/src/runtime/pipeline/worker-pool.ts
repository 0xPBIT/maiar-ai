import { Logger } from "winston";
import { Runtime } from "../..";
import logger from "../../lib/logger";
import { StateUpdate } from "../../monitor/events";
import { MemoryManager } from "../managers/memory";
import { PluginRegistry } from "../managers/plugin";
import { Processor } from "./processor";
import { AgentTask, Context } from "./types";

export interface WorkerConfig {
  enableConcurrency: boolean;
  maxWorkersPerSpace: number;
  workerTimeoutMs: number;
  healthCheckIntervalMs: number;
}

export interface WorkerPoolStats {
  totalWorkers: number;
  activeWorkers: number;
  queueLengths: Record<string, number>;
  workerHealth: Record<string, 'healthy' | 'unhealthy' | 'starting' | 'stopping'>;
}

export interface SpaceWorkerInfo {
  worker: any | null; // Placeholder for future Worker thread implementation
  taskQueue: AgentTask[];
  isProcessing: boolean;
  lastHealth: number;
  status: 'healthy' | 'unhealthy' | 'starting' | 'stopping';
}

export class WorkerPool {
  private readonly runtime: Runtime;
  private readonly memoryManager: MemoryManager;
  private readonly pluginRegistry: PluginRegistry;
  private readonly config: WorkerConfig;
  
  // Map from space identifier (space.id or concurrencyGroup) to worker info
  private spaceWorkers: Map<string, SpaceWorkerInfo> = new Map();
  private healthCheckInterval: ReturnType<typeof setInterval> | null = null;
  private isShuttingDown = false;

  public get logger(): Logger {
    return logger.child({ scope: "worker-pool" });
  }

  constructor(
    runtime: Runtime,
    memoryManager: MemoryManager,
    pluginRegistry: PluginRegistry,
    config: WorkerConfig
  ) {
    this.runtime = runtime;
    this.memoryManager = memoryManager;
    this.pluginRegistry = pluginRegistry;
    this.config = config;
  }

  /**
   * Initialize the worker pool and start health monitoring
   */
  public async init(): Promise<void> {
    if (!this.config.enableConcurrency) {
      this.logger.info("Concurrency disabled, worker pool will not start");
      return;
    }

    this.logger.info("Initializing worker pool", {
      maxWorkersPerSpace: this.config.maxWorkersPerSpace,
      workerTimeoutMs: this.config.workerTimeoutMs
    });

    // Start health check monitoring
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheckIntervalMs);

    this.logger.info("Worker pool initialized successfully");
  }

  /**
   * Get the appropriate space identifier for worker bucketing
   */
  private getSpaceIdentifier(task: AgentTask): string {
    return task.space.concurrencyGroup || task.space.id;
  }

  /**
   * Queue a task for execution by the appropriate space worker
   */
  public async queueTask(task: AgentTask): Promise<void> {
    if (!this.config.enableConcurrency) {
      throw new Error("Worker pool is not enabled for concurrent execution");
    }

    const spaceId = this.getSpaceIdentifier(task);
    
    let workerInfo = this.spaceWorkers.get(spaceId);
    if (!workerInfo) {
      workerInfo = await this.createWorker(spaceId);
      this.spaceWorkers.set(spaceId, workerInfo);
    }

    // Add task to the space-specific queue
    workerInfo.taskQueue.push(task);
    
    this.logger.debug("Task queued for space worker", {
      spaceId,
      queueLength: workerInfo.taskQueue.length,
      taskId: task.trigger.id
    });

    this.emitStateUpdate();

    // Trigger processing if not already running
    if (!workerInfo.isProcessing && workerInfo.status === 'healthy') {
      this.scheduleWorkerProcessing(spaceId);
    }
  }

  /**
   * Create a new worker for a specific space
   */
  private async createWorker(spaceId: string): Promise<SpaceWorkerInfo> {
    this.logger.info("Creating new worker for space", { spaceId });

    const workerInfo: SpaceWorkerInfo = {
      worker: null,
      taskQueue: [],
      isProcessing: false,
      lastHealth: Date.now(),
      status: 'starting'
    };

    try {
      // In a real implementation, we'd spawn actual worker threads
      // For now, we'll use a simulated approach with async processing
      workerInfo.status = 'healthy';
      workerInfo.lastHealth = Date.now();
      
      this.logger.info("Worker created successfully", { spaceId });
    } catch (error) {
      workerInfo.status = 'unhealthy';
      this.logger.error("Failed to create worker", {
        spaceId,
        error: error instanceof Error ? error.message : String(error)
      });
    }

    return workerInfo;
  }

  /**
   * Schedule task processing for a specific worker
   */
  private scheduleWorkerProcessing(spaceId: string): void {
    const workerInfo = this.spaceWorkers.get(spaceId);
    if (!workerInfo || workerInfo.isProcessing || workerInfo.taskQueue.length === 0) {
      return;
    }

    workerInfo.isProcessing = true;
    
    // Schedule processing on the next tick to avoid blocking
    setImmediate(() => this.processWorkerTasks(spaceId));
  }

  /**
   * Process tasks in a space-specific worker queue
   */
  private async processWorkerTasks(spaceId: string): Promise<void> {
    const workerInfo = this.spaceWorkers.get(spaceId);
    if (!workerInfo) {
      return;
    }

    this.logger.debug("Starting task processing for space", {
      spaceId,
      queueLength: workerInfo.taskQueue.length
    });

    try {
      while (workerInfo.taskQueue.length > 0 && !this.isShuttingDown) {
        const task = workerInfo.taskQueue.shift();
        if (!task) continue;

        try {
          await this.executeTask(task, spaceId);
        } catch (error) {
          this.logger.error("Error processing task in worker", {
            spaceId,
            error: error instanceof Error ? error.message : String(error),
            taskId: task.trigger.id
          });
        }

        this.emitStateUpdate();
      }
    } finally {
      workerInfo.isProcessing = false;
      workerInfo.lastHealth = Date.now();
      
      this.logger.debug("Finished task processing for space", {
        spaceId,
        remainingTasks: workerInfo.taskQueue.length
      });
    }
  }

  /**
   * Execute a single task using the processor
   */
  private async executeTask(task: AgentTask, spaceId: string): Promise<void> {
    this.logger.debug("Executing task in worker", {
      spaceId,
      taskId: task.trigger.id
    });

    // Create processor instance for this execution
    const processor = new Processor(
      this.runtime,
      this.memoryManager,
      this.pluginRegistry
    );

    // Store the incoming task event in memory
    const memoryId = await this.memoryManager.storeMemory(task);

    // Execute the task pipeline
    const completedTaskChain = await processor.spawn(task);

    // Update memory with completed context
    await this.memoryManager.updateMemory(memoryId, {
      context: JSON.stringify(completedTaskChain)
    });

    this.logger.info("Task execution complete in worker", {
      spaceId,
      taskId: task.trigger.id
    });
  }

  /**
   * Perform health checks on all workers
   */
  private performHealthChecks(): void {
    if (this.isShuttingDown) {
      return;
    }

    const now = Date.now();
    const unhealthyThreshold = this.config.workerTimeoutMs;

    for (const [spaceId, workerInfo] of this.spaceWorkers.entries()) {
      const timeSinceLastHealth = now - workerInfo.lastHealth;
      
      if (timeSinceLastHealth > unhealthyThreshold && workerInfo.status === 'healthy') {
        this.logger.warn("Worker appears unhealthy", {
          spaceId,
          timeSinceLastHealth,
          threshold: unhealthyThreshold
        });
        
        workerInfo.status = 'unhealthy';
        this.restartWorker(spaceId);
      }
    }
  }

  /**
   * Restart an unhealthy worker
   */
  private async restartWorker(spaceId: string): Promise<void> {
    this.logger.info("Restarting unhealthy worker", { spaceId });
    
    const workerInfo = this.spaceWorkers.get(spaceId);
    if (!workerInfo) {
      return;
    }

    workerInfo.status = 'starting';
    
    try {
      // Simulate worker restart
      await new Promise(resolve => setTimeout(resolve, 100));
      
      workerInfo.status = 'healthy';
      workerInfo.lastHealth = Date.now();
      
      this.logger.info("Worker restarted successfully", { spaceId });
      
      // Resume processing if there are queued tasks
      if (workerInfo.taskQueue.length > 0 && !workerInfo.isProcessing) {
        this.scheduleWorkerProcessing(spaceId);
      }
    } catch (error) {
      workerInfo.status = 'unhealthy';
      this.logger.error("Failed to restart worker", {
        spaceId,
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }

  /**
   * Get current worker pool statistics
   */
  public getStats(): WorkerPoolStats {
    const stats: WorkerPoolStats = {
      totalWorkers: this.spaceWorkers.size,
      activeWorkers: 0,
      queueLengths: {},
      workerHealth: {}
    };

    for (const [spaceId, workerInfo] of this.spaceWorkers.entries()) {
      if (workerInfo.status === 'healthy') {
        stats.activeWorkers++;
      }
      
      stats.queueLengths[spaceId] = workerInfo.taskQueue.length;
      stats.workerHealth[spaceId] = workerInfo.status;
    }

    return stats;
  }

  /**
   * Emit state update for monitoring
   */
  private emitStateUpdate(): void {
    const stats = this.getStats();
    
    const stateEvt: StateUpdate = {
      type: "state",
      message: "worker pool state update",
      timestamp: Date.now(),
      metadata: {
        state: {
          workerPool: stats,
          lastUpdate: Date.now()
        }
      }
    };

    this.logger.debug(stateEvt.message, stateEvt);
  }

  /**
   * Gracefully shutdown the worker pool
   */
  public async shutdown(): Promise<void> {
    this.isShuttingDown = true;
    
    this.logger.info("Shutting down worker pool", {
      totalWorkers: this.spaceWorkers.size
    });

    // Stop health monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }

    // Wait for all workers to finish processing current tasks
    const shutdownPromises: Promise<void>[] = [];
    
    for (const [spaceId, workerInfo] of this.spaceWorkers.entries()) {
      if (workerInfo.isProcessing) {
        shutdownPromises.push(this.waitForWorkerCompletion(spaceId));
      }
    }

    await Promise.all(shutdownPromises);
    
    this.spaceWorkers.clear();
    this.logger.info("Worker pool shutdown complete");
  }

  /**
   * Wait for a worker to complete its current processing
   */
  private async waitForWorkerCompletion(spaceId: string): Promise<void> {
    const workerInfo = this.spaceWorkers.get(spaceId);
    if (!workerInfo) {
      return;
    }

    const maxWaitTime = this.config.workerTimeoutMs;
    const startTime = Date.now();

    while (workerInfo.isProcessing && Date.now() - startTime < maxWaitTime) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (workerInfo.isProcessing) {
      this.logger.warn("Worker did not complete within timeout", {
        spaceId,
        maxWaitTime
      });
    }
  }
}