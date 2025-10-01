import {type Course} from './getCompletedCourses'

/**
 * カテゴリーごとの単位数をカウントする
 */
export function countUnits(courses: Course[]): Record<string, number> {
  const unitCounts: Record<string, number> = {};
  
  courses.forEach(course => {
    const category = course.category || 'その他 (科目数)';
    unitCounts[category] = (unitCounts[category] || 0) + (course.category ? course.units : 1);
  });
  
  return unitCounts;
}