import { processExpiredRoasts } from "@/lib/process-expired-roasts";

async function startWorker() {
  console.log("Worker started");

  while (true) {
    try {
      const processed = await processExpiredRoasts();
      if (processed > 0) {
        console.log(`Processed ${processed} roasts`);
      }
    } catch (err) {
      console.error(err);
    }

    await new Promise((r) => setTimeout(r, 60_000)); // every 1 min
  }
}

startWorker();
