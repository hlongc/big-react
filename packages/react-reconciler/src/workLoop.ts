import { scheduleMicroTask } from 'hostConfig';
import {
	unstable_scheduleCallback as scheduleCallback,
	unstable_NormalPriority as NormalPriority,
	unstable_shouldYield,
	unstable_cancelCallback,
	CallbackNode
} from 'scheduler';
import { beginWork } from './beginWork';
import {
	commitHookEffectListCreate,
	commitHookEffectListDestroy,
	commitHookEffectListUnmount,
	commitLayoutEffects,
	commitMutationEffects
} from './commitWork';
import { completeWork } from './completeWork';
import {
	createWornInProgress,
	FiberNode,
	FiberRootNode,
	PendingPassiveEffects
} from './fiber';
import {
	getHighestPriority,
	Lane,
	lanesToSchedulerPriority,
	markRootFinished,
	mergeLanes,
	NoLane,
	SyncLane
} from './fiberLanes';
import { MutationMask, NoFlags, PassiveMask } from './fiberFlags';
import { flushSyncCallbacks, scheduleSyncCallback } from './syncTaskQueue';
import { HostRoot } from './workTags';
import { HookHasEffect, Passive } from './hookEffectTags';

/** 当前正在处理的fiber */
let workInProgess: FiberNode | null = null;
/** 正在处理的lane优先级 */
let wipRootRenderLane: Lane = NoLane;
let rootDoseHasPassiveEffects = false;

type RootExistStatus = number;
/** 中断执行 */
const RootInComplete = 1;
/** 处理完成 */
const RootCompleted = 2;
// TODO:执行过程中报错了

function prepareRefreshStack(root: FiberRootNode, lane: Lane) {
	root.finishedLane = NoLane;
	root.finishedWork = null;
	workInProgess = createWornInProgress(root.current, {});
	wipRootRenderLane = lane;
}

export function scheduleUpdateOnFiber(fiber: FiberNode, lane: Lane) {
	// 调度功能
	const root = markUpdateFromFiberToRoot(fiber);
	markRootUpdated(root, lane);
	ensureRootIsScheduled(root);
}

// schedule阶段入口
function ensureRootIsScheduled(root: FiberRootNode) {
	// 找出优先级最高的lane
	const updateLane = getHighestPriority(root.pendingLanes);
	const existingCallback = root.callbackNode;

	if (updateLane === NoLane) {
		if (existingCallback !== null) {
			unstable_cancelCallback(existingCallback);
		}
		root.callbackNode = null;
		root.callbackPriority = NoLane;
		return;
	}

	const curPriority = updateLane;
	const prevPriority = root.callbackPriority;
	// 优先级一样就不需要调度，会自动调度
	if (curPriority === prevPriority) {
		return;
	}
	// 剩下的情况就是优先级更高的任务进来了，如果之前还有正在进行的任务，那么就取消掉
	if (existingCallback !== null) {
		unstable_cancelCallback(existingCallback);
	}

	let newCallbackNode: CallbackNode | null = null;

	if (updateLane === SyncLane) {
		if (__DEV__) {
			console.log('在微任务中调度，优先级：', updateLane);
		}
		// 微任务
		scheduleSyncCallback(performSyncWorkOnRoot.bind(null, root));
		// 异步批量执行
		scheduleMicroTask(flushSyncCallbacks);
	} else {
		// 宏任务
		const schedulerPriority = lanesToSchedulerPriority(updateLane);
		newCallbackNode = scheduleCallback(
			schedulerPriority,
			// @ts-ignore
			performConcurrentWorkOnRoot.bind(null, root)
		);
	}

	root.callbackNode = newCallbackNode;
	root.callbackPriority = curPriority;
}

function markRootUpdated(root: FiberRootNode, lane: Lane) {
	root.pendingLanes = mergeLanes(root.pendingLanes, lane);
}

/** 往上面找到fiberRootNode */
function markUpdateFromFiberToRoot(fiber: FiberNode) {
	let node = fiber;
	let parent = node.return;
	// 存在return说明是普通fiber节点
	while (parent !== null) {
		node = parent;
		parent = node.return;
	}
	if (node.tag === HostRoot) {
		// hostRootFiber
		return node.stateNode;
	}

	return null;
}

function performConcurrentWorkOnRoot(
	root: FiberRootNode,
	didTimeout: boolean
): any {
	// 保证useEffect的回调执行：因为在回调中可能会产生优先级更高的任务，所以要去执行
	const curCallback = root.callbackNode;
	const didFlush = flushPassiveEffects(root.pendingPassiveEffects);
	if (didFlush) {
		// 说明产生了优先级更高的任务，那么当前任务不该执行
		if (root.callbackNode !== curCallback) {
			return null;
		}
	}

	const lane = getHighestPriority(root.pendingLanes);
	const curCallbackNode = root.callbackNode;
	if (lane === NoLane) {
		return null;
	}
	const needSync = lane === SyncLane || didTimeout;
	// render阶段

	const existStatus = renderRoot(root, lane, !needSync);

	ensureRootIsScheduled(root);

	if (existStatus === RootInComplete) {
		// 中断
		if (root.callbackNode !== curCallbackNode) {
			// 说明被插入了优先级更高的任务，那么当前任务打断
			return null;
		}
		// 继续调度
		return performConcurrentWorkOnRoot.bind(null, root);
	}

	if (existStatus === RootCompleted) {
		const finishedWork = root.current.alternate;
		root.finishedWork = finishedWork;
		root.finishedLane = lane;
		wipRootRenderLane = NoLane;
		// wip fiberNode树中的flags执行
		commitRoot(root);
	} else if (__DEV__) {
		console.error('还未实现同步更新结束状态');
	}
}

function performSyncWorkOnRoot(root: FiberRootNode) {
	const nextLane = getHighestPriority(root.pendingLanes);

	if (nextLane !== SyncLane) {
		// 其他比SyncLine低的优先级
		ensureRootIsScheduled(root);
		return;
	}

	const existStatus = renderRoot(root, nextLane, false);

	if (existStatus === RootCompleted) {
		const finishedWork = root.current.alternate;
		root.finishedWork = finishedWork;
		root.finishedLane = nextLane;
		wipRootRenderLane = NoLane;
		// wip fiberNode树中的flags执行
		commitRoot(root);
	} else if (__DEV__) {
		console.error('还未实现同步更新结束状态');
	}
}

function renderRoot(root: FiberRootNode, lane: Lane, shouldTimeSlice: boolean) {
	if (__DEV__) {
		console.log(`开始${shouldTimeSlice ? '并发' : '同步'}更新`, root);
	}

	if (wipRootRenderLane !== lane) {
		// 初始化
		prepareRefreshStack(root, lane);
	}

	do {
		try {
			shouldTimeSlice ? workLoopConcurrent() : workLoopSync();
			break;
		} catch (e) {
			if (__DEV__) {
				console.error('workLoop发生错误', e);
			}
			workInProgess = null;
		}
	} while (true);

	// 中断执行
	if (shouldTimeSlice && workInProgess !== null) {
		return RootInComplete;
	}
	// render阶段执行完
	if (!shouldTimeSlice && workInProgess !== null && __DEV__) {
		console.error('render阶段结束时wip不应该不是null');
	}
	// TODO:报错未处理

	return RootCompleted;
}

function flushPassiveEffects(pendingPassiveEffects: PendingPassiveEffects) {
	let didFlushPassiveEffect = false;
	// 先触发所有的unmount effect
	pendingPassiveEffects.unmount.forEach((effetc) => {
		didFlushPassiveEffect = true;
		commitHookEffectListUnmount(Passive, effetc);
	});
	pendingPassiveEffects.unmount = [];
	// 触发上次更新产生的destroy
	pendingPassiveEffects.update.forEach((effect) => {
		didFlushPassiveEffect = true;
		commitHookEffectListDestroy(Passive | HookHasEffect, effect);
	});
	// 触发本次更新的create
	pendingPassiveEffects.update.forEach((effect) => {
		didFlushPassiveEffect = true;
		commitHookEffectListCreate(Passive | HookHasEffect, effect);
	});

	pendingPassiveEffects.update = [];
	// TODO:  flushSyncCallback
	// 在回调过程中触发的更新，继续执行，比如setNum(1触发的)
	// useEffect(() => {
	// 	setNum(1)
	// }, [xxx])
	flushSyncCallbacks();

	return didFlushPassiveEffect;
}

function commitRoot(root: FiberRootNode) {
	const finishedWork = root.finishedWork;
	if (finishedWork === null) {
		return;
	}

	const lane = root.finishedLane;

	if (lane === NoLane && __DEV__) {
		console.log('commitRoot阶段不应该走到NoLane');
	}

	if (__DEV__) {
		console.log('开始执行commitRoot', finishedWork);
	}

	root.finishedWork = null;
	root.finishedLane = NoLane;

	markRootFinished(root, lane);

	// 当前组件的useEffect回调是否需要被执行
	if (
		(finishedWork.flags & PassiveMask) !== NoFlags ||
		(finishedWork.subtreeFlags & PassiveMask) !== NoFlags
	) {
		if (!rootDoseHasPassiveEffects) {
			rootDoseHasPassiveEffects = true;
			// 调度副作用   相当于在setTimeout中执行副作用
			scheduleCallback(NormalPriority, () => {
				flushPassiveEffects(root.pendingPassiveEffects);
				// 执行副作用
				return;
			});
		}
	}

	const subtreeHasEffect =
		(finishedWork.subtreeFlags & (MutationMask | PassiveMask)) !== NoFlags;
	const rootHasEffect =
		(finishedWork.flags & (MutationMask | PassiveMask)) !== NoFlags;

	if (subtreeHasEffect || rootHasEffect) {
		// 判断是否存在3个子阶段需要执行的操作
		// beforeMutation

		// 阶段2/3 mutation Placement
		commitMutationEffects(finishedWork, root);
		// current和workInProgress交换
		root.current = finishedWork;

		// 阶段3/3:Layout
		commitLayoutEffects(finishedWork, root);

		// layout
	} else {
		root.current = finishedWork;
	}

	rootDoseHasPassiveEffects = false;
	ensureRootIsScheduled(root);
}

function workLoopSync() {
	while (workInProgess !== null) {
		performUnitOfWork(workInProgess);
	}
}

function workLoopConcurrent() {
	while (workInProgess !== null && !unstable_shouldYield()) {
		performUnitOfWork(workInProgess);
	}
}

function performUnitOfWork(fiber: FiberNode) {
	const next = beginWork(fiber, wipRootRenderLane);
	fiber.memoizedProps = fiber.pendingProps;
	if (next !== null) {
		// 如果有子节点就继续遍历
		workInProgess = next;
	} else {
		// 没有子节点完成当前节点继续遍历兄弟节点
		completeUnitOfWork(fiber);
	}
}

function completeUnitOfWork(fiber: FiberNode) {
	let node: FiberNode | null = fiber;
	do {
		completeWork(node);
		const sibling = node.sibling;
		if (sibling !== null) {
			// 此时还没遍历兄弟节点，所以不能赋值给node
			workInProgess = sibling;
			return;
		}
		node = node.return;
		workInProgess = node;
	} while (node !== null);
}
