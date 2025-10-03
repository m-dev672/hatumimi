import {type Course} from './getCompletedCourses'

export async function countUnits(completedCourses: Course[], currentCourses: Course[], curriculumPath: string): Promise<{
  units: Record<string, string[]>
  categoryCourses: Record<string, {completed: Course[], current: Course[]}>
}> {
  const requiredUnits = await fetch(`${curriculumPath}/sotsugyo.json`).then(r => r.json())
  
  const keys = [...Object.keys(requiredUnits), 'その他']
  const result = Object.fromEntries(keys.map(k => [k, 0]))
  const completed = Object.fromEntries(keys.map(k => [k, []]))
  const current = Object.fromEntries(keys.map(k => [k, []]))
  
  const allocate = (courses: Course[], targetResult: Record<string, number>, targetCourses: Record<string, Course[]>) => {
    courses.forEach(course => {
      const units = course.units || 1
      let allocated = false
      let matched: string | undefined

      if (course.category) {
        for (const key in requiredUnits) {
          if (key.split(',').includes(course.category)) {
            matched = key
            if (targetResult[key] < requiredUnits[key]) {
              targetResult[key] += Math.min(requiredUnits[key] - targetResult[key], units)
              targetCourses[key].push(course)
              allocated = true
              break
            }
          }
        }

        if (!allocated && matched) {
          targetResult[matched] += units
          targetCourses[matched].push(course)
          allocated = true
        }
      }

      if (!allocated) {
        targetResult['その他'] += units
        targetCourses['その他'].push(course)
      }
    })
  }

  allocate(completedCourses, result, completed)
  const futureResult = structuredClone(result)
  allocate(currentCourses, futureResult, current)

  return {
    units: Object.fromEntries(
      Object.keys(result).flatMap(key => {
        const name = key.split(',').at(-1)
        return name ? [[name, name === 'その他' 
          ? [`${result[key]}`, `(${futureResult[key]})`]
          : [`${result[key]}`, `(${futureResult[key]})`, ' / ', `${requiredUnits[key]}`]
        ]] : []
      })
    ),
    categoryCourses: Object.fromEntries(
      Object.keys(result).flatMap(key => {
        const name = key.split(',').at(-1)
        return name ? [[name, { completed: completed[key], current: current[key] }]] : []
      })
    )
  }
  
}