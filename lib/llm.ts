import { GoogleGenAI } from "@google/genai";

const googleAi = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function callGemini(prompt: string): Promise<string> {
    const response = await googleAi.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: prompt,
    });
    const text = response.text;
    if (typeof text !== "string") {
        throw new Error("Gemini response missing text");
    }
    return text;
}

export async function judgeCode(diff: string): Promise<{ pass: boolean; reason: string }> {
    try {
        const prompt = `
You are a senior software engineer and code reviewer.
Analyze the following git diff and determine if the code is acceptable.

Criteria for FAILURE (Reply NO):
- Obvious syntax errors in the diff
- Malicious code, backdoors, or sabotage
- Completely broken logic that will crash
- Empty or nonsense commits

Criteria for SUCCESS (Reply YES):
- Valid code changes
- Work in progress that is syntactically correct
- Documentation updates
- Standard refactoring

DIFF:
${diff.substring(0, 4000)}

Reply with JSON format: {"pass": true/false, "reason": "brief explanation"}
`;

        const content = await callGemini(prompt);
        
        // Try to parse JSON response
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            return {
                pass: parsed.pass === true,
                reason: parsed.reason || "No reason provided",
            };
        }

        // Fallback: check for YES/NO
        const answer = content.trim().toUpperCase();
        return {
            pass: answer.includes("YES"),
            reason: content.substring(0, 200),
        };
    } catch (error) {
        console.error("Error judging code:", error);
        // Fail open - don't block on AI errors
        return { pass: true, reason: "AI judgment unavailable" };
    }
}

export async function generateRoast(
    actor: string,
    repo: string,
    commitMessage: string,
    branch: string,
    diff?: string,
    failReason?: string
): Promise<string> {
    try {
        const diffContext = diff ? `\nCode changes:\n${diff.substring(0, 1000)}...\n` : "";
        const reasonContext = failReason ? `\nThe AI detected: ${failReason}\n` : "";

        const prompt = `
You are a sarcastic roasting bot for "GitRekt".
A developer named "${actor}" just pushed bad code to "${repo}" on branch "${branch}".
Commit message: "${commitMessage}"
${diffContext}
${reasonContext}

Write a short, savage roast about their code failure.
Be funny but not mean-spirited. Keep it under 280 characters.
Include hashtags like #GitRekt #BadCode #Oops
`;

        const content = await callGemini(prompt);
        return content.trim();
    } catch (error) {
        console.error("Error generating roast:", error);
        return "Error";
    }
}