import React from "react";
import { Button } from "./ui/button";
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
      if (!ref.current) return;
      if (dragItem.index === index) return;
      move(dragItem.index, index);
      dragItem.index = index;
    },
  });

  const [{ isDragging }, drag, preview] = useDrag({
    type: ITEM_TYPE,
    item: { index },
    collect: (monitor) => ({ isDragging: monitor.isDragging() }),
  });

  drag(drop(ref));

  return (
    <div
      ref={ref}
      className={`flex items-center gap-2 p-2 rounded-md border ${item.active ? "bg-accent" : "bg-card"}`}
      style={{ opacity: isDragging ? 0.5 : 1 }}
    >
      <div ref={preview as any} className="cursor-grab select-none text-muted-foreground">
        <GripVertical size={16} />
      </div>
      <div className="flex-1 truncate">
        <p className="truncate">{item.name}</p>
      </div>
      <div className="flex items-center gap-2">
        <Button size="sm" variant="secondary" onClick={() => onPlay(item.id)}>
          {item.active ? <Pause size={16} /> : <Play size={16} />}
        </Button>
        <Button size="sm" variant="ghost" onClick={() => onDelete(item.id)}>
          <Trash2 size={16} />
        </Button>
      </div>
    </div>
  );
}

export function Playlist({
  items,
  onReorder,
  onPlay,
  onDelete,
}: {
  items: PlaylistItem[];
  onReorder: (newItems: PlaylistItem[]) => void;
  onPlay: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const [local, setLocal] = React.useState(items);

  React.useEffect(() => setLocal(items), [items]);

  const move = React.useCallback(
    (from: number, to: number) => {
      setLocal((prev) => {
        const next = [...prev];
        const [spliced] = next.splice(from, 1);
        next.splice(to, 0, spliced);
        return next;
      });
    },
    []
  );

  React.useEffect(() => {
    if (local.length !== items.length) return;
    if (local.some((x, i) => x.id !== items[i]?.id)) {
      onReorder(local);
    }
  }, [local]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="flex flex-col gap-2">
        {local.map((it, idx) => (
          <Row key={it.id} item={it} index={idx} move={move} onPlay={onPlay} onDelete={onDelete} />
        ))}
      </div>
    </DndProvider>
  );
}
