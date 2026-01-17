import cron from "node-cron";

const APP_URL = "http://localhost:3000";

console.log("🕐 Local cron scheduler started");
console.log(`📍 Will call: ${APP_URL}/api/cron/check-deadlines`);

// Run every minute
cron.schedule("* * * * *", async () => {
    const now = new Date().toLocaleTimeString();
    console.log(`\n⏰ [${now}] Running deadline check...`);
    
    try {
        const response = await fetch(`${APP_URL}/api/cron/check-deadlines`);
        const data = await response.json();
        
        if (data.processed > 0) {
            console.log(`🔥 Processed ${data.processed} expired roast(s):`);
            data.results.forEach((r: { repo: string; actions: string[] }) => {
                console.log(`   - ${r.repo}: ${r.actions.join(", ")}`);
            });
        } else {
            console.log("✅ No expired roasts to process");
        }
    } catch (error) {
        console.error("❌ Cron error:", error);
    }
});

// Keep the script running
process.on("SIGINT", () => {
    console.log("\n👋 Stopping cron scheduler...");
    process.exit();
});