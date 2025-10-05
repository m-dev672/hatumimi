import { getKeijiGenres } from './sqlDatabase';
import { fetchGenreKeiji } from './keijiDataExtractor';

export type { KeijiGenre } from './sqlDatabase';

export const updateKeijiData = async (): Promise<void> => {
  try {
    console.log('Starting keiji data update...');
    
    const [genres, response] = await Promise.all([
      getKeijiGenres(),
      fetch('/campusweb/campussquare.do?_flowId=KJW0001100-flow&link=menu-link-mf-135062')
    ]);
    
    const flowKey = new URL(response.url).searchParams.get('_flowExecutionKey');
    if (flowKey) {
      await Promise.all(genres.map(genre => fetchGenreKeiji(genre, flowKey)));
      console.log('✅ Keiji data update completed successfully!');
    } else {
      console.warn('⚠️ Could not retrieve flow key - update skipped');
    }
  } catch (error) {
    console.error('❌ Failed to update keiji data:', error);
  }
};