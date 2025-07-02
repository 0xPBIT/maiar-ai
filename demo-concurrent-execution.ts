/**
 * Demonstration of MAIAR Concurrent Task Execution
 * 
 * This script demonstrates the new concurrent execution capabilities
 * that allow multiple agent conversations to run simultaneously.
 */

import { Runtime } from "./packages/core/src";

async function demonstrateConcurrentExecution() {
  console.log("🚀 MAIAR Concurrent Execution Demo");
  console.log("==================================");

  // Example 1: Enable concurrency in Runtime configuration
  console.log("\n1. Enabling Concurrent Execution:");
  console.log("   You can enable concurrency by setting scheduler options in Runtime.init()");
  
  const runtimeConfig = {
    modelProviders: [], // Your model providers
    memoryProvider: {}, // Your memory provider
    plugins: [], // Your plugins
    capabilityAliases: [],
    options: {
      scheduler: {
        enableConcurrency: true,        // Enable concurrent execution
        maxWorkersPerSpace: 2,          // Max workers per space (future use)
        workerTimeoutMs: 30000,         // Worker timeout in milliseconds
        healthCheckIntervalMs: 5000     // Health check interval
      }
    }
  };

  console.log("   Configuration:", JSON.stringify(runtimeConfig.options.scheduler, null, 2));

  // Example 2: Space Configuration for Concurrency Groups
  console.log("\n2. Space Configuration Examples:");
  
  const spaceExamples = [
    {
      name: "Individual Spaces (default)",
      spaces: [
        { id: "user-123", description: "Each user gets their own worker" },
        { id: "user-456", description: "Independent processing" }
      ]
    },
    {
      name: "Concurrency Groups",
             spaces: [
                  { 
           id: "discord-channel-1", 
           description: "Multiple Discord channels share one worker (concurrencyGroup: 'discord-bot')"
         },
         { 
           id: "discord-channel-2", 
           description: "Same group as above - shares worker (concurrencyGroup: 'discord-bot')"
         },
         { 
           id: "telegram-chat-1", 
           description: "Telegram chats use separate worker group (concurrencyGroup: 'telegram-bot')"
         }
      ]
    }
  ];

  spaceExamples.forEach(example => {
    console.log(`\n   ${example.name}:`);
    example.spaces.forEach(space => {
      console.log(`     - ${space.id}: ${space.description}`);
      if (space.concurrencyGroup) {
        console.log(`       (concurrencyGroup: "${space.concurrencyGroup}")`);
      }
    });
  });

  // Example 3: Usage in Code
  console.log("\n3. Code Usage Examples:");
  
  console.log(`
   // Create events for different spaces - they will run concurrently
   await runtime.createEvent(
     {
       id: "msg-1",
       pluginId: "discord", 
       content: "Hello from user A",
       timestamp: Date.now()
     },
     { id: "user-A" }  // This gets its own worker
   );

   await runtime.createEvent(
     {
       id: "msg-2", 
       pluginId: "discord",
       content: "Hello from user B", 
       timestamp: Date.now()
     },
     { id: "user-B" }  // This gets a separate worker - runs concurrently!
   );

   // Tasks within the same space run sequentially (preserving order)
   await runtime.createEvent(trigger1, { id: "user-A" }); // Runs first
   await runtime.createEvent(trigger2, { id: "user-A" }); // Runs second
  `);

  // Example 4: Monitoring
  console.log("\n4. Monitoring Concurrent Execution:");
  console.log(`
   The monitor UI will show additional statistics:
   
   - Total workers active
   - Queue length per space/group  
   - Worker health status
   - Per-worker processing state
   
   State updates include a 'workerPool' field with:
   {
     "totalWorkers": 3,
     "activeWorkers": 2, 
     "queueLengths": {
       "user-A": 0,
       "user-B": 1,
       "discord-bot": 2
     },
     "workerHealth": {
       "user-A": "healthy",
       "user-B": "healthy", 
       "discord-bot": "healthy"
     }
   }
  `);

  // Example 5: Migration Path
  console.log("\n5. Migration from Single-threaded:");
  console.log(`
   ✅ BACKWARD COMPATIBLE: Existing deployments continue to work unchanged
   
   Before (single-threaded):
   const runtime = await Runtime.init({
     // ... existing config
   });
   
   After (opt-in concurrency):  
   const runtime = await Runtime.init({
     // ... existing config
     options: {
       scheduler: { enableConcurrency: true }  // Just add this!
     }
   });
  `);

  // Example 6: Performance Benefits
  console.log("\n6. Performance Benefits:");
  console.log(`
   Scenario: 3 simultaneous conversations
   
   📈 Before (sequential):
   User A: [████████████] 3000ms
   User B:              [████████████] 3000ms  
   User C:                           [████████████] 3000ms
   Total: 9000ms latency for User C
   
   🚀 After (concurrent):
   User A: [████████████] 3000ms
   User B: [████████████] 3000ms
   User C: [████████████] 3000ms  
   Total: 3000ms latency for all users!
  `);

  console.log("\n✨ Ready to implement concurrent execution!");
  console.log("\nKey files modified:");
  console.log("  - packages/core/src/runtime/providers/memory.ts (added concurrencyGroup to Space)");
  console.log("  - packages/core/src/runtime/pipeline/worker-pool.ts (new WorkerPool class)");
  console.log("  - packages/core/src/runtime/pipeline/scheduler.ts (updated for concurrency)");
  console.log("  - packages/core/src/runtime/index.ts (added scheduler config options)");
  console.log("  - packages/core/src/monitor/events.ts (added worker pool monitoring)");
}

export { demonstrateConcurrentExecution };