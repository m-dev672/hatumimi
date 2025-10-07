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

export interface KeijiAttachment {
  name: string
  downloadUrl: string
}

export interface KeijiTableRow {
  cells: string[]
}

export interface KeijiTable {
  title?: string
  rows: KeijiTableRow[]
}

export interface KeijiUrlTable {
  title?: string
  urls: string[]
}

export interface KeijiDetailResult {
  content: string | null
  attachments: KeijiAttachment[]
  tables: KeijiTable[]
  urlTables: KeijiUrlTable[]
}

export const fetchKeijiDetail = async (keijitype: number, genrecd: number, seqNo: string): Promise<KeijiDetailResult> => {
  let response = await fetch('/campusweb/campussquare.do?_flowId=KJW0001100-flow&link=menu-link-mf-135062')
  let flowKey = new URL(response.url).searchParams.get('_flowExecutionKey')
  if (!flowKey) return { content: null, attachments: [], tables: [], urlTables: [] };

  let params = new URLSearchParams({
    _flowExecutionKey: flowKey,
    _eventId: 'dispKeijiListGenre',
    keijitype: keijitype.toString(),
    genrecd: genrecd.toString()
  })

  response = await fetch(`/campusweb/campussquare.do?${params}`)

  flowKey = new URL(response.url).searchParams.get('_flowExecutionKey')
  if (!flowKey) return { content: null, attachments: [], tables: [], urlTables: [] };

  params = new URLSearchParams({
    _flowExecutionKey: flowKey,
    _eventId: 'confirm',
    keijitype: keijitype.toString(),
    genrecd: genrecd.toString(),
    seqNo: seqNo.toString()
  })

  const html = await fetch(`/campusweb/campussquare.do?${params}`).then(r => r.text())

  // HTMLから掲示本文と添付ファイルを抽出
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')

  // 掲示本文を抽出
  let content: string | null = null
  const keijiNaiyoElement = doc.querySelector('.keiji-naiyo')
  if (keijiNaiyoElement) {
    // <BR>タグを改行に変換し、HTMLタグを除去
    content = keijiNaiyoElement.innerHTML
      .replace(/<BR\s*\/?>/gi, '\n')
      .replace(/<[^>]*>/g, '')
      .replace(/&nbsp;/g, ' ')
      .replace(/[ \t]+/g, ' ')
      .trim()
  }

  // テーブルから添付ファイル、URL、その他のテーブル情報を抽出
  const attachments: KeijiAttachment[] = []
  const tables: KeijiTable[] = []
  const urlTables: KeijiUrlTable[] = []
  const tbodies = Array.from(doc.querySelectorAll('table.keiji-normal tbody'))
  
  // 連続するth+tdテーブルを統合するための処理
  let currentMergedTableRows: KeijiTableRow[] = []
  
  const addCurrentMergedTable = () => {
    if (currentMergedTableRows.length > 0) {
      tables.push({ rows: currentMergedTableRows })
      currentMergedTableRows = []
    }
  }
  
  tbodies.forEach(tbody => {
    const thElement = tbody.querySelector('th')
    
    if (thElement?.textContent === '添付ファイル') {
      // 連続が途切れるので現在の統合テーブルを確定
      addCurrentMergedTable()
      
      // 添付ファイルの処理
      const attachmentLinks = Array.from(tbody.querySelectorAll('td a'))
      attachmentLinks.forEach(link => {
        const href = link.getAttribute('href')
        const fileName = link.textContent?.trim()

        if (href && fileName) {
          attachments.push({
            name: fileName,
            downloadUrl: href
          })
        }
      })
    } else if (thElement?.textContent === 'URL') {
      // 連続が途切れるので現在の統合テーブルを確定
      addCurrentMergedTable()
      
      // URL専用の処理
      const urlList: string[] = []
      const tds = Array.from(tbody.querySelectorAll('td'))
      
      tds.forEach(td => {
        let text = td.innerHTML
          .replace(/<BR\s*\/?>/gi, '\n')
          .replace(/<[^>]*>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim()
        
        if (text && text.length > 0 && !text.match(/^[\s\n,]*$/)) {
          urlList.push(text)
        }
      })
      
      if (urlList.length > 0) {
        urlTables.push({ urls: urlList })
      }
    } else {
      // その他の情報を処理
      const rows = Array.from(tbody.querySelectorAll('tr'))
      
      // th+td構造のテーブルかどうかを判定
      const isThTdTable = rows.length > 0 && rows.every(row => {
        const thCount = row.querySelectorAll('th').length
        const tdCount = row.querySelectorAll('td').length
        return thCount === 1 && tdCount === 1
      })
      
      // thとtdが交互に現れる行構造かどうかを判定
      const isAlternatingThTdTable = rows.length > 0 && rows.length % 2 === 0 && 
        rows.every((row, index) => {
          const thCount = row.querySelectorAll('th').length
          const tdCount = row.querySelectorAll('td').length
          if (index % 2 === 0) {
            // 偶数行はthのみ
            return thCount === 1 && tdCount === 0
          } else {
            // 奇数行はtdのみ
            return thCount === 0 && tdCount === 1
          }
        })
      
      if (isThTdTable) {
        // 連続するth+tdテーブルは統合対象に追加
        rows.forEach(row => {
          const cells = Array.from(row.querySelectorAll('th, td'))
          const rowData: string[] = []
          
          cells.forEach(cell => {
            // HTMLを整形してからテキストを抽出
            let text = cell.innerHTML
              .replace(/<BR\s*\/?>/gi, '\n')
              .replace(/<[^>]*>/g, '')
              .replace(/&nbsp;/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
            
            if (text && text.length > 0 && !text.match(/^[\s\n,]*$/)) {
              rowData.push(text)
            }
          })
          
          if (rowData.length > 0) {
            currentMergedTableRows.push({ cells: rowData })
          }
        })
      } else if (isAlternatingThTdTable) {
        // thとtdが交互に現れるテーブルをth+tdペアに変換
        // 注意: 変換されたth+tdテーブルは他のth+tdテーブルとはマージされず、
        // 個別のテーブルとして扱われる。これは意図的な動作。
        for (let i = 0; i < rows.length; i += 2) {
          const thRow = rows[i]
          const tdRow = rows[i + 1]
          
          const thText = thRow.querySelector('th')?.innerHTML
            .replace(/<BR\s*\/?>/gi, '\n')
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
          
          const tdText = tdRow.querySelector('td')?.innerHTML
            .replace(/<BR\s*\/?>/gi, '\n')
            .replace(/<[^>]*>/g, '')
            .replace(/&nbsp;/g, ' ')
            .replace(/\s+/g, ' ')
            .trim()
          
          if (thText && tdText && 
              !thText.match(/^[\s\n,]*$/) && 
              !tdText.match(/^[\s\n,]*$/)) {
            currentMergedTableRows.push({ cells: [thText, tdText] })
          }
        }
        // 変換されたテーブルは個別のテーブルとして確定
        addCurrentMergedTable()
      } else {
        // 連続が途切れるので現在の統合テーブルを確定
        addCurrentMergedTable()
        
        // 複数行のテーブルまたは異なる構造の場合は個別のテーブルとして処理
        const tableRows: KeijiTableRow[] = []
        
        rows.forEach(row => {
          const cells = Array.from(row.querySelectorAll('th, td'))
          const rowData: string[] = []
          
          cells.forEach(cell => {
            // HTMLを整形してからテキストを抽出
            let text = cell.innerHTML
              .replace(/<BR\s*\/?>/gi, '\n')
              .replace(/<[^>]*>/g, '')
              .replace(/&nbsp;/g, ' ')
              .replace(/\s+/g, ' ')
              .trim()
            
            if (text && text.length > 0 && !text.match(/^[\s\n,]*$/)) {
              rowData.push(text)
            }
          })
          
          if (rowData.length > 0) {
            tableRows.push({ cells: rowData })
          }
        })
        
        if (tableRows.length > 0) {
          tables.push({ rows: tableRows })
        }
      }
    }
  })
  
  // 最後に残った統合テーブルがある場合は追加
  addCurrentMergedTable()

  return { content, attachments, tables, urlTables }
}