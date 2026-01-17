import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCommitDiff, getCommitInfo, GITREKT_COMMIT_MESSAGES } from "@/lib/github";
import { judgeCode, generateRoast } from "@/lib/llm";

export async function POST(req: NextRequest) {
    try {
        const { repo, sha } = await req.json();

        if (!repo || !sha) {
            return NextResponse.json(
                { error: "Missing repo or sha" },
                { status: 400 }
            );
        }

        console.log(`Judging commit ${sha} in ${repo}`);

        const trackedRepo = await prisma.trackedRepo.findUnique({
            where: { repoName: repo },
        });

        if (!trackedRepo) {
            return NextResponse.json(
                { error: "Repo not tracked" },
                { status: 404 }
            );
        }

        const commitInfo = await getCommitInfo(repo, trackedRepo.accessToken, sha);

        // Skip GitRekt workflow commits
        if (GITREKT_COMMIT_MESSAGES.some(msg => commitInfo.message.startsWith(msg))) {
            console.log(`⏭️ Skipping GitRekt system commit: ${commitInfo.message}`);
            return NextResponse.json({
                verdict: "skip",
                message: "GitRekt system commit - not judged",
            });
        }

        const diff = await getCommitDiff(repo, trackedRepo.accessToken, sha);

        if (!diff) {
            console.log("No diff found, passing by default");
            
            // Track successful judgment for commits with no diff
            await prisma.event.create({
                data: {
                    repoName: repo,
                    actor: commitInfo.author,
                    commitMessage: commitInfo.message,
                    commitSha: sha,
                    commitDate: commitInfo.date ? new Date(commitInfo.date) : null,
                    diffSummary: null,
                    roast: `✅ Code passed judgment: No changes to judge`,
                    failReason: null,
                    deadline: null,
                    fixed: true,
                },
            });
            
            return NextResponse.json({
                verdict: "pass",
                message: "No changes to judge",
            });
        }

        // Skip if the only changes are to the GitRekt workflow file
        const diffLines = diff.split('\n');
        const changedFiles = diffLines
            .filter(line => line.startsWith('diff --git'))
            .map(line => {
                const parts = line.split(' b/');
                return parts.length > 1 ? parts[1] : null;
            })
            .filter((file): file is string => file !== null);
        
        const onlyGitRektChanges = changedFiles.length > 0 && 
            changedFiles.every(file => file === '.github/workflows/gitrekt.yml');
        
        if (onlyGitRektChanges) {
            console.log(`⏭️ Skipping commit that only modifies GitRekt workflow`);
            return NextResponse.json({
                verdict: "skip",
                message: "Only GitRekt workflow changes - not judged",
            });
        }

        const judgment = await judgeCode(diff);

        if (judgment.pass) {
            console.log(`✅ Code passed: ${judgment.reason}`);
            
            // Track successful judgment in database
            await prisma.event.create({
                data: {
                    repoName: repo,
                    actor: commitInfo.author,
                    commitMessage: commitInfo.message,
                    commitSha: sha,
                    commitDate: commitInfo.date ? new Date(commitInfo.date) : null,
                    diffSummary: diff.substring(0, 5000),
                    roast: `✅ Code passed judgment: ${judgment.reason}`,
                    failReason: null,
                    deadline: null,
                    fixed: true, // Mark as fixed/passed
                },
            });
            
            return NextResponse.json({
                verdict: "pass",
                message: judgment.reason,
            });
        }

        console.log(`❌ Code failed: ${judgment.reason}`);

        const roast = await generateRoast(
            commitInfo.author,
            repo,
            commitInfo.message,
            commitInfo.branch || "unknown",
            diff,
            judgment.reason
        );

        // Calculate deadline based on repo settings
        const deadline = new Date();
        // For dev: 0 minutes = 10 seconds
        if (trackedRepo.timerMinutes === 0) {
            deadline.setSeconds(deadline.getSeconds() + 10);
        } else {
            deadline.setMinutes(deadline.getMinutes() + trackedRepo.timerMinutes);
        }

        await prisma.event.create({
            data: {
                repoName: repo,
                actor: commitInfo.author,
                commitMessage: commitInfo.message,
                commitSha: sha,
                commitDate: commitInfo.date ? new Date(commitInfo.date) : null,
                diffSummary: diff.substring(0, 5000),
                roast,
                failReason: judgment.reason,
                deadline: deadline,
                fixed: false, // Explicitly mark as failed (not fixed)
            },
        });

        return NextResponse.json(
            {
                verdict: "fail",
                message: judgment.reason,
                roast,
                deadline: deadline.toISOString(),
                timerMinutes: trackedRepo.timerMinutes,
            },
            { status: 400 }
        );
    } catch (error) {
        console.error("Judge error:", error);
        return NextResponse.json(
            { error: "Judgment failed" },
            { status: 500 }
        );
    }
}