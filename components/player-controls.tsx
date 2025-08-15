import React from "react";
import { Button } from "./ui/button";
import { Slider } from "./ui/slider";
import { Play, Pause, SkipBack, SkipForward, Repeat1 } from "lucide-react";

export function PlayerControls({
  isPlaying,
  canPrev,
  canNext,
  currentTime,
  duration,
  volume,
  loopOne,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onVolume,
  onToggleLoopOne,
}: {
  isPlaying: boolean;
  canPrev: boolean;
  canNext: boolean;
  currentTime: number;
  duration: number;
  volume: number; // 0..1
  loopOne: boolean;
  onTogglePlay: () => void;
  onPrev: () => void;
  onNext: () => void;
  onSeek: (t: number) => void;
  onVolume: (v: number) => void;
  onToggleLoopOne: () => void;
}) {
  const timeStr = (s: number) => {
    const m = Math.floor(s / 60)
      .toString()
      .padStart(2, "0");
    const ss = Math.floor(s % 60)
      .toString()
      .padStart(2, "0");
    return `${m}:${ss}`;
  };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-3">
        <Button variant="secondary" onClick={onPrev} disabled={!canPrev}>
          <SkipBack size={16} />
        </Button>
        <Button onClick={onTogglePlay}>{isPlaying ? <Pause size={16} /> : <Play size={16} />}</Button>
        <Button variant="secondary" onClick={onNext} disabled={!canNext}>
          <SkipForward size={16} />
        </Button>
        <Button variant={loopOne ? "default" : "secondary"} onClick={onToggleLoopOne} title="Loop current track">
          <Repeat1 size={16} />
        </Button>
        <div className="flex items-center gap-2 ml-auto w-40">
          <span>Vol</span>
          <Slider
            min={0}
            max={100}
            step={1}
            value={[Math.round(volume * 100)]}
            onValueChange={(v) => onVolume((v?.[0] ?? 100) / 100)}
          />
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2">
          <span className="w-10 text-muted-foreground">{timeStr(currentTime)}</span>
          <Slider
            min={0}
            max={Math.max(1, Math.floor(duration))}
            step={1}
            value={[Math.min(Math.floor(currentTime), Math.floor(duration))]}
            onValueChange={(v) => onSeek(Math.min(v?.[0] ?? 0, duration))}
          />
          <span className="w-10 text-muted-foreground text-right">{timeStr(duration)}</span>
        </div>
      </div>
    </div>
  );
}
