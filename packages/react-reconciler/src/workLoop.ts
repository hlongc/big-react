import { beginWork } from './beginWork';
import { completeWork } from './completeWork';
import { FiberNode } from './fiber';

let workInProgess: FiberNode | null = null;

function prepareRefreshStack(fiber: FiberNode) {
	workInProgess = fiber;
}

function renderRoot(root: FiberNode) {
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
