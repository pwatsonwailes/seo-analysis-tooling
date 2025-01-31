import { UrlData } from '../types';

export function parseUrlData(line: string): UrlData | null {
  try {
    const [urlStr, searchVolumeStr] = line.split('\t').map(s => s.trim());
    const searchVolume = parseInt(searchVolumeStr, 10);
    
    if (!urlStr || isNaN(searchVolume)) {
      return null;
    }

    const url = new URL(urlStr);
    const query = url.searchParams.get('q') || '';
    const domain = url.hostname;
    const language = url.searchParams.get('hl') || 'en';

    return {
      url: urlStr,
      searchVolume,
      query,
      domain,
      language
    };
  } catch (error) {
    console.error('Error parsing URL data:', error);
    return null;
  }
}