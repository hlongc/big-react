import { createContext, useContext } from 'react';

const contextA = createContext('default A');
const contextB = createContext('default B');

function Child() {
	const a = useContext(contextA);
	const b = useContext(contextB);
	return (
		<div>
			a: {a} b: {b}
		</div>
	);
}

export default function () {
	return (
		<contextA.Provider value="a0">
			<contextB.Provider value="b0">
				<contextA.Provider value="a1">
					<Child />
				</contextA.Provider>
			</contextB.Provider>
			<Child />
		</contextA.Provider>
	);
}
