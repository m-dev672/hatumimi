import {type Course} from './getCompletedCourses'

/**
 * 
 */
export async function getCurrentCourses(): Promise<Course[]> {
  const response = await fetch('/campusweb/campussquare.do?_flowId=AAW0001000-flow&link=menu-link-mf-135117')

  const html = await response.text()

  const parser = new DOMParser();
  const document = parser.parseFromString(html, 'text/html');

  const currentMonth = new Date().getMonth();
  const terms = 3 <= currentMonth && currentMonth <= 8 ? ['前学期', '集中', '通年'] : ['後学期', '通年'];

  const attendancesTable = Array.from(document.querySelectorAll('tbody')).at(-2);
  //console.log(attendancesTable)

  const kyoyoResponse = await fetch('human_science_2024_kyoyo.json');
  const senkoResponse = await fetch('human_science_2024_senko.json');
  const courses: Course[] = [...(await kyoyoResponse.json()), ...(await senkoResponse.json())]
  const currentCourses: Course[] = []

  Array.from(attendancesTable!.rows).forEach((row) => {
    const term = row.children[1].textContent.trim()
    if (terms.includes(term)) {
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