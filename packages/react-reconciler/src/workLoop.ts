import { scheduleMicroTask } from 'hostConfig';
import {
	unstable_scheduleCallback as scheduleCallback,
	unstable_NormalPriority as NormalPriority
} from 'scheduler';
import { beginWork } from './beginWork';
import {
	commitHookEffectListCreate,
	commitHookEffectListDestroy,
	commitHookEffectListUnmount,
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
	markRootFinished,
	mergeLanes,
	NoLane,
	SyncLane
} from './fiberLanes';
import { MutationMask, NoFlags, PassiveMask } from './fiberFlags';
import { flushSyncQueue, scheduleSyncQueue } from './syncTaskQueue';
import { HostRoot } from './workTags';
import { HookHasEffect, Passive } from './hookEffectTags';

let workInProgess: FiberNode | null = null;
let wipRootRenderLane: Lane = NoLane;
let rootDoseHasPassiveEffects = false;

function prepareRefreshStack(root: FiberRootNode, lane: Lane) {
	workInProgess = createWornInProgress(root.current, {});
	wipRootRenderLane = lane;
}

export function scheduleUpdateOnFiber(fiber: FiberNode, lane: Lane) {
	// 调度功能
	const root = markUpdateFromFiberToRoot(fiber);
	markRootUpdated(root, lane);
	ensureRootIsSchedule(root);
}

// schedule阶段入口
function ensureRootIsSchedule(root: FiberRootNode) {
	// 找出优先级最高的lane
	const updateLane = getHighestPriority(root.pendingLanes);
	if (updateLane === NoLane) {
		return;
	}

	if (updateLane === SyncLane) {
		if (__DEV__) {
			console.log('在微任务中调度，优先级：', updateLane);
		}
		// 微任务
		scheduleSyncQueue(performSyncWorkOnRoot.bind(null, root, updateLane));
		// 异步批量执行
		scheduleMicroTask(flushSyncQueue);
	} else {
		// 宏任务
	}
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

function performSyncWorkOnRoot(root: FiberRootNode, lane: Lane) {
	const nextLane = getHighestPriority(root.pendingLanes);

	if (nextLane !== SyncLane) {
		ensureRootIsSchedule(root);
		return;
	}

	if (__DEV__) {
		console.log('render阶段开始');
	}

	prepareRefreshStack(root, lane);
	do {
		try {
			workLoop(lane);
			break;
		} catch (e) {
			if (__DEV__) {
				console.error('workLoop发生错误', e);
			}
			workInProgess = null;
		}
	} while (true);

	const finishedWork = root.current.alternate;
	root.finishedWork = finishedWork;
	root.finishedLane = lane;
	wipRootRenderLane = NoLane;
	// wip fiberNode树中的flags执行
	commitRoot(root);
}

function flushPassiveEffects(pendingPassiveEffects: PendingPassiveEffects) {
	// 先触发所有的unmount effect
	pendingPassiveEffects.unmount.forEach((effetc) => {
		commitHookEffectListUnmount(Passive, effetc);
	});
	pendingPassiveEffects.unmount = [];
	// 触发上次更新产生的destroy
	pendingPassiveEffects.update.forEach((effect) => {
		commitHookEffectListDestroy(Passive | HookHasEffect, effect);
	});
	// 触发本次更新的create
	pendingPassiveEffects.update.forEach((effect) => {
		commitHookEffectListCreate(Passive | HookHasEffect, effect);
	});

	pendingPassiveEffects.update = [];
	// TODO:  flushSyncCallback
	// 在回调过程中触发的更新，继续执行，比如setNum(1触发的)
	// useEffect(() => {
	// 	setNum(1)
	// }, [xxx])
	flushSyncQueue();
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
		(finishedWork.subtreeFlags & MutationMask) !== NoFlags;
	const rootHasEffect = (finishedWork.flags & MutationMask) !== NoFlags;

	if (subtreeHasEffect || rootHasEffect) {
		// 判断是否存在3个子阶段需要执行的操作
		// beforeMutation

		// mutation Placement
		commitMutationEffects(finishedWork, root);
		// current和workInProgress交换
		root.current = finishedWork;

		// layout
	} else {
		root.current = finishedWork;
	}

	rootDoseHasPassiveEffects = false;
	ensureRootIsSchedule(root);
}

function workLoop(renderLane: Lane) {
	while (workInProgess !== null) {
		performUnitOfWork(workInProgess, renderLane);
	}
}

function performUnitOfWork(fiber: FiberNode, renderLane: Lane) {
	const next = beginWork(fiber, renderLane);
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
