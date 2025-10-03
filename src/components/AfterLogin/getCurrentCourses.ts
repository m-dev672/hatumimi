import {type Course} from './getCompletedCourses'
import { applyPatches } from './applyPatches';

/**
 * 現在履修中の授業を学内ポータルの出欠状況参照ページから取得する
 */
export async function getCurrentCourses(curriculumPath: string): Promise<Course[]> {
  const attendancesPage = await fetch('/campusweb/campussquare.do?_flowId=AAW0001000-flow&link=menu-link-mf-135117')

  const attendancesPageHtml = await attendancesPage.text()

  const parser = new DOMParser();
  const document = parser.parseFromString(attendancesPageHtml, 'text/html');

  const currentMonth = new Date().getMonth();
  const currentTerms = 3 <= currentMonth && currentMonth <= 8 ? ['前学期', '集中', '通年'] : ['後学期', '通年'];

  const attendancesTable = Array.from(document.querySelectorAll('tbody')).at(-2);

  const [kyoyoJsonContent, gaikokugoJsonContent, senkoJsonContent] = await Promise.all([
    fetch(`${curriculumPath}/kyoyo.json`).then(res => res.json()),
    fetch(`${curriculumPath}/gaikokugo.json`).then(res => res.json()),
    fetch(`${curriculumPath}/senko.json`).then(res => res.json())
  ])

  const courses: Course[] = [...kyoyoJsonContent, ...gaikokugoJsonContent, ...senkoJsonContent]
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
      
      // 全体でマッチを試す
      if (result === undefined) {
        result = courses.find(c => c.courseName === fullCourseName)
      }
      
      // 全体でもマッチしなかった場合、全角括弧より前の部分でマッチを試す
      if (result === undefined && fullCourseName.includes('（')) {
        const beforeBracket = fullCourseName.split('（')[0]?.trim()
        if (beforeBracket) {
          result = courses.find(c => c.courseName === beforeBracket)
        }
      }
      
      if (result === undefined) {
        currentCourses.push({courseName: firstPart || fullCourseName, category: undefined, units: undefined} as Course)
      } else {
        currentCourses.push(result)
      }
    }
  })

  // パッチを適用
  return await applyPatches(currentCourses, curriculumPath);
}