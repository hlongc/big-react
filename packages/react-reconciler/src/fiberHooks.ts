import { Dispatch, Dispatcher } from 'react/src/currentDispatcher';
import { FiberNode } from './fiber';
import internals from 'shared/internals';
import {
	createUpdate,
	createUpdateQueue,
	enqueueUpdateQueue,
	UpdateQueue
} from './updateQueue';
import { Action } from 'shared/ReactTypes';
import { scheduleUpdateOnFiber } from './workLoop';

/** 正在渲染的fiber节点 */
let currentlyRenderingFiber: FiberNode | null = null;
/** 正在执行的hook */
let workInProgressHook: Hook | null = null;

const { currentDispatcher } = internals;
interface Hook {
	memoizedState: any;
	updateQueue: unknown;
	next: Hook | null;
}

export function renderWithHook(wip: FiberNode) {
	// 赋值
	currentlyRenderingFiber = wip;
	wip.memoziedState = null;

	const current = wip.alternate;
	if (current !== null) {
		// update
	} else {
		// mount
		currentDispatcher.current = HooksDispatcherOnMount;
	}

	const Component = wip.type;
	const props = wip.pendingProps;
	const children = Component(props);
	// 重置
	currentlyRenderingFiber = null;
	return children;
}

const HooksDispatcherOnMount: Dispatcher = {
	useState: mountState
};

function mountState<State>(
	initialState: State | (() => State)
): [State, Dispatch<State>] {
	// 找到当前useState对应的hooks数据
	const hook = mountWorkInProgressHook();

	let memoizedState: State;

	if (initialState instanceof Function) {
		memoizedState = initialState();
	} else {
		memoizedState = initialState;
	}

	const queue = createUpdateQueue<State>();
	hook.updateQueue = queue;
	hook.memoizedState = memoizedState;
	// @ts-ignore
	const dispatch = dispatchSetState.bind(null, currentlyRenderingFiber, queue);
	queue.dispatch = dispatch;

	return [memoizedState, dispatch];
}

function dispatchSetState<State>(
	fiber: FiberNode,
	updateQueue: UpdateQueue<State>,
	action: Action<State>
) {
	const update = createUpdate<State>(action);
	enqueueUpdateQueue(updateQueue, update);
	scheduleUpdateOnFiber(fiber);
}

function mountWorkInProgressHook(): Hook {
	const hook: Hook = {
		memoizedState: null,
		next: null,
		updateQueue: null
	};

	if (workInProgressHook === null) {
		// 说明是全局第一个执行的hook
		if (currentlyRenderingFiber === null) {
			// 说明hook没在组件内执行
			throw new Error('请在函数组件内执行hook');
		} else {
			workInProgressHook = hook;
			currentlyRenderingFiber.memoziedState = workInProgressHook;
		}
	} else {
		// mount时后续的hook
		workInProgressHook.next = hook;
	}

	return hook;
}
