import { appendChildToContainer, Container } from 'hostConfig';
import { FiberNode, FiberRootNode } from './fiber';
import { MutationMask, NoFlags, Placemement } from './fiberTags';
import { HostComponent, HostRoot, HostText } from './workTags';

let nextEffect: FiberNode | null = null;

export const commitMutationEffects = (finishedWork: FiberNode) => {
	nextEffect = finishedWork;
	while (nextEffect) {
		// 向下遍历
		const child: FiberNode | null = nextEffect.child;
		if (
			(nextEffect.subtreeFlags & MutationMask) !== NoFlags &&
			child !== null
		) {
			nextEffect = child;
		} else {
			// 向上遍历
			up: while (nextEffect !== null) {
				commitMutationEffectsOnFiber(nextEffect);
				const sibling: FiberNode | null = nextEffect.sibling;
				// 如果存在兄弟节点，就继续处理兄弟节点，否则返回父节点
				if (sibling !== null) {
					nextEffect = sibling;
					break up;
				}

				nextEffect = nextEffect.return;
			}
		}
	}
};

const commitMutationEffectsOnFiber = (finishedWork: FiberNode) => {
	const flags = finishedWork.flags;

	if ((flags & Placemement) !== NoFlags) {
		commitPlacement(finishedWork);
		// 操作完成以后移出placement操作
		finishedWork.flags &= ~Placemement;
	}
	// flags update
	// flags deletion
};

function commitPlacement(finishedWork: FiberNode) {
	// parent DOM
	// finishedWork DOM
	if (__DEV__) {
		console.log('执行placement操作', finishedWork);
	}
	// 得到父节点
	const hostParent = getHostParent(finishedWork);
	if (hostParent !== null) {
		// 把当前fiber真实dom插入父节点
		appendPlacementNodeIntoContainer(finishedWork, hostParent);
	}
}

function getHostParent(fiber: FiberNode): Container | null {
	let parent = fiber.return;

	while (parent) {
		const tag = parent.tag;
		if (tag === HostComponent) {
			// 对应原生html标签: div p span
			return parent.stateNode as Container;
		}
		if (tag === HostRoot) {
			return (parent.stateNode as FiberRootNode).container;
		}
		parent = parent.return;
	}

	if (__DEV__) {
		console.log('未找到父节点');
	}

	return null;
}

// 将真实dom添加到父节点中
function appendPlacementNodeIntoContainer(
	finishedWork: FiberNode,
	hostParent: Container
) {
	const tag = finishedWork.tag;
	// 如果当前节点就是真实节点，那么就直接插入
	if ([HostComponent, HostText].includes(tag)) {
		// div 和文本节点
		appendChildToContainer(hostParent, finishedWork.stateNode);
		return;
	}
	// 否则往下面找到真实dom
	const child = finishedWork.child;
	if (child !== null) {
		// 完成child以后把child的兄弟节点也完成
		appendPlacementNodeIntoContainer(child, hostParent);
		let sibling = child.sibling;
		while (sibling !== null) {
			appendPlacementNodeIntoContainer(sibling, hostParent);
			sibling = sibling.sibling;
		}
	}
}
