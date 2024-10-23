import { beginWork } from './beginWork';
import { completeWork } from './completeWork';
import { createWornInProgress, FiberNode, FiberRootNode } from './fiber';
import { HostRoot } from './workTags';

let workInProgess: FiberNode | null = null;

function prepareRefreshStack(root: FiberRootNode) {
	workInProgess = createWornInProgress(root.current, {});
}

export function scheduleUpdateOnFiber(fiber: FiberNode) {
	// 调度功能
	const root = markUpdateFromFiberToRoot(fiber);
	renderRoot(root);
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

function renderRoot(root: FiberRootNode) {
	prepareRefreshStack(root);
	do {
		try {
			workLoop();
			break;
		} catch (e) {
			workInProgess = null;
		}
	} while (workInProgess !== null);
}

function workLoop() {
	while (workInProgess !== null) {
		performUnitOfWork(workInProgess);
	}
}

function performUnitOfWork(fiber: FiberNode) {
	const next = beginWork(fiber);
	fiber.memoizedProps = fiber.pendingProps;
	if (next !== null) {
		// 如果有子节点就继续遍历
		workInProgess = next;
	} else {
		// 没有子节点完成当前节点继续遍历兄弟节点
		completeUnitOfWork(next);
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
