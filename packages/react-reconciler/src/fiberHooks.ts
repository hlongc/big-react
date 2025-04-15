import { Dispatch, Dispatcher } from 'react/src/currentDispatcher';
import { __SECRET_INTERNAL_DO_NOT_USE_OR_YOU_WILL_BE_FIRED } from 'react';
import { FiberNode } from './fiber';
import internals from 'shared/internals';
import {
	createUpdate,
	createUpdateQueue,
	enqueueUpdateQueue,
	processUpdateQueue,
	Update,
	UpdateQueue
} from './updateQueue';
import { Action } from 'shared/ReactTypes';
import { scheduleUpdateOnFiber } from './workLoop';
import { Lane, NoLane, requestUpdateLane } from './fiberLanes';
import { Flags, PassiveEffect } from './fiberFlags';
import { HookHasEffect, Passive } from './hookEffectTags';
import { ContextType } from 'react';

const { currentBatchConfig } =
	__SECRET_INTERNAL_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;

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
	baseState: any;
	baseQueue: Update<any> | null;
}

export interface Effect {
	tag: Flags;
	create: EffectCallback | void;
	destroy: EffectCallback | void;
	deps: EffectDeps | null;
	next: Effect | null;
}

type EffectCallback = () => void;
type EffectDeps = any[] | null;

/** 函数组件的updateQueue增加lastEffect，用于保存effect信息 */
export interface FCUpdateQueue<State> extends UpdateQueue<State> {
	/** lastEffect的next指向firstEffect，是个环状链表 */
	lastEffect: Effect | null;
}

export function renderWithHook(wip: FiberNode, lane: Lane) {
	// 赋值
	currentlyRenderingFiber = wip;
	// 重置hooks链表
	wip.memoziedState = null;
	// 重置effect的链表
	wip.updateQueue = null;
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
	useState: mountState,
	useEffect: mountEffect,
	useTransition: mountTransition,
	useRef: mountRef,
	useContext: readContext
};

const HooksDispatcherOnUpdate: Dispatcher = {
	useState: updateState,
	useEffect: updateEffect,
	useTransition: updateTransition,
	useRef: updateRef
};

function mountEffect(create: EffectCallback | void, deps: EffectDeps | void) {
	const hook = mountWorkInProgressHook();
	const nextDeps = deps === undefined ? null : deps;

	if (currentlyRenderingFiber) {
		// mount和依赖变化时需要执行回调，所以在mount时打上标记
		currentlyRenderingFiber.flags |= PassiveEffect;
	}
	// 把hook的数据结构保存在memoizedState中
	hook.memoizedState = pushEffect(
		Passive | HookHasEffect,
		create,
		undefined,
		nextDeps
	);
}

function pushEffect(
	hookFlag: Flags,
	create: EffectCallback | void,
	destroy: EffectCallback | void,
	deps: EffectDeps | null
): Effect {
	const effect: Effect = {
		tag: hookFlag,
		create,
		destroy,
		deps,
		next: null
	};

	const fiber = currentlyRenderingFiber;
	if (fiber) {
		let updateQueue = fiber.updateQueue as FCUpdateQueue<any>;

		if (updateQueue === null) {
			updateQueue = createFCUpdateQueue();
			fiber.updateQueue = updateQueue;
			effect.next = effect;
			updateQueue.lastEffect = effect;
		} else {
			const lastEffect = updateQueue.lastEffect;
			if (lastEffect === null) {
				updateQueue.lastEffect = effect;
				effect.next = effect;
			} else {
				const firstEffect = lastEffect.next;
				lastEffect.next = effect;
				effect.next = firstEffect;
				updateQueue.lastEffect = effect;
			}
		}
	}

	return effect;
}

function createFCUpdateQueue<State>() {
	const updateQueue = createUpdateQueue<State>() as FCUpdateQueue<State>;
	updateQueue.lastEffect = null;
	return updateQueue;
}

function updateEffect(create: EffectCallback | void, deps: EffectDeps | void) {
	const hook = updateWorkInProgressHook();
	const nextDeps = deps === undefined ? null : deps;

	let destroy: EffectCallback | void;

	if (currentHook !== null) {
		const prevEffect = currentHook.memoizedState as Effect;
		destroy = prevEffect.destroy;

		if (nextDeps !== null) {
			const prevDeps = prevEffect.deps;
			// 浅比较
			if (areHookInputsEqual(prevDeps, nextDeps)) {
				// 如果依赖没变就不触发回调执行
				hook.memoizedState = pushEffect(Passive, create, destroy, nextDeps);
				return;
			}
		}

		// 浅比较 不相等

		if (currentlyRenderingFiber) {
			// mount和依赖变化时需要执行回调，所以在mount时打上标记
			currentlyRenderingFiber.flags |= PassiveEffect;
			hook.memoizedState = pushEffect(
				Passive | HookHasEffect,
				create,
				destroy,
				nextDeps
			);
		}
	}
}

function areHookInputsEqual(
	prevDeps: EffectDeps | null,
	nextDeps: EffectDeps | null
) {
	if (prevDeps === null || nextDeps === null) {
		return false;
	}
	for (let i = 0; i < prevDeps.length && i < nextDeps.length; i++) {
		if (Object.is(prevDeps[i], nextDeps[i])) {
			continue;
		}
		return false;
	}

	return true;
}
function updateState<State>(): [State, Dispatch<State>] {
	// 找到当前useState对应的hooks数据
	const hook = updateWorkInProgressHook();

	// 计算新state的逻辑
	const queue = hook.updateQueue as UpdateQueue<State>;
	const baseState = hook.baseState;

	const pending = queue.shared.pending;
	const current = currentHook as Hook;
	let baseQueue = current.baseQueue;

	if (pending !== null) {
		// pending、baseQueue，update保存在current
		if (baseQueue !== null) {
			// 合并跳过的update和即将调度的update
			const baseFirst = baseQueue.next;
			const pendingFirst = pending.next;

			baseQueue.next = pendingFirst;
			pending.next = baseFirst;
		}

		baseQueue = pending;
		// 保存在current中，下次计算继续执行跳过的update
		current.baseQueue = pending;
		queue.shared.pending = null;
	}

	if (baseQueue !== null) {
		const {
			memoziedState,
			baseQueue: newBaseQueue,
			baseState: newBaseState
		} = processUpdateQueue<State>(baseState, baseQueue, renderLane);

		hook.memoizedState = memoziedState;
		hook.baseState = newBaseState;
		hook.baseQueue = newBaseQueue;
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

function mountRef<T>(initialValue: T): { current: T | null } {
	const hook = mountWorkInProgressHook();
	const ref = { current: initialValue ?? null };
	hook.memoizedState = ref;

	return ref;
}

function updateRef() {
	const hook = updateWorkInProgressHook();
	return hook.memoizedState;
}

function mountTransition(): [boolean, (callbacl: () => void) => void] {
	const [isPending, setPending] = mountState(false);
	const hook = mountWorkInProgressHook();

	const start = startTransition.bind(null, setPending);

	hook.memoizedState = start;

	return [isPending, start];
}

function updateTransition(): [boolean, (callbacl: () => void) => void] {
	const [isPending] = updateState();
	const hook = updateWorkInProgressHook();
	const start = hook.memoizedState;

	return [isPending as boolean, start];
}

function startTransition(setPending: Dispatch<boolean>, callback: () => void) {
	const prevTransition = currentBatchConfig.transition;

	currentBatchConfig.transition = 1;
	callback();
	setPending(true);

	currentBatchConfig.transition = prevTransition;
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
		next: null,
		baseQueue: currentHook.baseQueue,
		baseState: currentHook.baseState
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
		updateQueue: null,
		baseQueue: null,
		baseState: null
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

function readContext<T>(context: ContextType<T>): T {
	const fiber = currentlyRenderingFiber;
	if (!fiber) {
		throw new Error('不能在组件和hook外部使用useContext');
	}
	return context._currentValue;
}
