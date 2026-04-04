import React from 'react';
import { createRoot } from 'react-dom/client';
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "./components/ui/dialog";

function Test() {
  return (
    <div>
      <h3>UI Test</h3>
      <button onClick={() => toast("Hello World")}>Show Toast</button>
      <Dialog>
        <DialogTrigger>Open Dialog</DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Dialog Title</DialogTitle>
          </DialogHeader>
          <p>Dialog Content</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(<Test />);
