/**
 * 判斷字串是否包含 linear-gradient
 * @param color 顏色字串
 * @returns 是否為漸層字串
 */
export function isGradient(color: string | undefined): boolean {
    if (!color) return false;
    return color.includes('linear-gradient');
}

/**
 * 解析 "linear-gradient(90deg, #ff0000, #0000ff)" 格式
 * 只需支援兩個色標的簡單格式
 * @param cssGradient CSS 漸層字串
 * @returns 包含 angle, color1, color2 的物件，解析失敗則回傳 null
 */
export function parseLinearGradient(cssGradient: string): { angle: number; color1: string; color2: string } | null {
    if (!isGradient(cssGradient)) return null;
    
    // 匹配 linear-gradient(角度deg, 顏色1, 顏色2)
    const match = cssGradient.match(/linear-gradient\(\s*(-?\d+)deg\s*,\s*(.+?)\s*,\s*(.+?)\s*\)/i);
    if (!match) return null;

    return {
        angle: parseInt(match[1], 10),
        color1: match[2].trim(),
        color2: match[3].trim()
    };
}

/**
 * 將 CSS 角度（deg）轉換為 SVG linearGradient 的 x1/y1/x2/y2 百分比字串
 * 0deg = 由下到上（y1="100%" y2="0%"）
 * 90deg = 由左到右（x1="0%" x2="100%"）
 * @param angle CSS 漸層角度
 * @returns SVG 漸層座標物件
 */
export function gradientAngleToSVG(angle: number): { x1: string; y1: string; x2: string; y2: string } {
    // CSS 角度轉為弧度 (0deg 在 CSS 是朝上，數學上是 90deg)
    const rad = (angle - 90) * (Math.PI / 180);
    
    // 計算起點與終點 (以 50% 為中心，半徑 50%)
    const x1 = Math.round(50 + Math.cos(rad + Math.PI) * 50);
    const y1 = Math.round(50 + Math.sin(rad + Math.PI) * 50);
    const x2 = Math.round(50 + Math.cos(rad) * 50);
    const y2 = Math.round(50 + Math.sin(rad) * 50);
    
    return {
        x1: `${x1}%`,
        y1: `${y1}%`,
        x2: `${x2}%`,
        y2: `${y2}%`
    };
}

/**
 * 回傳 `linear-gradient(${angle}deg, ${color1}, ${color2})`
 * @param angle 角度 (deg)
 * @param color1 起點顏色
 * @param color2 終點顏色
 * @returns CSS 漸層字串
 */
export function buildLinearGradientCSS(angle: number, color1: string, color2: string): string {
    return `linear-gradient(${angle}deg, ${color1}, ${color2})`;
}
