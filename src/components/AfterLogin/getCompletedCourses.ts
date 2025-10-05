// 科目情報の型定義
export interface Course {
  courseName: string;
  category: string | undefined;
  units: number | undefined;
};

/**
 * 過去履修した授業を学内ポータルの成績情報ページから取得する
 */
export async function getCompletedCourses(): Promise<void> {
  const initialResponse = await fetch('/campusweb/campussquare.do?_flowId=KJW0001100-flow&link=menu-link-mf-135062')

  const url = new URL(initialResponse.url);
  const firstFlowExecutionKey = url.searchParams.get('_flowExecutionKey');
  if (firstFlowExecutionKey === null) {
    return;
  }

  const params = new URLSearchParams({
    '_flowExecutionKey': firstFlowExecutionKey,
    '_eventId': 'dispKeijiListGenre',
    'keijitype': '3',
    'genrecd': '862',
  })

  const csvDownloadPage = await fetch(`/campusweb/campussquare.do?${params}`, {
    method: 'GET'
  });

  const forumPageHtml = await csvDownloadPage.text()
  const parser = new DOMParser();
  const doc = parser.parseFromString(forumPageHtml, 'text/html');

  const noticesTable = Array.from(doc.querySelectorAll('tbody'))[1]

  Array.from(noticesTable.children).forEach((notice) => {
    const noticeAnchorElement = notice.children[1].children[0]

    const noticeUrl = noticeAnchorElement.getAttribute("href")
    const noticeTitle = noticeAnchorElement.textContent
    if (noticeUrl === null) { return }

    const queryString = noticeUrl.split('?')[1];
    const params = new URLSearchParams(queryString);

    const keijitype = params.get('keijitype');
    const genrecd = params.get('genrecd');
    const seqNo = params.get('seqNo');

    console.log({ keijitype, genrecd, seqNo }, noticeTitle);

  })
}