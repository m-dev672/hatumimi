import type { KeijiGenre } from './sqlDatabase';
import { insertKeijiDataBatch } from './sqlDatabase';

// 「2025年9月30日 11時18分42秒」形式の日時をISO文字列に変換
const parseJapaneseDateTime = (dateStr: string): string => {
  try {
    // 正規表現で年、月、日、時、分、秒を抽出
    const match = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日\s+(\d{1,2})時(\d{1,2})分(\d{1,2})秒/);
    if (!match) return dateStr; // パースできない場合は元の文字列を返す
    
    const [, year, month, day, hour, minute, second] = match;
    const date = new Date(
      parseInt(year),
      parseInt(month) - 1, // 月は0ベース
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    );
    
    return date.toISOString();
  } catch (error) {
    console.warn('日時のパースに失敗しました:', dateStr, error);
    return dateStr; // エラーの場合は元の文字列を返す
  }
};

const extractKeijiData = (genre: KeijiGenre, row: Element) => {
  const anchor = row.children[1]?.children[0] as HTMLAnchorElement;
  if (!anchor?.href || !anchor.textContent) return null;
  
  const params = new URLSearchParams(anchor.href.split('?')[1]);
  const [keijitype, genrecd, seqNo] = ['keijitype', 'genrecd', 'seqNo'].map(key => params.get(key));
  
  // 掲載日時を取得してパース (row.children[4].textContent)
  const publishedAtText = row.children[4]?.textContent?.trim() || '';
  const publishedAt = publishedAtText ? parseJapaneseDateTime(publishedAtText) : '';
  
  return keijitype && genrecd && seqNo ? { 
    keijitype, 
    genrecd, 
    seqNo, 
    genre_name: genre.genre_name, 
    title: anchor.textContent,
    published_at: publishedAt
  } : null;
};

export const fetchGenreKeiji = async (genre: KeijiGenre, flowKey: string) => {
  const params = new URLSearchParams({
    _flowExecutionKey: flowKey,
    _eventId: 'dispKeijiListGenre',
    keijitype: genre.keijitype.toString(),
    genrecd: genre.genrecd.toString()
  });
  
  const html = await fetch(`/campusweb/campussquare.do?${params}`).then(r => r.text());
  const table = new DOMParser().parseFromString(html, 'text/html').querySelectorAll('tbody')[1];
  
  if (table) {
    const extractedData = Array.from(table.children)
      .map(row => extractKeijiData(genre, row))
      .filter(Boolean);
    
    if (extractedData.length > 0) {
      await insertKeijiDataBatch(extractedData as any[]);
    }
  }
};