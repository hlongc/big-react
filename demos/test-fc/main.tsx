import { useState } from 'react';
import { createRoot } from 'react-dom/client';

console.log(import.meta.hot);

function App() {
	const [num, setNum] = useState<number>(1);
	const arr =
		num % 2 === 0
			? [<li key="1">1</li>, <li key="2">2</li>, <li key="3">3</li>]
			: [<li key="3">3</li>, <li key="2">2</li>, <li key="1">1</li>];
	return (
		<div>
			<button
				onClickCapture={(e) => {
					setNum((prev) => prev + 1);
					console.log('捕获阶段');
					e.stopPropagation();
				}}
				onClick={() => {
					console.log('冒泡阶段');
					setNum((prev) => prev + 1);
				}}
			>
				{num}
			</button>
			<ul>{arr}</ul>
		</div>
	);
}

function Child() {
	return <div>hello</div>;
}

createRoot(document.getElementById('root')!).render(<App />);
