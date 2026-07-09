import { optimizePromptWithAI } from './analysis';

export async function askAI(userPrompt: string, apiKey?: string | null): Promise<string> {
    const optimized = await optimizePromptWithAI(userPrompt, apiKey);
    return optimized || "抱歉，我現在無法思考。";
}
