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
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    // Try multiple patterns to extract video ID
    const patterns = [
      /"videoId":"([^"]+)"/g,
      /\/watch\?v=([^"&]+)/g,
      /"url":"\/watch\?v=([^"]+)"/g,
      /data-video-id="([^"]+)"/g
    ];

    for (const pattern of patterns) {
      const matches = response.data.match(pattern);
      if (matches) {
        for (const match of matches) {
          const videoIdMatch = match.match(/([^"]+)$/);
          if (videoIdMatch && videoIdMatch[1] && videoIdMatch[1].length === 11) {
            return videoIdMatch[1];
          }
        }
      }
    }

    return null;
  } catch (e) {
    console.error("YouTube resolution failed:", e);
    // Fallback: try direct YouTube search without proxy
    try {
      const fallbackResponse = await axios.get(`https://www.youtube.com/results?search_query=${encodeURIComponent(`${title} ${artist} official audio`)}`, {
        timeout: 5000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
        }
      });

      const videoIdMatch = fallbackResponse.data.match(/\/watch\?v=([^"&]+)/);
      return videoIdMatch ? videoIdMatch[1] : null;
    } catch (fallbackError) {
      console.error("Fallback YouTube resolution also failed:", fallbackError);
      return null;
    }
  }
};
