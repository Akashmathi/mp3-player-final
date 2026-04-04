import { useState, useEffect, useRef } from "react";
import { Button } from "./ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./ui/dialog";
import { Input } from "./ui/input";
import { Search, Loader2, Plus, Play } from "lucide-react";
import { searchMusic, resolveYouTubeId } from "../lib/youtube";
import type { SearchResult } from "../lib/youtube";
import { toast } from "sonner";

interface YouTubeSearchProps {
  onSelect: (track: { title: string; artist: string; yt_id: string; thumbnail: string }, playNow: boolean) => void;
}

export function YouTubeSearch({ onSelect }: YouTubeSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [resolvingId, setResolvingId] = useState<string | null>(null);
  const [results, setResults] = useState<SearchResult[]>([]);

  async function handleSearch() {
    if (!query.trim()) return;
    setLoading(true);
    try {
      const data = await searchMusic(query);
      setResults(data);
    } catch (e) {
      toast.error("Search failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleSelect(result: SearchResult, playNow: boolean) {
    setResolvingId(result.id);
    try {
      const yt_id = await resolveYouTubeId(result.title, result.artist);
      if (yt_id) {
        onSelect({
          title: result.title,
          artist: result.artist,
          yt_id,
          thumbnail: result.thumbnail
        }, playNow);
        toast.success(`${playNow ? 'Playing' : 'Added'} ${result.title}`);
      } else {
        toast.error("Could not find YouTube video");
      }
    } catch (e) {
      toast.error("Resolution failed");
    } finally {
      setResolvingId(null);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-2">
          <Search className="h-4 w-4" />
          Search YouTube
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[80vh] flex flex-col p-6">
        <DialogHeader>
          <DialogTitle>YouTube Music Search</DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 my-4">
          <Input 
            placeholder="Search for songs..." 
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
          <Button onClick={handleSearch} disabled={loading}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
          </Button>
        </div>
        
        <div className="flex-1 overflow-y-auto pr-2 space-y-2 min-h-[300px]">
          {results.length === 0 && !loading && (
            <div className="text-center text-muted-foreground mt-10 py-10 border-2 border-dashed rounded-lg">
              Try searching for your favorite artist or song.
            </div>
          )}
          
          {results.map((result) => (
            <div key={result.id} className="flex items-center gap-4 p-3 rounded-xl border bg-card hover:border-primary/50 transition-all">
              <img src={result.thumbnail} alt={result.title} className="h-16 w-16 rounded-md object-cover shadow-sm border border-border/50 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-lg truncate leading-snug text-foreground">{result.title}</p>
                <p className="text-sm text-muted-foreground truncate">{result.artist}</p>
              </div>
              <div className="flex gap-2 shrink-0">
                <Button 
                  size="sm" 
                  variant="outline" 
                  disabled={!!resolvingId}
                  onClick={() => handleSelect(result, true)}
                  className="hover:bg-primary/10"
                >
                  {resolvingId === result.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Play className="h-4 w-4 mr-1" />}
                  Play
                </Button>
                <Button 
                  size="sm" 
                  variant="default"
                  disabled={!!resolvingId}
                  onClick={() => handleSelect(result, false)}
                >
                  {resolvingId === result.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
                  Add
                </Button>
              </div>
            </div>
          ))}
          
          {loading && (
            <div className="flex flex-col items-center justify-center py-10 text-muted-foreground animate-pulse">
                <Loader2 className="h-8 w-8 animate-spin mb-2" />
                <p>Searching iTunes database...</p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
