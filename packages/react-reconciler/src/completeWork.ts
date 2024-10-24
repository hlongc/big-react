import {
	appendInitialChild,
	createInstance,
	createTextInstance
} from 'hostConfig';
import { FiberNode } from './fiber';
import { HostComponent, HostRoot, HostText } from './workTags';
import { NoFlags } from './fiberTags';

export function completeWork(wip: FiberNode) {
	// 递归中的归
	// 对于Host类型构建离屏DOM树
	// TODO: 标记Update Flag

	const nextProps = wip.pendingProps;
	const current = wip.alternate;

	switch (wip.tag) {
		case HostComponent:
			if (current !== null && wip.stateNode) {
				// update
			} else {
				// 1.构建DOM
				const instance = createInstance(wip.type, nextProps);
				// 2.将DOM插入DOM树
				appendAllChildren(instance, wip);
				wip.stateNode = instance;
			}
			bubbleProperties(wip);
			break;
		case HostText:
			if (current !== null && wip.stateNode) {
				// update
			} else {
				// 1.构建DOM
				const instance = createTextInstance(nextProps.content);
				wip.stateNode = instance;
			}
			bubbleProperties(wip);
			break;
		case HostRoot:
			bubbleProperties(wip);
			return null;

		default:
			if (__DEV__) {
				console.warn('未处理的completeWork类型', wip);
			}
			break;
	}
}
// 利用completeWork向上遍历(归)的流畅，将fiberNode的flags冒泡到父fiberNode
/**
 * <div>
 *    <A>
 *      <span>hello</span>
 *    </A>
 *    <B>
 *      <p></p>
 *    </B>
 * </div>
 */
function appendAllChildren(returnFiber: FiberNode, wip: FiberNode) {
	let node = wip.child;

	while (node !== null) {
		if (node.tag === HostComponent || node.tag === HostText) {
			// 遇到原生html标签和文本节点就进行插入：<span>hello</span> <p></p>
			appendInitialChild(returnFiber, node.stateNode);
		} else if (node.child !== null) {
			// 如果遇到<A></A>和<B></B>，那么就继续往下面找到原生html
			node.child.return = node;
			node = node.child;
			continue;
		}

		if (node === wip) {
			// 从child往上面回来时，遇到自己了就结束
			return;
		}
		// 处理到最后的hello文本以后，没有兄弟节点了，向父节点遍历
		while (node.sibling === null) {
			if (node.return === null || node.return === wip) {
				return;
			}
			node = node?.return;
		}
		// 遍历到 -> span -> A，最后遇到了兄弟节<B></B>，开始处理兄弟节点
		node.sibling.return = node.return;
		node = node.sibling;
	}
}

/** 将子节点和子节点的兄弟节点的flag冒泡到当前节点 */
function bubbleProperties(wip: FiberNode) {
	let child = wip.child;
	let subtreeFlags = NoFlags;

	while (child !== null) {
		subtreeFlags |= child.subtreeFlags;
		subtreeFlags |= child.flags;

		child.return = wip;
		child = child.sibling;
	}

	wip.subtreeFlags |= subtreeFlags;
}
