import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processExpiredRoasts } from "@/lib/process-expired-roasts";

export async function GET(request: Request){
    try{
        const processed = await processExpiredRoasts();

        return NextResponse.json({
            success: true,
            processed,
            });
        } catch (err) {
            return NextResponse.json({ error: "Failed" }, { status: 500 });
        }
    }
    
