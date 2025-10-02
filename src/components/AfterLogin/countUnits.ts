import {type Course} from './getCompletedCourses'


/**
 * カテゴリーごとの単位数をカウントする
 */
export async function countUnits(completedCourses: Course[], currentCourses: Course[]): Promise<Record<string, string[] | Course[]>> {
  const sotsugyoResponse = await fetch('human_science_2024_sotsugyo.json');
  const requiredUnits: Record<string, number> = await sotsugyoResponse.json();
  
  const result: Record<string, number> = {};
  const categoryCompletedCourses: Record<string, Course[]> = {};
  const categoryCurrentCourses: Record<string, Course[]> = {};
  
  for (const key in requiredUnits) {
    result[key] = 0;
    categoryCompletedCourses[key] = [];
    categoryCurrentCourses[key] = [];
  }
  result['その他'] = 0;
  const completedOtherCourses: Course[] = [];
  
  // 取得済み科目を各カテゴリに分類
  for (const course of completedCourses) {
    const category = course.category;
    let allocated = false;
    
    if (category) {
      for (const categoryKey in requiredUnits) {
        if (categoryKey.split(',').includes(category)) {
          categoryCompletedCourses[categoryKey].push(course);
          const courseUnits = course.units || 1;
          result[categoryKey] += courseUnits;
          allocated = true;
          break;
        }
      }
    }
    
    if (!allocated) {
      const courseUnits = course.units || 1;
      result['その他'] += courseUnits;
      completedOtherCourses.push(course);
    }
  }

  const futureResult: Record<string, number> = structuredClone(result);
  const currentOtherCourses: Course[] = [];
  
  // 履修中科目を各カテゴリに分類
  for (const course of currentCourses) {
    const category = course.category;
    let allocated = false;
    
    if (category) {
      for (const categoryKey in requiredUnits) {
        if (categoryKey.split(',').includes(category)) {
          categoryCurrentCourses[categoryKey].push(course);
          const courseUnits = course.units || 1;
          futureResult[categoryKey] += courseUnits;
          allocated = true;
          break;
        }
      }
    }
    
    if (!allocated) {
      const courseUnits = course.units || 1;
      futureResult['その他'] += courseUnits;
      currentOtherCourses.push(course);
    }
  }

  const formattedResult: Record<string, string[] | Course[]> = {};
  
  for (const categoryKey in result) {
    const displayName = categoryKey.split(',').at(-1)
    if (displayName) {
      if (displayName === 'その他') {
        formattedResult[displayName] = [`${result[categoryKey]}`, `(${futureResult[categoryKey]})`]
        formattedResult['other_completed_courses'] = completedOtherCourses
        formattedResult['other_current_courses'] = currentOtherCourses
      } else {
        formattedResult[displayName] = [`${result[categoryKey]}`, `(${futureResult[categoryKey]})`, " / ", `${requiredUnits[categoryKey]}`]
        formattedResult[`${displayName}_completed_courses`] = categoryCompletedCourses[categoryKey]
        formattedResult[`${displayName}_current_courses`] = categoryCurrentCourses[categoryKey]
      }
    }
  }
  
  return formattedResult;
}