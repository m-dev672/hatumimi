import type { KeijiGenre } from './sqlDatabase'
import { insertKeijiDataBatch } from './sqlDatabase'

const parseJapaneseDateTime = (dateStr: string): string => {
  try {
    const match = dateStr.match(/(\d{4})年(\d{1,2})月(\d{1,2})日\s+(\d{1,2})時(\d{1,2})分(\d{1,2})秒/)
    if (!match) return dateStr

    const [, year, month, day, hour, minute, second] = match
    return new Date(
      parseInt(year),
      parseInt(month) - 1,
      parseInt(day),
      parseInt(hour),
      parseInt(minute),
      parseInt(second)
    ).toISOString()
  } catch (error) {
    console.warn('日時のパースに失敗しました:', dateStr, error)
    return dateStr
  }
}

const parseJapaneseDateRange = (rangeStr: string): { start: string; end: string } => {
  try {
    const parts = rangeStr.split('から')
    if (parts.length !== 2) {
      console.warn('掲載期間のパースに失敗しました:', rangeStr)
      return { start: '', end: '' }
    }

    const startPart = parts[0].trim() + '0秒'
    const endPart = parts[1].replace('まで', '').trim() + '0秒'

    return {
      start: parseJapaneseDateTime(startPart),
      end: parseJapaneseDateTime(endPart)
    }
  } catch (error) {
    console.warn('掲載期間のパースに失敗しました:', rangeStr, error)
    return { start: '', end: '' }
  }
}

const extractKeijiData = (genre: KeijiGenre, row: Element) => {
  const anchor = row.children[1]?.children[0] as HTMLAnchorElement
  if (!anchor?.href || !anchor.textContent) return null

  const params = new URLSearchParams(anchor.href.split('?')[1])
  const [keijitype, genrecd, seqNo] = ['keijitype', 'genrecd', 'seqNo'].map(key => params.get(key))

  const publishedAtText = row.children[4]?.textContent?.trim() || ''
  const publishedAt = publishedAtText ? parseJapaneseDateTime(publishedAtText) : ''

  const displayRangeText = row.children[5]?.textContent?.trim() || ''
  const { start: displayStart, end: displayEnd } = displayRangeText ? parseJapaneseDateRange(displayRangeText) : { start: '', end: '' }

  return keijitype && genrecd && seqNo ? {
    keijitype, genrecd, seqNo,
    genre_name: genre.genre_name,
    title: anchor.textContent,
    published_at: publishedAt,
    display_start: displayStart,
    display_end: displayEnd
  } : null
}

export const fetchGenreKeiji = async (genre: KeijiGenre, flowKey: string) => {
  const params = new URLSearchParams({
    _flowExecutionKey: flowKey,
    _eventId: 'dispKeijiListGenre',
    keijitype: genre.keijitype.toString(),
    genrecd: genre.genrecd.toString()
  })

  const html = await fetch(`/campusweb/campussquare.do?${params}`).then(r => r.text())
  const table = new DOMParser().parseFromString(html, 'text/html').querySelectorAll('tbody')[1]

  if (table) {
    const extractedData = Array.from(table.children)
      .map(row => extractKeijiData(genre, row))
      .filter(Boolean)

    if (extractedData.length > 0) {
      await insertKeijiDataBatch(extractedData as Parameters<typeof insertKeijiDataBatch>[0])
    }
  }
}

export const fetchKeijiDetail = async (keijitype: number, genrecd: number, seqNo: string): Promise<string | null> => {
  let response = await fetch('/campusweb/campussquare.do?_flowId=KJW0001100-flow&link=menu-link-mf-135062')
  let flowKey = new URL(response.url).searchParams.get('_flowExecutionKey')
  if (!flowKey) return null;

  let params = new URLSearchParams({
    _flowExecutionKey: flowKey,
    _eventId: 'dispKeijiListGenre',
    keijitype: keijitype.toString(),
    genrecd: genrecd.toString()
  })

  response = await fetch(`/campusweb/campussquare.do?${params}`)

  flowKey = new URL(response.url).searchParams.get('_flowExecutionKey')
  if (!flowKey) return null;

  params = new URLSearchParams({
    _flowExecutionKey: flowKey,
    _eventId: 'confirm',
    keijitype: keijitype.toString(),
    genrecd: genrecd.toString(),
    seqNo: seqNo.toString()
  })

  const html = await fetch(`/campusweb/campussquare.do?${params}`).then(r => r.text())
  console.log(html)
  
  // HTMLから掲示本文を抽出
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const keijiNaiyoElement = doc.querySelector('.keiji-naiyo')
  
  if (keijiNaiyoElement) {
    // <BR>タグを改行に変換し、HTMLタグを除去
    let content = keijiNaiyoElement.innerHTML
      .replace(/<BR\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .trim()
    
    return content
  }

  return null
}