import { useState } from 'react';
import { createRoot } from 'react-dom/client';

console.log(import.meta.hot);

function App() {
	const [num, setNum] = useState<number>(1);
	window.setNum = setNum;
	return <div>{num}</div>;
}

createRoot(document.getElementById('root')!).render(<App />);
