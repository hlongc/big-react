import { ReactElementType } from 'shared/ReactTypes';
import {
	createFiberFromFragment,
	createFiberFromOffScreen,
	createWornInProgress,
	FiberNode,
	OffScreenProps
} from './fiber';
import { processUpdateQueue, UpdateQueue } from './updateQueue';
import {
	ContextProvider,
	Fragment,
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText,
	OffScreenComponent,
	SuspenseComponent
} from './workTags';
import { mountChildren, reconcilerChildren } from './childFibers';
import { renderWithHook } from './fiberHooks';
import { Lane } from './fiberLanes';
import { ChildDeletion, Placemement, Ref } from './fiberFlags';
import { pushContext } from './fiberContext';

export function beginWork(wip: FiberNode, renderLane: Lane) {
	// 递归中的递 返回子节点

	switch (wip.tag) {
		case HostRoot:
			return updateHostRoot(wip, renderLane);
		case HostComponent:
			return updateHostComponent(wip);
		case FunctionComponent:
			return updateFunctionComponent(wip, renderLane);
		case HostText:
			return null;
		case Fragment:
			return updateFragment(wip);
		case ContextProvider:
			return updateContextProvider(wip);
		case SuspenseComponent:
			return updateSuspenseComponent(wip);
		case OffScreenComponent:
			return updateOffScreenComponent(wip);

		default:
			if (__DEV__) {
				console.warn('beginWork暂未实现其他类型');
			}
			break;
	}

	return null;
}

function updateSuspenseComponent(wip: FiberNode) {
	const nextProps = wip.pendingProps;
	const current = wip.alternate;

	let showFallback = false;
	const didSuspense = true;

	if (didSuspense) {
		showFallback = true;
	}

	const nextPrimaryChildren = nextProps.children;
	const nextFallbackChildren = nextProps.fallback;

	if (current === null) {
		// mount
		if (showFallback) {
			// 挂起
			return mountSuspenseFallbackChildren(
				wip,
				nextPrimaryChildren,
				nextFallbackChildren
			);
		} else {
			return mountSuspensePrimaryChildren(wip, nextPrimaryChildren);
		}
	} else {
		// update
		if (showFallback) {
			return updateSuspenseFallbackChildren(
				wip,
				nextPrimaryChildren,
				nextFallbackChildren
			);
		} else {
			return updateSuspensePrimaryChildren(wip, nextPrimaryChildren);
		}
	}
}

function updateSuspensePrimaryChildren(wip: FiberNode, primaryChildren: any) {
	const current = wip.alternate as FiberNode;

	// 优先复用之前的，需要保持状态
	const currentPrimaryChildFragment = current.child as FiberNode;
	const currentFallbackChildFragment = currentPrimaryChildFragment?.sibling;

	const primaryProps: OffScreenProps = {
		mode: 'visible',
		children: primaryChildren
	};

	const primaryChildFragment = createWornInProgress(
		currentPrimaryChildFragment,
		primaryProps
	);
	// 删除fallback节点
	if (currentFallbackChildFragment) {
		if (wip.deletion === null) {
			wip.deletion = [currentFallbackChildFragment];
			wip.flags |= ChildDeletion;
		} else {
			wip.deletion.push(currentFallbackChildFragment);
			// 这里为什么不调整flags呢，因为如果存在这个数组，说明flag已经存在ChildDeletion了
		}
	}

	wip.child = primaryChildFragment;
	primaryChildFragment.return = wip;
	primaryChildFragment.sibling = null;

	return primaryChildFragment;
}

function updateSuspenseFallbackChildren(
	wip: FiberNode,
	primaryChildren: any,
	fallbackChildren: any
) {
	const current = wip.alternate as FiberNode;
	// 优先复用之前的，需要保持状态
	const currentPrimaryChildFragment = current.child as FiberNode;
	const currentFallbackChildFragment = currentPrimaryChildFragment?.sibling;

	const primaryProps: OffScreenProps = {
		mode: 'hidden',
		children: primaryChildren
	};

	const primaryChildFragment = createWornInProgress(
		currentPrimaryChildFragment,
		primaryProps
	);
	let fallbackChildFragment;

	if (currentFallbackChildFragment) {
		fallbackChildFragment = createWornInProgress(currentFallbackChildFragment, {
			children: fallbackChildren
		});
	} else {
		fallbackChildFragment = createFiberFromFragment(fallbackChildren, null);
		fallbackChildFragment.flags |= Placemement;
	}

	primaryChildFragment.return = wip;
	fallbackChildFragment.return = wip;

	primaryChildFragment.sibling = fallbackChildFragment;
	wip.child = primaryChildFragment;

	return fallbackChildFragment;
}

function mountSuspensePrimaryChildren(wip: FiberNode, primaryChildren: any) {
	const primaryProps: OffScreenProps = {
		mode: 'visible',
		children: primaryChildren
	};

	const primaryChildFragment = createFiberFromOffScreen(primaryProps);
	wip.child = primaryChildFragment;
	primaryChildFragment.return = wip;

	return primaryChildFragment;
}

function mountSuspenseFallbackChildren(
	wip: FiberNode,
	primaryChildren: any,
	fallbackChildren: any
) {
	const primaryProps: OffScreenProps = {
		mode: 'hidden',
		children: primaryChildren
	};

	const primaryChildFragment = createFiberFromOffScreen(primaryProps);
	const fallbackChildFragment = createFiberFromFragment(fallbackChildren, null);

	fallbackChildFragment.flags |= Placemement;

	primaryChildFragment.return = wip;
	fallbackChildFragment.return = wip;

	primaryChildFragment.sibling = fallbackChildFragment;
	wip.child = primaryChildFragment;

	return fallbackChildFragment;
}

function updateOffScreenComponent(wip: FiberNode) {
	const nextProps = wip.pendingProps;
	const nextChildren = nextProps.children;
	reconcileChildren(wip, nextChildren);

	return wip.child;
}

function updateContextProvider(wip: FiberNode) {
	const providerType = wip.type;
	const context = providerType._context;

	const newProps = wip.pendingProps;
	const nextChildren = newProps.children;

	pushContext(context, newProps.value);
	reconcileChildren(wip, nextChildren);

	return wip.child;
}

function updateFragment(wip: FiberNode) {
	// TODO:为什么不是取wip.pendingProps.children
	const nextChildren = wip.pendingProps;
	reconcileChildren(wip, nextChildren);

	return wip.child;
}

function updateFunctionComponent(wip: FiberNode, renderLane: Lane) {
	const nextChildren = renderWithHook(wip, renderLane);
	reconcileChildren(wip, nextChildren);

	return wip.child;
}

function updateHostRoot(wip: FiberNode, renderLane: Lane) {
	const baseState = wip.memoziedState as Element;
	const updateQueue = wip.updateQueue as UpdateQueue<Element>;
	const pending = updateQueue.shared.pending;
	// 重置更新队列
	updateQueue.shared.pending = null;
	// 计算出最新的值
	const { memoziedState } = processUpdateQueue<Element>(
		baseState,
		pending,
		renderLane
	);
	wip.memoziedState = memoziedState;

	const nextChilren = wip.memoziedState as ReactElementType;
	reconcileChildren(wip, nextChilren);

	return wip.child;
}

function updateHostComponent(wip: FiberNode) {
	// HostComponent无法自己更新，所以不需要计算最新值，直接生成子fiber
	const nextProps = wip.pendingProps;
	const nextChildren = nextProps.children;
	// 更新ref
	markRef(wip.alternate, wip);
	reconcileChildren(wip, nextChildren);

	return wip.child;
}

function reconcileChildren(wip: FiberNode, children?: ReactElementType) {
	const current = wip.alternate;

	if (current !== null) {
		// update
		// 首屏渲染时hostRootFiber会走到这里来，执行placement操作，一次性挂载
		wip.child = reconcilerChildren(wip, current.child, children);
	} else {
		// mount
		wip.child = mountChildren(wip, null, children);
	}
}
// 标记更新ref
function markRef(currentFiber: FiberNode | null, workInProgess: FiberNode) {
	const ref = workInProgess.ref;
	// 初次挂载或者后续更新ref引用发生变化时才标记
	if (
		(currentFiber === null && ref !== null) ||
		(currentFiber !== null && ref !== currentFiber.ref)
	) {
		workInProgess.flags |= Ref;
	}
}
