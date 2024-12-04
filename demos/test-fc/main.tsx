import { useState, useEffect } from 'react';
import ReactNoopRenderer from 'react-noop-renderer';

console.log(import.meta.hot);

function App() {
	return (
		<>
			<Child />
			<div>hello world</div>
		</>
	);
}

function Child() {
	return 'Child';
}

const root = ReactNoopRenderer.createRoot();

root.render(<App />);

window.root = root;
