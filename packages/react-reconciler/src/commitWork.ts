import {
	appendChildToContainer,
	commitUpdate,
	Container,
	insertChildToContainer,
	Instance,
	removeChild
} from 'hostConfig';
import { FiberNode, FiberRootNode } from './fiber';
import {
	ChildDeletion,
	MutationMask,
	NoFlags,
	Placemement,
	Update
} from './fiberTags';
import {
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText
} from './workTags';

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
	if ((flags & Update) !== NoFlags) {
		commitUpdate(finishedWork);
		// 操作完成以后移出update操作
		finishedWork.flags &= ~Update;
	}
	// flags deletion
	if ((flags & ChildDeletion) !== NoFlags) {
		const deletion = finishedWork.deletion;
		deletion?.forEach((child) => {
			commitDeletion(child);
		});
		// 操作完成以后移出deletion操作
		finishedWork.flags &= ~ChildDeletion;
	}
};

function commitDeletion(childToDelete: FiberNode) {
	let rootHostNode: FiberNode | null = null;
	// 递归子树
	commitNestedComponent(childToDelete, (unMountFiber) => {
		switch (unMountFiber.tag) {
			case HostComponent:
				if (rootHostNode === null) {
					rootHostNode = unMountFiber;
				}
				// TODO:解绑ref
				return;

			case HostText:
				if (rootHostNode === null) {
					rootHostNode = unMountFiber;
				}
				return;

			case FunctionComponent:
				// TODO: useEffect unmount
				return;

			default:
				if (__DEV__) {
					console.log('暂未实现的unmount类型', unMountFiber);
				}
				break;
		}
	});
	// 移出rootHostNode的DOM节点
	if (rootHostNode !== null) {
		const hostParent = getHostParent(childToDelete);
		if (hostParent) {
			removeChild((rootHostNode as FiberNode).stateNode, hostParent);
		}
	}

	childToDelete.return = null;
	childToDelete.child = null;
}

function commitNestedComponent(
	root: FiberNode,
	onCommitUnmount: (node: FiberNode) => void
) {
	let node: FiberNode | null = root;
	while (true) {
		if (node) {
			onCommitUnmount(node);

			if (node.child !== null) {
				// 向下递归
				node.child.return = node;
				node = node.child;
				continue;
			}

			if (node === root) {
				// 向上回溯到了根节点就不处理了
				return;
			}
			// 如果没有兄弟节点就处理父节点
			while (node.sibling === null) {
				if (node.return === null || node.return === root) {
					return;
				}
				// 向上回溯
				node = node?.return;
			}

			node.sibling.return = node.return;
			node = node.sibling;
		}
	}
}

function commitPlacement(finishedWork: FiberNode) {
	// finishedWork DOM
	if (__DEV__) {
		console.log('执行placement操作', finishedWork);
	}
	// 得到父节点
	// parent DOM
	const hostParent = getHostParent(finishedWork);

	// host sibling
	const sibling = getHostSibling(finishedWork);
	if (hostParent !== null) {
		// 把当前fiber真实dom插入父节点
		insertOrAppendPlacementNodeIntoContainer(finishedWork, hostParent, sibling);
	}
}

function getHostSibling(fiber: FiberNode) {
	let node: FiberNode = fiber;
	findSibling: while (true) {
		while (node.sibling === null) {
			const parent = node.return;

			if (
				parent === null ||
				parent.tag === HostText ||
				parent.tag === HostComponent
			) {
				return null;
			}
			node = parent;
		}

		node.sibling.return = node.return;
		node = node.sibling;

		while (![HostText, HostComponent].includes(node.tag)) {
			// 向下遍历
			if ((node.flags & Placemement) !== NoFlags) {
				continue findSibling;
			}
			if (node.child === null) {
				continue findSibling;
			} else {
				node.child.return = node;
				node = node.child;
			}
		}
		// 找到了HostText、HostComponent并且是稳定的节点就返回
		if ((node.flags & Placemement) === NoFlags) {
			return node.stateNode;
		}
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
function insertOrAppendPlacementNodeIntoContainer(
	finishedWork: FiberNode,
	hostParent: Container,
	before?: Instance
) {
	const tag = finishedWork.tag;
	// 如果当前节点就是真实节点，那么就直接插入
	if ([HostComponent, HostText].includes(tag)) {
		if (before) {
			insertChildToContainer(hostParent, finishedWork.stateNode, before);
		} else {
			// div 和文本节点
			appendChildToContainer(hostParent, finishedWork.stateNode);
		}

		return;
	}
	// 否则往下面找到真实dom
	const child = finishedWork.child;
	if (child !== null) {
		// 完成child以后把child的兄弟节点也完成
		insertOrAppendPlacementNodeIntoContainer(child, hostParent);
		let sibling = child.sibling;
		while (sibling !== null) {
			insertOrAppendPlacementNodeIntoContainer(sibling, hostParent);
			sibling = sibling.sibling;
		}
	}
}
