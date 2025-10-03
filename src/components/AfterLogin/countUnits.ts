import {type Course} from './getCompletedCourses'


/**
 * カテゴリーごとの単位数をカウントする
 */
export async function countUnits(completedCourses: Course[], currentCourses: Course[]): Promise<{
  units: Record<string, string[]>;
  categoryCourses: Record<string, {completed: Course[], current: Course[]}>;
  otherCourses: {completed: Course[], current: Course[]};
}> {
  const sotsugyoResponse = await fetch('human_science_2024_sotsugyo.json');
  const requiredUnits: Record<string, number> = await sotsugyoResponse.json();
  
  // ignore.txtをfetchして除外パターンを取得
  const ignoreResponse = await fetch('ignore.txt');
  const ignoreText = await ignoreResponse.text();
  const ignorePatterns = ignoreText.split('\n').filter(line => line.trim() !== '');
  
  // カテゴリ名をクリーンアップする関数
  const cleanCategory = (category: string): string => {
    let cleaned = category;
    for (const pattern of ignorePatterns) {
      if (pattern.trim() !== '') {
        cleaned = cleaned.replace(pattern.trim(), '');
      }
    }
    return cleaned.trim();
  };
  
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
    let matchedCategoryKey: string | undefined = undefined;

    if (category) {
      // カテゴリ名をクリーンアップしてからマッチング
      const cleaned = cleanCategory(category);
      
      // カテゴリーがある場合、対応する必要単位に割り当てを試す
      for (const categoryKey in requiredUnits) {
        if (categoryKey.split(',').includes(cleaned)) {
          matchedCategoryKey = categoryKey;
          if (result[categoryKey] < requiredUnits[categoryKey]) {
            const courseUnits = course.units || 1;
            const allocatableUnits = Math.min(requiredUnits[categoryKey] - result[categoryKey], courseUnits);
            result[categoryKey] += allocatableUnits;
            categoryCompletedCourses[categoryKey].push(course);
            allocated = true;
            break;
          }
        }
      }

      // 対応するカテゴリーがあったが満たされていた場合、そのカテゴリーに超過算入
      if (!allocated && matchedCategoryKey) {
        const courseUnits = course.units || 1;
        result[matchedCategoryKey] += courseUnits;
        categoryCompletedCourses[matchedCategoryKey].push(course);
        allocated = true;
      }
    }

    // 割り当てできなかった場合は「その他」に追加
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
    let matchedCategoryKey: string | undefined = undefined;

    if (category) {
      // カテゴリ名をクリーンアップしてからマッチング
      const cleaned = cleanCategory(category);
      
      // カテゴリーがある場合、対応する必要単位に割り当てを試す
      for (const categoryKey in requiredUnits) {
        if (categoryKey.split(',').includes(cleaned)) {
          matchedCategoryKey = categoryKey;
          if (futureResult[categoryKey] < requiredUnits[categoryKey]) {
            const courseUnits = course.units || 1;
            const allocatableUnits = Math.min(requiredUnits[categoryKey] - futureResult[categoryKey], courseUnits);
            futureResult[categoryKey] += allocatableUnits;
            categoryCurrentCourses[categoryKey].push(course);
            allocated = true;
            break;
          }
        }
      }

      // 対応するカテゴリーがあったが満たされていた場合、そのカテゴリーに超過算入
      if (!allocated && matchedCategoryKey) {
        const courseUnits = course.units || 1;
        futureResult[matchedCategoryKey] += courseUnits;
        categoryCurrentCourses[matchedCategoryKey].push(course);
        allocated = true;
      }
    }

    // 割り当てできなかった場合は「その他」に追加
    if (!allocated) {
      const courseUnits = course.units || 1;
      futureResult['その他'] += courseUnits;
      currentOtherCourses.push(course);
    }
  }

  const units: Record<string, string[]> = {};
  const categoryCourses: Record<string, {completed: Course[], current: Course[]}> = {};
  
  for (const categoryKey in result) {
    const displayName = categoryKey.split(',').at(-1)
    if (displayName) {
      if (displayName === 'その他') {
        units[displayName] = [`${result[categoryKey]}`, `(${futureResult[categoryKey]})`]
      } else {
        units[displayName] = [`${result[categoryKey]}`, `(${futureResult[categoryKey]})`, " / ", `${requiredUnits[categoryKey]}`]
        categoryCourses[displayName] = {
          completed: categoryCompletedCourses[categoryKey],
          current: categoryCurrentCourses[categoryKey]
        }
      }
    }
  }
  
  return {
    units,
    categoryCourses,
    otherCourses: {
      completed: completedOtherCourses,
      current: currentOtherCourses
    }
  };
}