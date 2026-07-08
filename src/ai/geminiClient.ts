/**
 * Gemini client 建立與 AI 錯誤分類（純 TypeScript，無 React 依賴）
 *
 * 從 useAI.ts 剝離：後台流程（建 client、錯誤歸類）不該與 UI 狀態攪在一起。
 * - createGeminiClient：統一的 client 工廠，無 key 直接丟 MISSING_API_KEY
 * - classifyAIError：把 Gemini/Atlas 的錯誤歸類成使用者可讀的訊息 + 副作用旗標，
 *   純函式回傳結果，toast / setHasApiKey 等 UI 副作用由呼叫端（hook）執行。
 */
import { GoogleGenAI } from '@google/genai';

/** 建立 Gemini client；無 key 時丟 MISSING_API_KEY（由 classifyAIError 歸類為 invalid-key） */
export function createGeminiClient(apiKey?: string | null): GoogleGenAI {
    if (!apiKey) throw new Error('MISSING_API_KEY');
    return new GoogleGenAI({ apiKey });
}

export type AIErrorKind =
    | 'invalid-key'      // API Key 完全無效（格式錯誤或不存在）
    | 'no-permission'    // 有 Key 但未在 GCP 啟用該 API
    | 'billing'          // 帳單未啟用
    | 'quota'            // 配額用完（每分鐘 or 每日上限）
    | 'overloaded'       // 伺服器過載（非使用者問題，稍後重試）
    | 'model-not-found'  // 模型名稱錯誤
    | 'unknown';

export interface ClassifiedAIError {
    kind: AIErrorKind;
    /** 給 toast 的完整訊息（已本地化） */
    userMessage: string;
    /** true = 應把 hasApiKey 設為 false（key 無效） */
    invalidatesKey: boolean;
}

/** 把 AI 呼叫錯誤歸類成使用者可讀訊息（純函式，不做任何 UI 副作用） */
export function classifyAIError(error: any, contextMsg: string): ClassifiedAIError {
    const errorMsg = (error?.message || '').toLowerCase();
    const status = error?.status || error?.code || 0;

    const isInvalidKey =
        errorMsg === 'missing_api_key' ||
        errorMsg.includes('api key not valid') ||
        errorMsg.includes('api_key_invalid') ||
        errorMsg.includes('invalid api key');

    const isNoPermission =
        (status === 403 || errorMsg.includes('403')) &&
        (errorMsg.includes('permission_denied') || errorMsg.includes('forbidden'));

    const isBillingIssue =
        errorMsg.includes('billing') ||
        errorMsg.includes('payment');

    const isQuotaExceeded =
        status === 429 ||
        errorMsg.includes('429') ||
        errorMsg.includes('quota') ||
        errorMsg.includes('resource_exhausted') ||
        errorMsg.includes('rate limit') ||
        errorMsg.includes('too many requests');

    const isOverloaded =
        status === 503 ||
        errorMsg.includes('503') ||
        errorMsg.includes('overloaded') ||
        errorMsg.includes('service unavailable');

    const isModelNotFound =
        status === 404 ||
        errorMsg.includes('404') ||
        errorMsg.includes('not found') ||
        errorMsg.includes('model');

    if (isInvalidKey) {
        return { kind: 'invalid-key', invalidatesKey: true, userMessage: '🔑 API Key 無效或格式錯誤，請重新輸入。' };
    }
    if (isNoPermission) {
        return { kind: 'no-permission', invalidatesKey: false, userMessage: '🚫 權限不足：請到 Google Cloud Console 啟用 Gemini API。' };
    }
    if (isBillingIssue) {
        return { kind: 'billing', invalidatesKey: false, userMessage: '💳 帳單未啟用：請確認您的 GCP 專案已開啟計費功能。' };
    }
    if (isQuotaExceeded) {
        return { kind: 'quota', invalidatesKey: false, userMessage: '⏰ 配額已用完：今日 API 使用量已達上限，請明天再試或升級方案。' };
    }
    if (isOverloaded) {
        return { kind: 'overloaded', invalidatesKey: false, userMessage: '⏳ Gemini 伺服器暫時過載，已自動重試 3 次仍失敗，請稍後 1-2 分鐘再試。' };
    }
    if (isModelNotFound) {
        return { kind: 'model-not-found', invalidatesKey: false, userMessage: '❌ 模型不存在或名稱錯誤，請確認模型版本。' };
    }
    return {
        kind: 'unknown',
        invalidatesKey: false,
        userMessage: `${contextMsg}失敗：${error?.message?.slice(0, 60) || '未知錯誤'}`,
    };
}
