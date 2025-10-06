/**
 * 日付文字列を日本語形式でフォーマットします
 * @param dateStr - フォーマットする日付文字列
 * @returns フォーマットされた日付文字列
 */
export const formatDate = (dateStr: string): string => {
  if (!dateStr) return ''
  
  try {
    return new Date(dateStr).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  } catch {
    return dateStr
  }
}