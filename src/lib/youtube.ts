import axios from 'axios';

export type SearchResult = {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  searchQuery?: string;
};

// Public CORS proxy to handle YouTube scraping in the browser
const CORS_PROXY = 'https://corsproxy.io/?url=';

export const searchMusic = async (query: string): Promise<SearchResult[]> => {
  try {
    const response = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=20`);
    
    return response.data.results.map((item: any, index: number) => ({
      id: item.trackId?.toString() || `${item.trackName}-${index}`,
      title: item.trackName,
      artist: item.artistName,
      thumbnail: item.artworkUrl100.replace('100x100', '600x600'),
      searchQuery: `${item.trackName} ${item.artistName} official audio`,
    }));
  } catch (error) {
    console.error("Music search error:", error);
    return [];
  }
};

export const resolveYouTubeId = async (title: string, artist: string): Promise<string | null> => {
  try {
    const searchQuery = `${title} ${artist} official audio`;
    const searchUrl = `${CORS_PROXY}${encodeURIComponent(`https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`)}`;
    
    const response = await axios.get(searchUrl, {
      timeout: 10000
    });

    // Extract the first videoId from the search results HTML
    const videoIdMatch = response.data.match(/"videoId":"([^"]+)"/);
    return videoIdMatch ? videoIdMatch[1] : null;
  } catch (e) {
    console.error("YouTube resolution failed:", e);
    return null;
  }
};
