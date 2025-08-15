import React from "react";
import { GripVertical, Play, Pause, Trash2 } from "lucide-react";
import { useDrag, useDrop, DndProvider } from "react-dnd";
import { HTML5Backend } from "react-dnd-html5-backend";

export type PlaylistItem = {
  id: string;
  name: string;
  active?: boolean;
};

const ITEM_TYPE = "TRACK_ROW";

type RowProps = {
  item: PlaylistItem;
  index: number;
  move: (from: number, to: number) => void;
  onPlay: (id: string) => void;
  onDelete: (id: string) => void;
};

function Row({ item, index, move, onPlay, onDelete }: RowProps) {
  const ref = React.useRef<HTMLDivElement | null>(null);
  const [, drop] = useDrop({
    accept: ITEM_TYPE,
    hover(dragItem: { index: number }) {
      if (!ref.current || dragItem.index === index) return;
      move(dragItem.index, index);
      dragItem.index = index;
    },
  });

  const [{ isDragging }, drag] = useDrag({
    type: ITEM_TYPE,
    item: { index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  drag(drop(ref));

  return (
    <div ref={ref} className="playlist-item" style={{ opacity: isDragging ? 0.5 : 1 }}>
      <GripVertical size={16} style={{ cursor: 'grab' }} />
      <div className="playlist-item-name">
        <p>{item.name}</p>
      </div>
      <button className="btn icon-btn" onClick={() => onPlay(item.id)}>
        {item.active ? <Pause size={16} /> : <Play size={16} />}
      </button>
      <button className="btn icon-btn" onClick={() => onDelete(item.id)}>
        <Trash2 size={16} />
      </button>
    </div>
  );
}

export function Playlist({ items, onReorder, onPlay, onDelete }: {
  items: PlaylistItem[];
  onReorder: (newItems: PlaylistItem[]) => void;
  onPlay: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  // Use a state for the items to allow react-dnd to re-render on hover
  const [localItems, setLocalItems] = React.useState(items);
  React.useEffect(() => {
    setLocalItems(items);
  }, [items]);

  const moveItem = React.useCallback((from: number, to: number) => {
    setLocalItems(prev => {
      const next = [...prev];
      const [moved] = next.splice(from, 1);
      next.splice(to, 0, moved);
      return next;
    });
  }, []);

  // Callback to parent when dragging stops
  const handleDrop = () => {
    onReorder(localItems);
  };

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="playlist" onDrop={handleDrop}>
        {localItems.map((it, idx) => (
          <Row key={it.id} item={it} index={idx} move={moveItem} onPlay={onPlay} onDelete={onDelete} />
        ))}
      </div>
    </DndProvider>
  );
}
