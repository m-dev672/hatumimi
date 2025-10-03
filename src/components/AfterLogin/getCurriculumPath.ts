/**
 * 現在履修中の授業を学内ポータルの出欠状況参照ページから取得する
 */
export async function getCurriculumPath() {
  const portfolioPage = await fetch('/campusweb/campussquare.do?_flowId=CHW0001000-flow&link=menu-link-mf-1350737')

  const portfolioPageHtml = await portfolioPage.text()

  const parser = new DOMParser();
  const document = parser.parseFromString(portfolioPageHtml, 'text/html');

  const tables = Array.from(document.querySelectorAll('tbody'));
  const studentInfoTable = tables.at(3)
  const registrationInfoTable = tables.at(5)

  const affiliationStr = studentInfoTable?.children[2].children[1].textContent
  if (affiliationStr === undefined) return "";

  let match = affiliationStr.match(/^(.+?学部)\s*(.+?学科)\s*(.*)$/u)
  if (match  === null || match.length < 4) return "";
  const affiliation = match.slice(1);

  const joinDateStr = registrationInfoTable?.children[1].children[3].textContent
  if (joinDateStr === undefined) return "";

  const joinYear = Number(joinDateStr.split('年')[0]);

  console.log(affiliation)
  console.log(joinYear)

  const curriculumMappingJsonResponse = await fetch('/curriculum/curriculum_mapping.json');
  const curriculumMappingJsonContent = await curriculumMappingJsonResponse.json()

  let curriculumPath = ""
  for (let i = 1; i < 3; i++) {
    const searchQuery = affiliation.slice(0, i).join(',')
    if (curriculumMappingJsonContent[searchQuery]) {
      const curriculumMap = curriculumMappingJsonContent[searchQuery]
      const years = Object.keys(curriculumMap).map(Number)
      const nearbyYear = Math.min(...years.filter(n => n > joinYear))

      curriculumPath = curriculumMap[`${nearbyYear}`]

      break
    }
  }

  return curriculumPath
}