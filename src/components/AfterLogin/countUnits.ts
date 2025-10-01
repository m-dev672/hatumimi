import {type Course} from './getCompletedCourses'

/**
 * コースを必要単位数に割り当てる
 */
function allocateCoursesToCategories(
  courseUnitCounts: Record<string, number>,
  requiredUnits: Record<string, number>,
  result: Record<string, number>
): void {
  for (const category in courseUnitCounts) {
    let matchedCategoryKey: string | undefined = undefined;
    for (const categoryKey in requiredUnits) {
      if (categoryKey.split(',').includes(category)) {
        const allocatableUnits = Math.min(requiredUnits[categoryKey] - result[categoryKey], courseUnitCounts[category]);
        result[categoryKey] += allocatableUnits;
        courseUnitCounts[category] -= allocatableUnits;

        matchedCategoryKey = categoryKey;
      }

      if (courseUnitCounts[category] === 0) {
        break;
      }
    }

    if (matchedCategoryKey && courseUnitCounts[category] !== 0) {
      result[matchedCategoryKey] += courseUnitCounts[category];
    } else if (matchedCategoryKey === undefined && courseUnitCounts[category] !== 0) {
      result['その他'] += courseUnitCounts[category];
    }
  }
}

/**
 * カテゴリーごとの単位数をカウントする
 */
export async function countUnits(completedCourses: Course[], currentCourses: Course[]): Promise<Record<string, string[] | Course[]>> {
  const completedUnitCounts: Record<string, number> = {};
  const currentUnitCounts: Record<string, number> = {};
  
  // 取得済み単位数をカウント
  completedCourses.forEach(course => {
    const category = course.category || 'その他';
    completedUnitCounts[category] = (completedUnitCounts[category] || 0) + (course.category ? course.units : 1);
  });
  
  // 履修中の単位数をカウント
  currentCourses.forEach(course => {
    const category = course.category || 'その他';
    currentUnitCounts[category] = (currentUnitCounts[category] || 0) + (course.category ? course.units : 1);
  });
  
  const sotsugyoResponse = await fetch('human_science_2024_sotsugyo.json');
  const requiredUnits: Record<string, number> = await sotsugyoResponse.json();
  
  const result: Record<string, number> = {};
  for (const key in requiredUnits) {
    result[key] = 0;
  }
  result['その他'] = 0
  
  allocateCoursesToCategories(completedUnitCounts, requiredUnits, result);

  const futureResult: Record<string, number> = structuredClone(result)

  allocateCoursesToCategories(currentUnitCounts, requiredUnits, futureResult);

  const formattedResult: Record<string, string[] | Course[]> = {};
  
  // その他科目を収集
  const otherCourses: Course[] = [];
  completedCourses.forEach(course => {
    if (!course.category) {
      otherCourses.push(course);
    }
  });
  currentCourses.forEach(course => {
    if (!course.category) {
      otherCourses.push(course);
    }
  });
  
  for (const categoryKey in result) {
    const displayName = categoryKey.split(',').at(-1)
    if (displayName) {
      if (displayName === 'その他') {
        formattedResult[displayName] = [`${result[categoryKey]}`, `(${futureResult[categoryKey]})`]
        formattedResult[`${displayName}_courses`] = otherCourses
      } else {
        formattedResult[displayName] = [`${result[categoryKey]}`, `(${futureResult[categoryKey]})`, " / ", `${requiredUnits[categoryKey]}`]
      }
    }
  }
  
  return formattedResult;
}