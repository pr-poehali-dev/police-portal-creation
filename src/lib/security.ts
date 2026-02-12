/**
 * Санитизация текста от XSS-атак
 * React автоматически экранирует JSX, но эта функция добавляет дополнительную защиту
 */
export function sanitizeText(text: string, maxLength: number = 500): string {
  if (!text || typeof text !== 'string') return '';
  
  // Ограничение длины
  text = text.trim().substring(0, maxLength);
  
  // Удаление опасных символов
  text = text.replace(/[<>{}]/g, '');
  
  // Удаление JavaScript-подобных конструкций
  text = text.replace(/javascript:/gi, '');
  text = text.replace(/on\w+\s*=/gi, '');
  
  return text;
}

/**
 * Валидация email
 */
export function validateEmail(email: string): boolean {
  const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
  return emailRegex.test(email);
}

/**
 * Санитизация HTML (для innerHTML использования)
 * ВАЖНО: Используйте только когда действительно нужен HTML
 */
export function sanitizeHTML(html: string): string {
  const temp = document.createElement('div');
  temp.textContent = html;
  return temp.innerHTML;
}

/**
 * Безопасное парсирование JSON
 */
export function safeJSONParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json) as T;
  } catch {
    return fallback;
  }
}

/**
 * Валидация user_id (только буквы и цифры)
 */
export function validateUserId(userId: string): boolean {
  return /^[a-zA-Z0-9]+$/.test(userId);
}
