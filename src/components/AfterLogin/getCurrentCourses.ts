import {type Course} from './getCompletedCourses'

/**
 * 現在履修中の授業を学内ポータルの出欠状況参照ページから取得してパースする
 */
export async function getCurrentCourses(): Promise<Course[]> {
  const attendancesPage = await fetch('/campusweb/campussquare.do?_flowId=AAW0001000-flow&link=menu-link-mf-135117')

  const attendancesPageHtml = await attendancesPage.text()

  const parser = new DOMParser();
  const document = parser.parseFromString(attendancesPageHtml, 'text/html');

  const currentMonth = new Date().getMonth();
  const currentTerms = 3 <= currentMonth && currentMonth <= 8 ? ['前学期', '集中', '通年'] : ['後学期', '通年'];

  const attendancesTable = Array.from(document.querySelectorAll('tbody')).at(-2);

  const kyoyoJsonResponse = await fetch('human_science_2024_kyoyo.json');
  const senkoJsonResponse = await fetch('human_science_2024_senko.json');
  const kyoyoJsonContent = await kyoyoJsonResponse.json()
  const senkoJsonContent = await senkoJsonResponse.json()

  const courses: Course[] = [...kyoyoJsonContent, ...senkoJsonContent]
  const currentCourses: Course[] = []

  Array.from(attendancesTable!.rows).forEach((row) => {
    const term = row.children[1].textContent.trim()
    if (currentTerms.includes(term)) {
      const courseName = (row.children[3].textContent.split('／').at(0) || '').trim()
      const result = courses.find(c => c.courseName === courseName)
      if (result === undefined) {
        currentCourses.push({courseName: courseName, category: undefined, units: 0} as Course)
      } else {
        currentCourses.push(result)
      }
    }
  })

  return currentCourses;
}