import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCommitDiff, getCommitInfo } from "@/lib/github";
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

        const diff = await getCommitDiff(repo, trackedRepo.accessToken, sha);

        if (!diff) {
            console.log("No diff found, passing by default");
            return NextResponse.json({
                verdict: "pass",
                message: "No changes to judge",
            });
        }

        const judgment = await judgeCode(diff);

        if (judgment.pass) {
            console.log(`✅ Code passed: ${judgment.reason}`);
            return NextResponse.json({
                verdict: "pass",
                message: judgment.reason,
            });
        }

        console.log(`❌ Code failed: ${judgment.reason}`);

        const commitInfo = await getCommitInfo(repo, trackedRepo.accessToken, sha);

        const roast = await generateRoast(
            commitInfo.author,
            repo,
            commitInfo.message,
            commitInfo.branch || "unknown",
            diff,
            judgment.reason
        );

        await prisma.event.create({
            data: {
                repoName: repo,
                actor: commitInfo.author,
                commitMessage: commitInfo.message,
                commitSha: sha,
                diffSummary: diff.substring(0, 5000),
                roast,
                failReason: judgment.reason,
            },
        });

        return NextResponse.json(
            {
                verdict: "fail",
                message: judgment.reason,
                roast,
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