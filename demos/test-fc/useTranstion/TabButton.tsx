import { useTransition } from 'react';

export default function TabButton({ action, children, isActive }) {
	const [isPending, startTransition] = useTransition();
	console.log('isPending', isPending);
	if (isActive) {
		return <b>{children}</b>;
	}
	return (
		<button
			onClick={() => {
				startTransition(() => {
					action();
				});
			}}
		>
			{children}
		</button>
	);
}
