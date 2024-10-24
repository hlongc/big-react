import { ReactElementType } from 'shared/ReactTypes';
import { FiberNode } from './fiber';
import { processUpdateQueue, UpdateQueue } from './updateQueue';
import { HostComponent, HostRoot, HostText } from './workTags';
import { mountChildren, reconcilerChildren } from './childFibers';

export function beginWork(wip: FiberNode) {
	// 递归中的递 返回子节点

	switch (wip.tag) {
		case HostRoot:
			return updateHostRoot(wip);
		case HostComponent:
			return updateHostComponent(wip);
		case HostText:
			return null;

		default:
			if (__DEV__) {
				console.warn('beginWork暂未实现其他类型');
			}
			break;
	}
}

function updateHostRoot(wip: FiberNode) {
	const baseState = wip.memoziedState;
	const updateQueue = wip.updateQueue as UpdateQueue<Element>;
	const pendingUpdate = updateQueue.shared.pending;
	// 重置更新队列
	updateQueue.shared.pending = null;
	// 计算出最新的值
	const { memoziedState } = processUpdateQueue(baseState, pendingUpdate);
	wip.memoziedState = memoziedState;

	const nextChilren = memoziedState;
	reconcileChildren(wip, nextChilren);

	return wip.child;
}

function updateHostComponent(wip: FiberNode) {
	// HostComponent无法自己更新，所以不需要计算最新值，直接生成子fiber
	const nextProps = wip.pendingProps;
	const nextChildren = nextProps.children;
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
