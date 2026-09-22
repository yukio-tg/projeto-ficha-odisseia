/**
 * Utilitários de imagem — sem Firebase Storage.
 * Imagens são armazenadas como URL externa ou base64 diretamente no Firestore.
 */

const MAX_BASE64_SIZE = 800 * 1024; // ~800KB antes de encode (resulta ~1MB base64)

export function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_BASE64_SIZE) {
      reject(new Error(`Imagem muito grande (${(file.size / 1024).toFixed(0)}KB). Máximo: ${(MAX_BASE64_SIZE / 1024).toFixed(0)}KB.`));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export function isValidImageUrl(url: string): boolean {
  if (!url || url.trim().length === 0) return false;
  if (url.startsWith('data:image/')) return true;
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol);
  } catch {
    return false;
  }
}
