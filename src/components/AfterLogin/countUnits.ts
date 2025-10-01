import {type Course} from './getCompletedCourses'

/**
 * 科目を直接必要単位数に割り当てる
 */
function allocateCoursesToRequiredUnits(
  courses: Course[],
  requiredUnits: Record<string, number>,
  result: Record<string, number>,
  otherCourses: Course[]
): void {
  for (const course of courses) {
    const category = course.category;
    let allocated = false;
    let matchedCategoryKey: string | undefined = undefined;

    if (category) {
      // カテゴリーがある場合、対応する必要単位に割り当てを試す
      for (const categoryKey in requiredUnits) {
        if (categoryKey.split(',').includes(category)) {
          matchedCategoryKey = categoryKey;
          if (result[categoryKey] < requiredUnits[categoryKey]) {
            const allocatableUnits = Math.min(requiredUnits[categoryKey] - result[categoryKey], course.units);
            result[categoryKey] += allocatableUnits;
            allocated = true;
            break;
          }
        }
      }

      // 対応するカテゴリーがあったが満たされていた場合、そのカテゴリーに超過算入
      if (!allocated && matchedCategoryKey) {
        result[matchedCategoryKey] += course.units;
        allocated = true;
      }
    }

    // 割り当てできなかった場合は「その他」に追加
    if (!allocated) {
      result['その他'] += course.units;
      otherCourses.push(course);
    }
  }
}

/**
 * カテゴリーごとの単位数をカウントする
 */
export async function countUnits(completedCourses: Course[], currentCourses: Course[]): Promise<Record<string, string[] | Course[]>> {
  const sotsugyoResponse = await fetch('human_science_2024_sotsugyo.json');
  const requiredUnits: Record<string, number> = await sotsugyoResponse.json();
  
  const result: Record<string, number> = {};
  for (const key in requiredUnits) {
    result[key] = 0;
  }
  result['その他'] = 0;
  
  // 取得済み科目の「その他」科目を収集
  const completedOtherCourses: Course[] = [];
  allocateCoursesToRequiredUnits(completedCourses, requiredUnits, result, completedOtherCourses);

  const futureResult: Record<string, number> = structuredClone(result);
  
  // 履修中科目の「その他」科目を収集
  const currentOtherCourses: Course[] = [];
  allocateCoursesToRequiredUnits(currentCourses, requiredUnits, futureResult, currentOtherCourses);

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
      }
    }
  }
  
  return formattedResult;
}