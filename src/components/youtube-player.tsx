import React, { useEffect, useRef } from "react";

declare global {
  interface Window {
    onYouTubeIframeAPIReady: () => void;
    YT: any;
  }
}

interface YouTubePlayerProps {
  videoId: string;
  isPlaying: boolean;
  volume: number;
  seekTime?: number | null;
  onTimeUpdate: (time: number) => void;
  onDurationChange: (duration: number) => void;
  onEnded: () => void;
  onReady?: () => void;
}

export function YouTubePlayer({ 
  videoId, 
  isPlaying, 
  volume, 
  seekTime,
  onTimeUpdate, 
  onDurationChange, 
  onEnded,
  onReady
}: YouTubePlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const progressInterval = useRef<any>(null);
  const isReady = useRef(false);

  useEffect(() => {
    // Load YouTube API if not already loaded
    if (!window.YT || !window.YT.Player) {
      const tag = document.createElement('script');
      tag.src = "https://www.youtube.com/iframe_api";
      const firstScriptTag = document.getElementsByTagName('script')[0];
      firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
    }

    const initPlayer = () => {
      if (!containerRef.current || playerRef.current) return;
      playerRef.current = new window.YT.Player(containerRef.current, {
        height: '0',
        width: '0',
        videoId: videoId,
        playerVars: {
          playsinline: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          modestbranding: 1,
          rel: 0
        },
        events: {
          onReady: (event: any) => {
            isReady.current = true;
            event.target.setVolume(volume * 100);
            onDurationChange(event.target.getDuration());
            if (isPlaying) event.target.playVideo();
            onReady?.();
          },
          onStateChange: (event: any) => {
            if (event.data === window.YT.PlayerState.ENDED) {
              onEnded();
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      initPlayer();
    } else {
      window.onYouTubeIframeAPIReady = initPlayer;
    }

    return () => {
      if (playerRef.current) {
        playerRef.current.destroy();
        playerRef.current = null;
      }
      if (progressInterval.current) {
        clearInterval(progressInterval.current);
      }
    };
  }, []);

  // Handle Video Change
  useEffect(() => {
    if (isReady.current && playerRef.current?.loadVideoById) {
      playerRef.current.loadVideoById(videoId);
      if (!isPlaying) playerRef.current.pauseVideo();
    }
  }, [videoId]);

  // Handle Play/Pause & Progress
  useEffect(() => {
    if (!isReady.current || !playerRef.current) return;
    
    if (isPlaying) {
      playerRef.current.playVideo();
      if (progressInterval.current) clearInterval(progressInterval.current);
      progressInterval.current = setInterval(() => {
        if (playerRef.current?.getCurrentTime) {
          onTimeUpdate(playerRef.current.getCurrentTime());
        }
      }, 500);
    } else {
      playerRef.current.pauseVideo();
      if (progressInterval.current) clearInterval(progressInterval.current);
    }
  }, [isPlaying]);

  // Handle Seek
  useEffect(() => {
    if (isReady.current && playerRef.current?.seekTo && seekTime !== null && seekTime !== undefined) {
      playerRef.current.seekTo(seekTime, true);
    }
  }, [seekTime]);

  // Handle Volume
  useEffect(() => {
    if (isReady.current && playerRef.current?.setVolume) {
      playerRef.current.setVolume(volume * 100);
    }
  }, [volume]);

  return <div id="youtube-player-container" ref={containerRef} style={{ pointerEvents: 'none', position: 'absolute', opacity: 0 }} />;
}
