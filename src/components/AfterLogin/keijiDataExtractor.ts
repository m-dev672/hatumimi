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

// 「2025年9月10日 14時30分から2025年11月1日 0時0分まで」形式の掲載期間をパース
const parseJapaneseDateRange = (rangeStr: string): { start: string; end: string } => {
  try {
    // 「から」と「まで」で分割して開始日時と終了日時を抽出
    const parts = rangeStr.split('から');
    if (parts.length !== 2) {
      console.warn('掲載期間のパースに失敗しました:', rangeStr);
      return { start: '', end: '' };
    }
    
    const startPart = parts[0].trim() + '0秒'; // 秒を補完
    const endPart = parts[1].replace('まで', '').trim() + '0秒'; // 秒を補完
    
    return {
      start: parseJapaneseDateTime(startPart),
      end: parseJapaneseDateTime(endPart)
    };
  } catch (error) {
    console.warn('掲載期間のパースに失敗しました:', rangeStr, error);
    return { start: '', end: '' };
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
  
  // 掲載期間を取得してパース (row.children[5].textContent)
  const displayRangeText = row.children[5]?.textContent?.trim() || '';
  const { start: displayStart, end: displayEnd } = displayRangeText ? parseJapaneseDateRange(displayRangeText) : { start: '', end: '' };
  
  return keijitype && genrecd && seqNo ? { 
    keijitype, 
    genrecd, 
    seqNo, 
    genre_name: genre.genre_name, 
    title: anchor.textContent,
    published_at: publishedAt,
    display_start: displayStart,
    display_end: displayEnd
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