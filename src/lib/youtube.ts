import axios from 'axios';

export type SearchResult = {
  id: string;
  title: string;
  artist: string;
  thumbnail: string;
  searchQuery?: string;
};

const CORS_PROXIES = [
  (url: string) => `https://corsproxy.io/?url=${encodeURIComponent(url)}`,
  (url: string) => `https://thingproxy.freeboard.io/fetch/${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`,
];

async function fetchYouTubeSearchHtml(url: string): Promise<string | null> {
  for (const proxy of CORS_PROXIES) {
    try {
      const response = await axios.get(proxy(url), {
        timeout: 10000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        },
      });
      if (response.status === 200 && response.data) {
        return typeof response.data === 'string' ? response.data : JSON.stringify(response.data);
      }
    } catch (error: any) {
      console.warn('YouTube proxy failed:', error?.message || error);
    }
  }

  try {
    const directResponse = await axios.get(url, {
      timeout: 10000,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
      },
    });
    if (directResponse.status === 200 && directResponse.data) {
      return directResponse.data;
    }
  } catch (error: any) {
    console.warn('Direct YouTube fetch failed:', error?.message || error);
  }

  return null;
}

export const searchMusic = async (query: string): Promise<SearchResult[]> => {
  try {
    const response = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(query)}&entity=song&limit=20`);
    return response.data.results.map((item: any, index: number) => ({
      id: item.trackId?.toString() || `${item.trackName}-${index}`,
      title: item.trackName,
      artist: item.artistName,
      thumbnail: item.artworkUrl100?.replace('100x100', '600x600') ?? '',
      searchQuery: `${item.trackName} ${item.artistName} official audio`,
    }));
  } catch (error) {
    console.error('Music search error:', error);
    return [];
  }
};

export const resolveYouTubeId = async (title: string, artist: string): Promise<string | null> => {
  const searchQuery = `${title} ${artist} official audio`;
  const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(searchQuery)}`;
  const html = await fetchYouTubeSearchHtml(searchUrl);
  if (!html) return null;

  const patterns = [
    /"videoId":"([^"]{11})"/g,
    /watch\?v=([a-zA-Z0-9_-]{11})/g,
    /"url":"\/watch\?v=([a-zA-Z0-9_-]{11})"/g,
    /data-video-id="([a-zA-Z0-9_-]{11})"/g,
  ];

  for (const pattern of patterns) {
    const match = pattern.exec(html);
    if (match?.[1]) {
      return match[1];
    }
  }

  return null;
};
