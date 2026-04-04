import React from 'react';
import { createRoot } from 'react-dom/client';

function Test() {
  return <div>Hello World</div>;
}

createRoot(document.getElementById('root')!).render(<Test />);
