import {type Course} from './getCompletedCourses'

/**
 * カテゴリーごとの単位数をカウントする
 */
export async function countUnits(completedCourses: Course[], currentCourses: Course[]): Promise<Record<string, string>> {
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
  
  // 結果を文字列形式で作成
  const sotsugyoResponse = await fetch('human_science_2024_sotsugyo.json');
  const requiredUnits: Record<string, number> = await sotsugyoResponse.json();
  
  const result: Record<string, number> = {};
  for (const key in requiredUnits) {
    result[key] = 0;
  }
  result['その他'] = 0
  
  for (const category in completedUnitCounts) {
    let matchedCategoryKey: string | undefined = undefined;
    for (const categoryKey in requiredUnits) {
      if (categoryKey.split(',').includes(category)) {
        const allocatableUnits = Math.min(requiredUnits[categoryKey] - result[categoryKey], completedUnitCounts[category]);
        result[categoryKey] += allocatableUnits
        completedUnitCounts[category] -= allocatableUnits;

        matchedCategoryKey = categoryKey
      }

      if (completedUnitCounts[category] === 0) {
        break
      }
    }

    if (matchedCategoryKey && completedUnitCounts[category] !== 0) {
      result[matchedCategoryKey] += completedUnitCounts[category]
    } else if (matchedCategoryKey === undefined && completedUnitCounts[category] !== 0) {
      result['その他'] += completedUnitCounts[category]
    }
  }

  const futureResult: Record<string, number> = structuredClone(result)

  for (const category in currentUnitCounts) {
    let matchedCategoryKey: string | undefined = undefined;
    for (const categoryKey in requiredUnits) {
      if (categoryKey.split(',').includes(category)) {
        const allocatableUnits = Math.min(requiredUnits[categoryKey] - futureResult[categoryKey], currentUnitCounts[category]);
        futureResult[categoryKey] += allocatableUnits
        currentUnitCounts[category] -= allocatableUnits;

        matchedCategoryKey = categoryKey
      }

      if (currentUnitCounts[category] === 0) {
        break
      }
    }

    if (matchedCategoryKey && currentUnitCounts[category] !== 0) {
      futureResult[matchedCategoryKey] += currentUnitCounts[category]
    }
  }

  if (currentUnitCounts['その他']) {
    console.log(currentUnitCounts['その他'])
    futureResult['その他'] += currentUnitCounts['その他']
  }

  const formattedResult: Record<string, string> = {};
  for (const categoryKey in result) {
    const displayName = categoryKey.split(',').at(-1)
    if (displayName) {
      if (displayName === 'その他') {
        formattedResult[displayName] = `${result[categoryKey]}(${futureResult[categoryKey]})`
      } else {
        formattedResult[displayName] = `${result[categoryKey]}(${futureResult[categoryKey]}) / ${requiredUnits[categoryKey]}`
      }
    }
  }
  
  return formattedResult;
}