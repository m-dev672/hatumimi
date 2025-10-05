import type { KeijiGenre } from './sqlDatabase';
import { insertKeijiData } from './sqlDatabase';

export const extractKeijiData = (genre: KeijiGenre, row: Element) => {
  const anchor = row.children[1]?.children[0] as HTMLAnchorElement;
  if (!anchor?.href || !anchor.textContent) return null;
  
  const params = new URLSearchParams(anchor.href.split('?')[1]);
  const [keijitype, genrecd, seqNo] = ['keijitype', 'genrecd', 'seqNo'].map(key => params.get(key));
  
  return keijitype && genrecd && seqNo ? { keijitype, genrecd, seqNo, genre_name: genre.genre_name, title: anchor.textContent } : null;
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
    const insertPromises = Array.from(table.children)
      .map(row => extractKeijiData(genre, row))
      .filter(Boolean)
      .map(data => insertKeijiData(data!));
    
    await Promise.all(insertPromises);
  }
};