// 科目情報の型定義
export interface Course {
  courseName: string;
  category: string | undefined;
  units: number;
};

/**
 * 成績情報を学内ポータルから取得してパースする
 */
export async function getCompletedCourses(): Promise<Course[]> {
  await fetch('/campusweb/campussquare.do')
  const initResponse = await fetch('/campusweb/campussquare.do?_flowId=SIW0001300-flow&link=menu-link-mf-135122')

  const url = new URL(initResponse.url);
  const flowExecKey = url.searchParams.get('_flowExecutionKey');
  if (flowExecKey === null) {
    //console.log('flowExecKey get fail')
    return [];
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
    return [];
  }

  const flowExecKey2 = (form as HTMLFormElement)._flowExecutionKey.value as string | null;
  //console.log(flowExecKey2);

  if (flowExecKey2 === null) {
    return [];
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
  const csvContent = decoder.decode(buffer);

  const lines = csvContent.split('\n');
  const completedCourses: Course[] = [];
  let isDataSection = false;

  for (const line of lines) {
    if (line.includes('"No."')) {
      isDataSection = true;
      continue;
    }

    if (!isDataSection) {
      continue;
    }

    const columns = line.split(',').map((column) => column.trim().slice(1, -1))

    const courseName = columns[4];
    const category = columns[2];
    const units = columns[6];
    const grade = columns[9];

    if (courseName && grade !== '不可') {
      completedCourses.push({
        courseName: courseName,
        category: category,
        units: parseInt(units) || 0
      });
    }
  }

  return completedCourses
}