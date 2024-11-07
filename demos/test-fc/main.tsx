import { useState } from 'react';
import { createRoot } from 'react-dom/client';

console.log(import.meta.hot);

function App() {
	const [num, setNum] = useState<number>(1);
	window.setNum = setNum;
	return num === 3 ? <Child /> : num;
}

function Child() {
	return <div>hello</div>;
}

createRoot(document.getElementById('root')!).render(<App />);
