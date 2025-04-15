import { useRef, useEffect, useState } from 'react';

function Child() {
	return <div ref={(ins) => console.log('child', ins)}>child</div>;
}

export default function () {
	const [showChild, setShow] = useState(true);

	const ref = useRef();

	console.log('parent', ref);

	useEffect(() => {
		console.log('parent1', ref);
	}, []);

	return (
		<div
			ref={ref}
			onClick={() => {
				setShow(!showChild);
			}}
		>
			<p>父元素</p>
			{showChild && <Child />}
		</div>
	);
}
