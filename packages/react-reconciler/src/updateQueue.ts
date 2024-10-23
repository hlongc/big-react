import { Action } from 'shared/ReactTypes';

export interface Update<State> {
	action: Action<State>;
}

export interface UpdateQueue<State> {
	shared: {
		pending: Update<State> | null;
	};
}

export const createUpdate = <State>(action: Action<State>): Update<State> => {
	return { action };
};

export const createUpdateQueue = <Action>() => {
	return { shared: { pending: null } } as UpdateQueue<Action>;
};

export const enqueueUpdateQueue = <Action>(
	updateQueue: UpdateQueue<Action>,
	update: Update<Action>
) => {
	updateQueue.shared.pending = update;
};

export const processUpdateQueue = <State>(
	baseState: State,
	pendintUpdate: Update<State> | null
): {
	memoziedState: State;
} => {
	const result: ReturnType<typeof processUpdateQueue<State>> = {
		memoziedState: baseState
	};
	if (pendintUpdate !== null) {
		if (pendintUpdate.action instanceof Function) {
			// baseState 1 update  (prevState) => 2 * prevState
			result.memoziedState = pendintUpdate.action(baseState);
		} else {
			result.memoziedState = pendintUpdate.action;
		}
	}

	return result;
};
