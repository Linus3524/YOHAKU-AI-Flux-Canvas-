/**
 * 圖像 / 文字分析 pipeline（純 TypeScript，無 React 依賴）
 *
 * 從 useAI.ts 剝離的三個多模態分析後台呼叫：
 *  - optimizePromptWithAI：AI 助手把模糊想法改寫成生圖 prompt
 *  - analyzeImageStyleFull：複製風格用的 11 維度全面風格分析（JSON）
 *  - analyzeProductStyleAnchor：行銷組圖鎖風格用的配色/打光/材質錨點
 * 錯誤原樣拋出，由 hook 端 handleAIError 統一分類提示。
 */
import { GenerateContentResponse } from '@google/genai';
import { callGeminiWithRetry } from '../../utils/helpers';
import { createGeminiClient } from '../geminiClient';

// 視覺理解／文字分析一律使用支援圖片輸入、Structured Outputs 與 generateContent 的穩定模型。
// 不可沿用全域生圖模型，也不要使用不存在的 `gemini-3.1-flash`。
const GEMINI_ANALYSIS_MODEL = 'gemini-3.1-flash-lite';

const splitDataUrl = (src: string): { data: string; mimeType: string } => {
    const [header, data] = src.split(',');
    return { data, mimeType: header.match(/data:(.*);base64/)?.[1] || 'image/png' };
};

/** AI 助手：把使用者的模糊想法改寫成具體生圖 prompt。未回文字時回傳 ''。 */
export async function optimizePromptWithAI(userPrompt: string, geminiApiKey?: string | null): Promise<string> {
    const genAI = createGeminiClient(geminiApiKey);
    const response = await callGeminiWithRetry<GenerateContentResponse>(() => genAI.models.generateContent({
        model: GEMINI_ANALYSIS_MODEL,
        contents: { parts: [{ text: userPrompt }] },
        config: {
            systemInstruction: `You are a professional Creative Director and Prompt Engineer.
User input is a vague idea. You must output **ONLY** the concrete, high-quality prompt for AI image generation.
**Rules:**
1. Do NOT chat. Do NOT say 'Here is a suggestion'.
2. Output format: A single paragraph of descriptive visual keywords.
3. If user speaks Chinese keep it in rich, descriptive Chinese based on user language.
4. Keep it concise but detailed.`,
        },
    }));
    return response.text ? response.text.trim() : '';
}

/** 複製風格：11 維度全面風格分析，回傳解析後的 JSON 物件（解析失敗會拋錯）。 */
export async function analyzeImageStyleFull(
    src: string,
    geminiApiKey?: string | null,
): Promise<Record<string, string>> {
    const genAI = createGeminiClient(geminiApiKey);
    const { data, mimeType } = splitDataUrl(src);

    const prompt = `Analyze this image comprehensively across all visual dimensions. Return ONLY a raw JSON object (no markdown, no code block) with exactly these keys:
{
  "color": "2-3 sentences about color tone and palette (dominant colors, temperature, saturation)",
  "lighting": "2-3 sentences about lighting quality (light source, direction, shadows, contrast)",
  "artStyle": "2-3 sentences about art style and medium (illustration style, brushwork, rendering technique)",
  "composition": "2-3 sentences about composition and camera angle (framing, perspective, focal point)",
  "texture": "2-3 sentences about surface texture and detail quality (material feel, finish, detail level)",
  "pose": "2-3 sentences about character pose and action. Write 'Not applicable' if no character present.",
  "expression": "2-3 sentences about facial expression and emotion. Write 'Not applicable' if no face present.",
  "clothing": "2-3 sentences about clothing and outfit style. Write 'Not applicable' if no character present.",
  "background": "2-3 sentences about background environment (setting, depth, atmosphere)",
  "hair": "2-3 sentences about hairstyle design. Write 'Not applicable' if no character present.",
  "typography": "2-3 sentences about text or font style visible in the image. Write 'Not applicable' if no text present."
}`;

    const response = await callGeminiWithRetry<GenerateContentResponse>(() => genAI.models.generateContent({
        model: GEMINI_ANALYSIS_MODEL,
        contents: { parts: [{ inlineData: { data, mimeType } }, { text: prompt }] },
        config: { responseMimeType: 'application/json' },
    }));

    const rawText = response.text?.trim() || '{}';
    return JSON.parse(rawText);
}

/** 影像調和 Pass 1：分析底圖的 VFX 合成視覺特徵（光源/色溫/曝光/陰影/氛圍）。未回文字時回傳 ''。 */
export async function analyzeBaseImageForCompositing(src: string, geminiApiKey?: string | null): Promise<string> {
    const genAI = createGeminiClient(geminiApiKey);
    const { data, mimeType } = splitDataUrl(src);
    const response = await callGeminiWithRetry<GenerateContentResponse>(() => genAI.models.generateContent({
        model: GEMINI_ANALYSIS_MODEL,
        contents: {
            parts: [
                { inlineData: { data, mimeType } },
                { text: `Analyze this image's visual characteristics for VFX compositing. Be brief and technical. Report:
- Light source: direction, angle, soft/hard quality
- Color temperature: warm/cool, dominant color cast
- Exposure & contrast level
- Shadow: direction, intensity, color
- Overall color grade and mood
- Any atmospheric effects (haze, glow, vignette)` },
            ],
        },
    }));
    return response.candidates?.[0]?.content?.parts?.find(p => p.text)?.text || '';
}

/** 行銷組圖鎖風格：抽取商品圖的配色/打光/材質設計語言錨點。未回文字時回傳 ''。 */
export async function analyzeProductStyleAnchor(src: string, geminiApiKey?: string | null): Promise<string> {
    const genAI = createGeminiClient(geminiApiKey);
    const { data, mimeType } = splitDataUrl(src);
    const styleAnalysisPrompt = `Analyze this product image. In 2-3 concise bullet points, describe a suitable commercial visual design language for it. Specify: 1. A harmonious color palette (give 2-3 colors with hex codes if applicable). 2. Studio lighting style (e.g. soft diffuse, high contrast). 3. Background materials or visual textures (e.g. marble, matte wood, plain studio). Keep it short and in English. Output ONLY the bullet points.`;
    const response = await callGeminiWithRetry<GenerateContentResponse>(() => genAI.models.generateContent({
        model: GEMINI_ANALYSIS_MODEL,
        contents: { parts: [{ inlineData: { data, mimeType } }, { text: styleAnalysisPrompt }] },
    }));
    return response.text ? response.text.trim() : '';
}
