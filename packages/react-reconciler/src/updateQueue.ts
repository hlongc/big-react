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

export const createUpdateQueue = <State>() => {
	return { shared: { pending: null } } as UpdateQueue<State>;
};

export const enqueueUpdateQueue = <State>(
	updateQueue: UpdateQueue<State>,
	update: Update<State>
) => {
	updateQueue.shared.pending = update;
};

export const processUpdateQueue = <State>(
	baseState: State,
	pendingUpdate: Update<State> | null
): {
	memoziedState: State;
} => {
	const result: ReturnType<typeof processUpdateQueue<State>> = {
		memoziedState: baseState
	};
	if (pendingUpdate !== null) {
		if (pendingUpdate.action instanceof Function) {
			// baseState 1 update  (prevState) => 2 * prevState
			result.memoziedState = pendingUpdate.action(baseState);
		} else {
			result.memoziedState = pendingUpdate.action;
		}
	}

	return result;
};
