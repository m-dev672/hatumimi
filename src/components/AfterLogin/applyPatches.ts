import { type Course } from './getCompletedCourses';

/**
 * パッチデータを読み込んでコースリストに適用する
 */
export async function applyPatches(courses: Course[], curriculumPath: string): Promise<Course[]> {
  let patchData: Course[] = [];
  
  try {
    const patchResponse = await fetch(`${curriculumPath}/patches.json`);
    if (patchResponse.ok) {
      const patchFile = await patchResponse.json();
      patchData = patchFile.flatMap((p: any) => p.patch);
    } else {
      console.warn('patches.json not found, proceeding without patches');
    }
  } catch (error) {
    console.warn('patches.json not found, proceeding without patches');
  }

  return courses.map(course => {
    const patch = patchData.find(p => p.courseName === course.courseName);
    if (patch) {
      return {
        courseName: course.courseName,
        category: patch.category || course.category,
        units: patch.units || course.units
      };
    }
    return course;
  });
}