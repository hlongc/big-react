import { Dispatch, Dispatcher } from 'react/src/currentDispatcher';
import { FiberNode } from './fiber';
import internals from 'shared/internals';
import {
	createUpdate,
	createUpdateQueue,
	enqueueUpdateQueue,
	processUpdateQueue,
	UpdateQueue
} from './updateQueue';
import { Action } from 'shared/ReactTypes';
import { scheduleUpdateOnFiber } from './workLoop';
import { Lane, NoLane, requestUpdateLane } from './fiberLanes';

/** 正在渲染的fiber节点 */
let currentlyRenderingFiber: FiberNode | null = null;
/** 正在执行的hook */
let workInProgressHook: Hook | null = null;
let currentHook: Hook | null = null;
let renderLane: Lane = NoLane;

const { currentDispatcher } = internals;
interface Hook {
	memoizedState: any;
	updateQueue: unknown;
	next: Hook | null;
}

export function renderWithHook(wip: FiberNode, lane: Lane) {
	// 赋值
	currentlyRenderingFiber = wip;
	// 重置hooks链表
	wip.memoziedState = null;
	renderLane = lane;

	const current = wip.alternate;
	if (current !== null) {
		// update
		currentDispatcher.current = HooksDispatcherOnUpdate;
	} else {
		// mount
		currentDispatcher.current = HooksDispatcherOnMount;
	}

	const Component = wip.type;
	const props = wip.pendingProps;
	const children = Component(props);
	// 重置
	currentlyRenderingFiber = null;
	workInProgressHook = null;
	currentHook = null;
	renderLane = NoLane;
	return children;
}

const HooksDispatcherOnMount: Dispatcher = {
	useState: mountState
};

const HooksDispatcherOnUpdate: Dispatcher = {
	useState: updateState
};

function updateState<State>(): [State, Dispatch<State>] {
	// 找到当前useState对应的hooks数据
	const hook = updateWorkInProgressHook();

	// 计算新state的逻辑
	const queue = hook.updateQueue as UpdateQueue<State>;
	const pending = queue.shared.pending;

	if (pending !== null) {
		const { memoziedState } = processUpdateQueue<State>(
			hook.memoizedState,
			pending,
			renderLane
		);
		hook.memoizedState = memoziedState;
	}

	return [hook.memoizedState, queue.dispatch as Dispatch<State>];
}

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
	const lane = requestUpdateLane();
	const update = createUpdate<State>(action, lane);
	enqueueUpdateQueue(updateQueue, update);
	scheduleUpdateOnFiber(fiber, lane);
}

function updateWorkInProgressHook(): Hook {
	// TODO: render阶段触发的更新
	let nextCurrentHook: Hook | null;

	if (currentHook === null) {
		// 这是当前FC update时的第一个hook

		// 取到上次组件的fiber
		const current = currentlyRenderingFiber?.alternate;
		if (current !== null) {
			// 取到上次的第一个hook
			nextCurrentHook = current?.memoziedState as Hook | null;
		} else {
			// mount阶段
			nextCurrentHook = null;
		}
	} else {
		nextCurrentHook = currentHook.next;
	}

	if (nextCurrentHook === null) {
		// 上一次  u1 u2 u3
		// 本次    u1 u2 u3 u4
		throw new Error(
			`组件${currentlyRenderingFiber?.type}本次执行时hook顺序不一致`
		);
	}

	currentHook = nextCurrentHook as Hook;
	const newHook: Hook = {
		memoizedState: currentHook.memoizedState,
		updateQueue: currentHook.updateQueue,
		next: null
	};

	if (workInProgressHook === null) {
		// 说明是全局第一个执行的hook
		if (currentlyRenderingFiber === null) {
			// 说明hook没在组件内执行
			throw new Error('请在函数组件内执行hook');
		} else {
			workInProgressHook = newHook;
			// 把当前hook设置为该fiber节点的第一个hook
			currentlyRenderingFiber.memoziedState = workInProgressHook;
		}
	} else {
		// mount时后续的hook
		workInProgressHook.next = newHook;
		workInProgressHook = newHook;
	}

	return workInProgressHook;
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
			// 把当前hook设置为该fiber节点的第一个hook
			currentlyRenderingFiber.memoziedState = workInProgressHook;
		}
	} else {
		// mount时后续的hook
		workInProgressHook.next = hook;
		workInProgressHook = hook;
	}

	return hook;
}
