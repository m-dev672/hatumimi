// 科目情報の型定義
export interface Course {
  courseName: string;
  category: string | undefined;
  units: number | undefined;
};

/**
 * 過去履修した授業を学内ポータルの成績情報ページから取得する
 */
export async function getCompletedCourses(curriculumPath: string): Promise<Course[]> {
  const initialResponse = await fetch('/campusweb/campussquare.do?_flowId=SIW0001300-flow&link=menu-link-mf-135122')

  const url = new URL(initialResponse.url);
  const firstFlowExecutionKey = url.searchParams.get('_flowExecutionKey');
  if (firstFlowExecutionKey === null) {
    return [];
  }

  const csvDownloadPage = await fetch('/campusweb/campussquare.do', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      '_flowExecutionKey': firstFlowExecutionKey,
      '_eventId': 'fileOutput',
      'spanType': '0',  // 過去を含めた全成績
      'nendo': '2025',
      'gakkiKbnCd': '1'
    }),
  });

  const csvDownloadPageHtml = await csvDownloadPage.text()
  const parser = new DOMParser();
  const doc = parser.parseFromString(csvDownloadPageHtml, 'text/html');

  const form = doc.getElementById('taniReferListForm');
  if (form === null) {
    return [];
  }

  const secondFlowExecutionKey = (form as HTMLFormElement)._flowExecutionKey.value as string | null;

  if (secondFlowExecutionKey === null) {
    return [];
  }

  const csvResponse = await fetch('/campusweb/campussquare.do', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      '_flowExecutionKey': secondFlowExecutionKey,
      '_eventId': 'execCsv'
    }),
  })

  const buffer = await csvResponse.arrayBuffer();
  const decoder = new TextDecoder('shift-jis');
  const csvContent = decoder.decode(buffer);

  const lines = csvContent.split('\n');
  const completedCourses: Course[] = [];
  let isDataSection = false;

  // パッチデータを読み込み
  const patchResponse = await fetch(`${curriculumPath}/patches.json`);
  const patchFile = await patchResponse.json();
  const patchData: Course[] = patchFile.patches.flatMap((p: any) => p.patch);

  for (const line of lines) {
    if (line.includes('"No."')) {
      isDataSection = true;
      continue;
    } else if (!isDataSection) {
      continue;
    }

    const columns = line.split(',').map((column) => column.trim().slice(1, -1))

    const courseName = columns[4];
    let category = columns[2];
    let units = parseInt(columns[6]) || 0;
    const passed = columns[10] === '合';

    if (courseName && passed) {
      // パッチデータで修正があるかチェック
      const patch = patchData.find(p => p.courseName === courseName);
      if (patch) {
        category = patch.category || category;
        units = patch.units || units;
      }

      completedCourses.push({
        courseName: courseName,
        category: category,
        units: units
      });
    }
  }

  return completedCourses
}