import {type Course} from './getCompletedCourses'

export interface CategoryData {
  category: string
  currentUnits: number
  futureUnits: number
  requiredUnits?: number
  completed: boolean
  courses: {
    completed: Course[]
    current: Course[]
  }
}

export async function countUnits(completedCourses: Course[], currentCourses: Course[], curriculumPath: string): Promise<CategoryData[]> {
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

  return Object.keys(result).flatMap(key => {
    const name = key.split(',').at(-1)
    if (!name) return []
    
    const currentUnits = result[key]
    const futureUnits = futureResult[key]
    const required = name === 'その他' ? undefined : requiredUnits[key]
    const isCompleted = required !== undefined && currentUnits >= required
    
    return [{
      category: name,
      currentUnits,
      futureUnits,
      requiredUnits: required,
      completed: isCompleted,
      courses: {
        completed: completed[key],
        current: current[key]
      }
    }]
  })
  
}