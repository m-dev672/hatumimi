import { getKeijiGenres } from './sqlDatabase';
import { fetchGenreKeiji } from './keijiDataExtractor';

export type { KeijiGenre } from './sqlDatabase';

export const updateKeijiData = async (): Promise<void> => {
  try {
    const [genres, response] = await Promise.all([
      getKeijiGenres(),
      fetch('/campusweb/campussquare.do?_flowId=KJW0001100-flow&link=menu-link-mf-135062')
    ]);
    
    const flowKey = new URL(response.url).searchParams.get('_flowExecutionKey');
    if (flowKey) {
      await Promise.all(genres.map(genre => fetchGenreKeiji(genre, flowKey)));
    }
  } catch (error) {
    console.error('Failed to fetch campus keiji:', error);
  }
};