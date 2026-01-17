import { prisma } from "@/lib/prisma";

/**
 * Process expired pending roasts and convert them to events.
 * This function can be called from anywhere to ensure expired roasts are posted.
 * It's safe to call multiple times - it only processes roasts that are still pending.
 */
export async function processExpiredRoasts(): Promise<number> {
    try {
        const now = new Date();

        // Find all pending roasts that have expired
        const expiredRoasts = await prisma.pendingRoast.findMany({
            where: {
                status: "pending",
                expiresAt: {
                    lte: now, // Expired
                },
            },
        });

        if (expiredRoasts.length === 0) {
            return 0;
        }

        console.log(`Processing ${expiredRoasts.length} expired roasts...`);

        // Convert each expired roast to an Event
        let processed = 0;
        for (const roast of expiredRoasts) {
            try {
                // Create the event
                await prisma.event.create({
                    data: {
                        repoName: roast.repoName,
                        actor: roast.actor,
                        commitMessage: roast.commitMessage,
                        commitSha: roast.commitSha,
                        diffSummary: roast.diffSummary,
                        roast: roast.roast,
                        failReason: roast.failReason,
                    },
                });

                // Mark the pending roast as expired
                await prisma.pendingRoast.update({
                    where: { id: roast.id },
                    data: {
                        status: "expired",
                    },
                });

                console.log(`Posted roast for ${roast.repoName} commit ${roast.commitSha.substring(0, 7)}`);
                processed++;
            } catch (error) {
                console.error(`Failed to process expired roast ${roast.id}:`, error);
            }
        }

        return processed;
    } catch (error) {
        console.error("Error processing expired roasts:", error);
        return 0;
    }
}
