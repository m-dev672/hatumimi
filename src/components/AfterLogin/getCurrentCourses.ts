import {type Course} from './getCompletedCourses'

/**
 * 現在履修中の授業を学内ポータルの出欠状況参照ページから取得する
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
    const term = row.children[1]!.textContent!.trim()
    if (currentTerms.includes(term)) {
      const fullCourseName = row.children[3].textContent!.trim()
      const courseNameParts = fullCourseName.split('／')
      
      let result: Course | undefined = undefined
      
      // 前半部分でマッチを試す
      const firstPart = courseNameParts[0]?.trim()
      if (firstPart) {
        result = courses.find(c => c.courseName === firstPart)
      }
      
      // 前半でマッチしなかった場合、後半部分でマッチを試す
      if (result === undefined && courseNameParts.length > 1) {
        const secondPart = courseNameParts[1]?.trim()
        if (secondPart) {
          result = courses.find(c => c.courseName === secondPart)
        }
      }
      
      if (result === undefined) {
        currentCourses.push({courseName: firstPart || fullCourseName, category: undefined, units: undefined} as Course)
      } else {
        currentCourses.push(result)
      }
    }
  })

  return currentCourses;
}