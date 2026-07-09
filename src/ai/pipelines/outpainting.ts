import { GenerateContentResponse } from '@google/genai';
import type { OutpaintingState } from '../../types';
import { callGeminiWithRetry } from '../../utils/helpers';
import { createGeminiClient } from '../geminiClient';

export async function generateOutpaintingPrompt(
    state: OutpaintingState,
    apiKey?: string | null,
): Promise<string> {
    const genAI = createGeminiClient(apiKey);
    const [header, data] = state.element.src.split(',');
    const mimeType = header.match(/data:(.*);base64/)?.[1] || 'image/png';
    const imagePart = { inlineData: { data, mimeType } };
    
    const prompt = `Analyze this image and write a detailed prompt for Outpainting in Traditional Chinese (繁體中文). Describe the scene, lighting, and style to extend the image naturally. Output ONLY the prompt text.`;

    const response = await callGeminiWithRetry<GenerateContentResponse>(() => genAI.models.generateContent({
        model: 'gemini-3.1-flash-lite',
        contents: { parts: [imagePart, { text: prompt }] },
    }));
    
    return response.text ? response.text.trim() : "";
}
