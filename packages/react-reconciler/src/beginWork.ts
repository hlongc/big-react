import { ReactElementType } from 'shared/ReactTypes';
import { FiberNode } from './fiber';
import { processUpdateQueue, UpdateQueue } from './updateQueue';
import {
	ContextProvider,
	Fragment,
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText
} from './workTags';
import { mountChildren, reconcilerChildren } from './childFibers';
import { renderWithHook } from './fiberHooks';
import { Lane } from './fiberLanes';
import { Ref } from './fiberFlags';
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

		default:
			if (__DEV__) {
				console.warn('beginWork暂未实现其他类型');
			}
			break;
	}

	return null;
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
