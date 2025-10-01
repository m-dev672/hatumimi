import {type Course} from './getCompletedCourses'

/**
 * カテゴリーごとの単位数をカウントする
 * @param completedCourses 取得済みの科目
 * @param currentCourses 履修中の科目
 * @returns 現在までに取得した単位数（今季が終了した際に取得予定の単位数 + 現在までに取得した単位数）
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
    let lastCategories: string | undefined = undefined;
    for (const categories in requiredUnits) {
      if (categories.split(',').includes(category)) {
        const aaa = Math.min(requiredUnits[categories] - result[categories], completedUnitCounts[category]);
        result[categories] += aaa
        completedUnitCounts[category] -= aaa;

        lastCategories = categories
      }

      if (completedUnitCounts[category] === 0) {
        break
      }
    }

    if (lastCategories && completedUnitCounts[category] !== 0) {
      result[lastCategories] += completedUnitCounts[category]
    } else if (lastCategories === undefined && completedUnitCounts[category] !== 0) {
      result['その他'] += completedUnitCounts[category]
    }
  }

  const willResult: Record<string, number> = structuredClone(result)

  for (const category in currentUnitCounts) {
    let lastCategories: string | undefined = undefined;
    for (const categories in requiredUnits) {
      if (categories.split(',').includes(category)) {
        const aaa = Math.min(requiredUnits[categories] - willResult[categories], currentUnitCounts[category]);
        willResult[categories] += aaa
        currentUnitCounts[category] -= aaa;

        lastCategories = categories
      }

      if (currentUnitCounts[category] === 0) {
        break
      }
    }

    if (lastCategories && currentUnitCounts[category] !== 0) {
      willResult[lastCategories] += currentUnitCounts[category]
    }
  }

  if (currentUnitCounts['その他']) {
    console.log(currentUnitCounts['その他'])
    willResult['その他'] += currentUnitCounts['その他']
  }

  const trueResult: Record<string, string> = {};
  for (const categories in result) {
    const alias = categories.split(',').at(-1)
    if (alias) {
      if (alias === 'その他') {
        trueResult[alias] = `${result[categories]}(${willResult[categories]})`
      } else {
        trueResult[alias] = `${result[categories]}(${willResult[categories]}) / ${requiredUnits[categories]}`
      }
    }
  }
  
  return trueResult;
}