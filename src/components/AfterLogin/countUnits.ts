import {type Course} from './getCompletedCourses'

export async function countUnits(completedCourses: Course[], currentCourses: Course[]): Promise<{
  units: Record<string, string[]>
  categoryCourses: Record<string, {completed: Course[], current: Course[]}>
  otherCourses: {completed: Course[], current: Course[]}
}> {
  const sotsugyoResponse = await fetch('human_science_2024_sotsugyo.json')
  const requiredUnits: Record<string, number> = await sotsugyoResponse.json()
  
  const ignoreResponse = await fetch('ignore.txt')
  const ignoreText = await ignoreResponse.text()
  const ignorePatterns = ignoreText.split('\n').filter(line => line.trim())
  
  const cleanCategory = (category: string): string => 
    ignorePatterns.reduce((cleaned, pattern) => 
      pattern.trim() ? cleaned.replace(pattern.trim(), '') : cleaned, category
    ).trim()
  
  const result: Record<string, number> = { ...Object.fromEntries(Object.keys(requiredUnits).map(key => [key, 0])), 'その他': 0 }
  const categoryCompletedCourses: Record<string, Course[]> = Object.fromEntries(Object.keys(requiredUnits).map(key => [key, []]))
  const categoryCurrentCourses: Record<string, Course[]> = Object.fromEntries(Object.keys(requiredUnits).map(key => [key, []]))
  const completedOtherCourses: Course[] = []
  
  const allocateCourse = (course: Course, isCompleted: boolean) => {
    if (!course.category) {
      const units = course.units || 1
      result['その他'] += units
      if (isCompleted) completedOtherCourses.push(course)
      else currentOtherCourses.push(course)
      return
    }

    const cleaned = cleanCategory(course.category)
    const matchedKey = Object.keys(requiredUnits).find(key => key.split(',').includes(cleaned))
    
    if (matchedKey) {
      const units = course.units || 1
      const target = isCompleted ? result : futureResult
      const courses = isCompleted ? categoryCompletedCourses : categoryCurrentCourses
      
      if (target[matchedKey] < requiredUnits[matchedKey]) {
        target[matchedKey] += Math.min(requiredUnits[matchedKey] - target[matchedKey], units)
      } else {
        target[matchedKey] += units
      }
      courses[matchedKey].push(course)
    } else {
      const units = course.units || 1
      const target = isCompleted ? result : futureResult
      target['その他'] += units
      if (isCompleted) completedOtherCourses.push(course)
      else currentOtherCourses.push(course)
    }
  }

  completedCourses.forEach(course => allocateCourse(course, true))

  const futureResult = structuredClone(result)
  const currentOtherCourses: Course[] = []
  
  currentCourses.forEach(course => allocateCourse(course, false))

  const units: Record<string, string[]> = {}
  const categoryCourses: Record<string, {completed: Course[], current: Course[]}> = {}
  
  Object.keys(result).forEach(categoryKey => {
    const displayName = categoryKey.split(',').at(-1)
    if (!displayName) return
    
    units[displayName] = displayName === 'その他' 
      ? [`${result[categoryKey]}`, `(${futureResult[categoryKey]})`]
      : [`${result[categoryKey]}`, `(${futureResult[categoryKey]})`, " / ", `${requiredUnits[categoryKey]}`]
    
    if (displayName !== 'その他') {
      categoryCourses[displayName] = {
        completed: categoryCompletedCourses[categoryKey],
        current: categoryCurrentCourses[categoryKey]
      }
    }
  })
  
  return {
    units,
    categoryCourses,
    otherCourses: { completed: completedOtherCourses, current: currentOtherCourses }
  }
}