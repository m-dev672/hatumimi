/**
 * 成績情報を学内ポータルから取得してパースする
 */
export async function getPerformance(): Promise<void> {
  const initResponse = await fetch('/campusweb/campussquare.do?_flowId=SIW0001300-flow&link=menu-link-mf-135122')

  const url = new URL(initResponse.url);
  const flowExecKey = url.searchParams.get('_flowExecutionKey');
  if (flowExecKey === null) {
    console.log('flowExecKey get fail')
    return
  }

  const midResponse = await fetch('/campusweb/campussquare.do', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      '_flowExecutionKey': flowExecKey,
      '_eventId': 'fileOutput',
      'spanType': '0',  // 過去を含めた全成績
      'nendo': '2025',
      'gakkiKbnCd': '1'
    }),
  });

  const midResponseText = await midResponse.text()
  //console.log(midResponseText)

  const parser = new DOMParser();
  const doc = parser.parseFromString(midResponseText, 'text/html');

  const form = doc.getElementById('taniReferListForm');
  if (form === null) {
    return
  }

  const flowExecKey2 = (form as HTMLFormElement)._flowExecutionKey.value as string | null;
  //console.log(flowExecKey2);

  if (flowExecKey2 === null) {
    return
  }

  const finalResponse = await fetch('/campusweb/campussquare.do', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      '_flowExecutionKey': flowExecKey2,
      '_eventId': 'execCsv'
    }),
  })

  const buffer = await finalResponse.arrayBuffer();  
  const decoder = new TextDecoder('shift-jis');
  const csvText = decoder.decode(buffer);

  console.log(csvText)

  return
}