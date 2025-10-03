import {type Course} from './getCompletedCourses'

export async function countUnits(completedCourses: Course[], currentCourses: Course[]): Promise<{
  units: Record<string, string[]>
  categoryCourses: Record<string, {completed: Course[], current: Course[]}>
  otherCourses: {completed: Course[], current: Course[]}
}> {
  const [requiredUnits, ignorePatterns] = await Promise.all([
    fetch('human_science_2024_sotsugyo.json').then(r => r.json()),
    fetch('ignore.txt').then(r => r.text()).then(t => t.split('\n').filter(line => line.trim()))
  ])
  
  const cleanCategory = (category: string): string => 
    ignorePatterns.reduce((cleaned, pattern) => 
      pattern.trim() ? cleaned.replace(pattern.trim(), '') : cleaned, category
    ).trim()
  
  const categoryKeys = Object.keys(requiredUnits)
  const result: Record<string, number> = { ...Object.fromEntries(categoryKeys.map(key => [key, 0])), 'その他': 0 }
  const categoryCompletedCourses: Record<string, Course[]> = Object.fromEntries(categoryKeys.map(key => [key, []]))
  const categoryCurrentCourses: Record<string, Course[]> = Object.fromEntries(categoryKeys.map(key => [key, []]))
  const completedOtherCourses: Course[] = []
  
  const allocateCourses = (courses: Course[], targetResult: Record<string, number>, targetCourses: Record<string, Course[]>, otherCourses: Course[]) => {
    for (const course of courses) {
      const courseUnits = course.units || 1
      let allocated = false
      let matchedCategoryKey: string | undefined

      if (course.category) {
        const cleaned = cleanCategory(course.category)
        
        for (const categoryKey in requiredUnits) {
          if (categoryKey.split(',').includes(cleaned)) {
            matchedCategoryKey = categoryKey
            if (targetResult[categoryKey] < requiredUnits[categoryKey]) {
              targetResult[categoryKey] += Math.min(requiredUnits[categoryKey] - targetResult[categoryKey], courseUnits)
              targetCourses[categoryKey].push(course)
              allocated = true
              break
            }
          }
        }

        if (!allocated && matchedCategoryKey) {
          targetResult[matchedCategoryKey] += courseUnits
          targetCourses[matchedCategoryKey].push(course)
          allocated = true
        }
      }

      if (!allocated) {
        targetResult['その他'] += courseUnits
        otherCourses.push(course)
      }
    }
  }

  allocateCourses(completedCourses, result, categoryCompletedCourses, completedOtherCourses)
  
  const futureResult = structuredClone(result)
  const currentOtherCourses: Course[] = []
  allocateCourses(currentCourses, futureResult, categoryCurrentCourses, currentOtherCourses)

  const units: Record<string, string[]> = {}
  const categoryCourses: Record<string, {completed: Course[], current: Course[]}> = {}
  
  for (const categoryKey of Object.keys(result)) {
    const displayName = categoryKey.split(',').at(-1)
    if (!displayName) continue
    
    const isOther = displayName === 'その他'
    units[displayName] = isOther 
      ? [`${result[categoryKey]}`, `(${futureResult[categoryKey]})`]
      : [`${result[categoryKey]}`, `(${futureResult[categoryKey]})`, " / ", `${requiredUnits[categoryKey]}`]
    
    if (!isOther) {
      categoryCourses[displayName] = {
        completed: categoryCompletedCourses[categoryKey],
        current: categoryCurrentCourses[categoryKey]
      }
    }
  }
  
  return { units, categoryCourses, otherCourses: { completed: completedOtherCourses, current: currentOtherCourses } }
}