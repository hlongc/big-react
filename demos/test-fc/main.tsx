import { createRoot } from 'react-dom/client';

function Child() {
	return <span>hello</span>;
}

function App() {
	return (
		<div>
			<Child />
		</div>
	);
}

createRoot(document.getElementById('root')!).render(<App />);
