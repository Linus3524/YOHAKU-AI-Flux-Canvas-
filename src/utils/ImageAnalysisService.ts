
import { GoogleGenAI, GenerateContentResponse } from "@google/genai";

/**
 * Independent service to analyze image prompts using Gemini 3 Pro.
 * Isolated from useAI.ts to ensure core generation stability.
 */
export const analyzeImagePrompt = async (base64Image: string, apiKey: string): Promise<{ en: string, zh: string }> => {
  if (!apiKey) throw new Error("API Key is missing");

  const ai = new GoogleGenAI({ apiKey });
  
  // Clean base64 string if needed
  const cleanBase64 = base64Image.split(',')[1] || base64Image;
  const mimeTypeMatch = base64Image.match(/data:(.*);base64/);
  const mimeType = mimeTypeMatch ? mimeTypeMatch[1] : 'image/png';

  const imagePart = {
    inlineData: {
      mimeType: mimeType,
      data: cleanBase64
    }
  };

  const systemPrompt = `You are an expert AI Art Prompt Engineer. Analyze the image style, lighting, medium, subject, and OCR text. 
  Output strictly valid JSON with two fields: 
  1. 'en': A detailed, descriptive prompt in English suitable for image generation.
  2. 'zh': A high-quality Traditional Chinese (繁體中文) translation of the prompt.
  NO conversational filler. Output ONLY the JSON.`;

  try {
    const response: GenerateContentResponse = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite-preview',
      contents: {
        parts: [
            imagePart,
            { text: "Analyze this image and extract the prompt." }
        ]
      },
      config: {
        responseMimeType: "application/json",
        systemInstruction: systemPrompt
      }
    });

    const text = response.text;
    if (!text) throw new Error("No response from AI");

    let json;
    try {
        json = JSON.parse(text);
    } catch (e) {
        // Fallback if JSON parsing fails (cleanup markdown code blocks if any)
        const cleanText = text.replace(/```json|```/g, '').trim();
        json = JSON.parse(cleanText);
    }

    return {
        en: json.en || "Analysis failed",
        zh: json.zh || "分析失敗"
    };
  } catch (error) {
    console.error("Image Analysis Service Error:", error);
    throw error;
  }
};
