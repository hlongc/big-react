import { Dispatch } from 'react/src/currentDispatcher';
import { Action } from 'shared/ReactTypes';
import { Lane } from './fiberLanes';

export interface Update<State> {
	action: Action<State>;
	next: Update<any> | null;
	lane: Lane;
}

export interface UpdateQueue<State> {
	shared: {
		pending: Update<State> | null;
	};
	dispatch: Dispatch<State> | null;
}

export const createUpdate = <State>(
	action: Action<State>,
	lane: Lane
): Update<State> => {
	return { action, next: null, lane };
};

export const createUpdateQueue = <State>() => {
	return { shared: { pending: null } } as UpdateQueue<State>;
};

export const enqueueUpdateQueue = <State>(
	updateQueue: UpdateQueue<State>,
	update: Update<State>
) => {
	const pending = updateQueue.shared.pending;
	// 形成环状链表
	if (pending === null) {
		// pending: a -> a
		update.next = update;
	} else {
		// pending: b -> a -> b
		// peding: c -> a -> b -> c
		update.next = pending.next;
		pending.next = update;
	}
	updateQueue.shared.pending = update;
};

export const processUpdateQueue = <State>(
	baseState: State,
	pendingUpdate: Update<State> | null,
	renderLane: Lane
): {
	memoziedState: State;
} => {
	const result: ReturnType<typeof processUpdateQueue<State>> = {
		memoziedState: baseState
	};

	if (pendingUpdate !== null) {
		const first = pendingUpdate.next;
		let pending = pendingUpdate.next as Update<any>;

		do {
			if (pending.lane === renderLane) {
				const action = pending.action;
				if (action instanceof Function) {
					// baseState 1 update  (prevState) => 2 * prevState
					baseState = action(baseState);
				} else {
					baseState = action;
				}
			} else {
				if (__DEV__) {
					console.log('不应该进入到这个逻辑');
				}
			}
			pending = pending.next as Update<any>;
		} while (first !== pending);
	}

	result.memoziedState = baseState;

	return result;
};
