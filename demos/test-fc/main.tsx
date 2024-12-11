import { useState, useEffect } from 'react';
import ReactNoopRenderer from 'react-dom';

console.log(import.meta.hot);

function App() {
	const [num, update] = useState(100);

	return (
		<ul onClick={() => update(50)}>
			{new Array(num).fill(0).map((_, i) => {
				return <Child key={i}>{i}</Child>;
			})}
		</ul>
	);
}

function Child({ children }) {
	const now = performance.now();
	if (performance.now() - now < 4) {
	}

	return <li>{children}</li>;
}

const root = ReactNoopRenderer.createRoot(document.querySelector('#root'));

root.render(<App />);
