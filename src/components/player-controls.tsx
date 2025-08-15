import React from "react";
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
}) {
  const timeStr = (s: number) => {
    if (isNaN(s)) return "00:00";
    const m = Math.floor(s / 60).toString().padStart(2, "0");
    const ss = Math.floor(s % 60).toString().padStart(2, "0");
    return `${m}:${ss}`;
  };

  return (
    <div className="player-controls">
      <div className="player-buttons">
        <button className="btn icon-btn" onClick={onPrev} disabled={!canPrev}>
          <SkipBack size={16} />
        </button>
        <button className="btn icon-btn" onClick={onTogglePlay}>
          {isPlaying ? <Pause size={16} /> : <Play size={16} />}
        </button>
        <button className="btn icon-btn" onClick={onNext} disabled={!canNext}>
          <SkipForward size={16} />
        </button>
        <button
          className="btn icon-btn"
          onClick={onToggleLoopOne}
          title="Loop current track"
          style={{ backgroundColor: loopOne ? '#6200ea' : '' }}
        >
          <Repeat1 size={16} />
        </button>
        <div className="volume-control">
          <span>Vol</span>
          <input
            type="range"
            className="volume-slider"
            min={0}
            max={100}
            step={1}
            value={Math.round(volume * 100)}
            onChange={(e) => onVolume(parseInt(e.target.value) / 100)}
          />
        </div>
      </div>
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>{timeStr(currentTime)}</span>
          <input
            type="range"
            className="time-slider"
            min={0}
            max={duration || 0}
            step={1}
            value={currentTime || 0}
            onChange={(e) => onSeek(parseInt(e.target.value))}
          />
          <span>{timeStr(duration)}</span>
        </div>
      </div>
    </div>
  );
}