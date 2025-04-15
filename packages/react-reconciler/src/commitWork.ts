import {
	appendChildToContainer,
	commitUpdate,
	Container,
	hideInstance,
	hideTextInstance,
	insertChildToContainer,
	Instance,
	removeChild,
	unhideInstance,
	unhideTextInstance
} from 'hostConfig';
import { FiberNode, FiberRootNode, PendingPassiveEffects } from './fiber';
import {
	ChildDeletion,
	Flags,
	LayoutMask,
	MutationMask,
	NoFlags,
	PassiveEffect,
	PassiveMask,
	Placemement,
	Ref,
	Update,
	Visibility
} from './fiberFlags';
import {
	FunctionComponent,
	HostComponent,
	HostRoot,
	HostText,
	OffScreenComponent
} from './workTags';
import { Effect, FCUpdateQueue } from './fiberHooks';
import { HookHasEffect } from './hookEffectTags';

let nextEffect: FiberNode | null = null;

const commitMutationEffectsOnFiber = (
	finishedWork: FiberNode,
	root: FiberRootNode
) => {
	const { flags, tag } = finishedWork;

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
			commitDeletion(child, root);
		});
		// 操作完成以后移出deletion操作
		finishedWork.flags &= ~ChildDeletion;
	}
	// 收集useEffect回调
	if ((flags & PassiveEffect) !== NoFlags) {
		commitPassiveEffect(finishedWork, root, 'update');
		// 收集完成以后，移除
		finishedWork.flags &= ~PassiveEffect;
	}

	// 处理ref
	if ((flags & Ref) !== NoFlags && tag === HostComponent) {
		safelyDetachRef(finishedWork);
	}

	if ((flags & Visibility) !== NoFlags && tag === OffScreenComponent) {
		const isHidden = finishedWork.pendingProps.mode === 'hidden';
		// 隐藏或显示原生节点
		hideOrUnhideAllChildren(finishedWork, isHidden);
		finishedWork.flags &= ~Visibility;
	}
};

// 寻找根host节点，考虑到Fragment，可能存在多个
function findHostSubtreeRoot(
	finishedWork: FiberNode,
	callback: (hostSubtreeRoot: FiberNode) => void
) {
	let hostSubtreeRoot = null;
	let node = finishedWork;
	while (true) {
		if (node.tag === HostComponent) {
			if (hostSubtreeRoot === null) {
				// 还未发现 root，当前就是
				hostSubtreeRoot = node;
				callback(node);
			}
		} else if (node.tag === HostText) {
			if (hostSubtreeRoot === null) {
				// 还未发现 root，text可以是顶层节点
				callback(node);
			}
		} else if (
			node.tag === OffScreenComponent &&
			node.pendingProps.mode === 'hidden' &&
			node !== finishedWork
		) {
			// 隐藏的OffscreenComponent跳过
		} else if (node.child !== null) {
			node.child.return = node;
			node = node.child;
			continue;
		}

		if (node === finishedWork) {
			return;
		}

		while (node.sibling === null) {
			if (node.return === null || node.return === finishedWork) {
				return;
			}

			if (hostSubtreeRoot === node) {
				hostSubtreeRoot = null;
			}

			node = node.return;
		}

		// 去兄弟节点寻找，此时当前子树的host root可以移除了
		if (hostSubtreeRoot === node) {
			hostSubtreeRoot = null;
		}

		node.sibling.return = node.return;
		node = node.sibling;
	}
}

function hideOrUnhideAllChildren(finishedWork: FiberNode, isHidden: boolean) {
	findHostSubtreeRoot(finishedWork, (hostRoot) => {
		const instance = hostRoot.stateNode;
		if (hostRoot.tag === HostComponent) {
			isHidden ? hideInstance(instance) : unhideInstance(instance);
		} else if (hostRoot.tag === HostText) {
			isHidden
				? hideTextInstance(instance)
				: unhideTextInstance(instance, hostRoot.memoizedProps.content);
		}
	});
}

const commitLayoutEffectsOnFiber = (
	finishedWork: FiberNode,
	root: FiberRootNode
) => {
	const { flags, tag } = finishedWork;

	if ((flags & Ref) !== NoFlags && tag === HostComponent) {
		safelyAttachRef(finishedWork);
		// 操作完成以后移出placement操作
		finishedWork.flags &= ~Ref;
	}
};

function safelyAttachRef(fiber: FiberNode) {
	const ref = fiber.ref;
	if (ref !== null) {
		const instance = fiber.stateNode;
		if (typeof ref === 'function') {
			ref(instance);
		} else {
			ref.current = instance;
		}
	}
}

function safelyDetachRef(fiber: FiberNode) {
	const ref = fiber.ref;
	if (ref !== null) {
		if (typeof ref === 'function') {
			ref(null);
		} else {
			ref.current = null;
		}
	}
}

export const commitEffects = (
	pharse: 'mutation' | 'layout',
	mask: Flags,
	calback: (finishedWork: FiberNode, root: FiberRootNode) => void
) => {
	return (finishedWork: FiberNode, root: FiberRootNode) => {
		nextEffect = finishedWork;
		while (nextEffect) {
			// 向下遍历
			const child: FiberNode | null = nextEffect.child;
			if ((nextEffect.subtreeFlags & mask) !== NoFlags && child !== null) {
				nextEffect = child;
			} else {
				// 向上遍历
				up: while (nextEffect !== null) {
					calback(nextEffect, root);
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
};

export const commitMutationEffects = commitEffects(
	'mutation',
	MutationMask | PassiveMask,
	commitMutationEffectsOnFiber
);

export const commitLayoutEffects = commitEffects(
	'layout',
	LayoutMask,
	commitLayoutEffectsOnFiber
);

function commitPassiveEffect(
	fiber: FiberNode,
	root: FiberRootNode,
	type: keyof PendingPassiveEffects
) {
	if (
		fiber.tag !== FunctionComponent ||
		(type === 'update' && (fiber.flags & PassiveEffect) === NoFlags)
	) {
		// 如果当前不是函数组件不处理
		// 不触发useEffect也不需要收集
		return;
	}
	const updateQueue = fiber.updateQueue as FCUpdateQueue<any>;

	if (updateQueue !== null) {
		if (updateQueue.lastEffect === null) {
			if (__DEV__) {
				console.error('当FC存在PassiveEffect时，lastEffect不应该为null');
			}
			return;
		}
		root.pendingPassiveEffects[type].push(updateQueue.lastEffect);
	}
}

export function commitHookEffectList(
	flags: Flags,
	lastEffect: Effect,
	callback: (effect: Effect) => void
) {
	let effect = lastEffect.next;

	do {
		if (effect) {
			if ((effect.tag & flags) === flags) {
				callback(effect);
			}
			effect = effect.next;
		}
	} while (effect !== lastEffect.next);
}

// 触发组件卸载的回调
export function commitHookEffectListUnmount(flags: Flags, lastEffect: Effect) {
	commitHookEffectList(flags, lastEffect, (effect) => {
		const destroy = effect.destroy;
		if (typeof destroy === 'function') {
			destroy();
		}
		// 既然执行了destroy，就说明函数组件卸载了，那就移除副作用flag
		effect.tag &= ~HookHasEffect;
	});
}

// 触发上次更新的destroy
export function commitHookEffectListDestroy(flags: Flags, lastEffect: Effect) {
	commitHookEffectList(flags, lastEffect, (effect) => {
		const destroy = effect.destroy;
		if (typeof destroy === 'function') {
			destroy();
		}
	});
}

export function commitHookEffectListCreate(flags: Flags, lastEffect: Effect) {
	commitHookEffectList(flags, lastEffect, (effect) => {
		const create = effect.create;
		if (typeof create === 'function') {
			effect.destroy = create();
		}
	});
}

function recordHostChildrenToDelete(
	childrenToDelete: FiberNode[],
	unmountFiber: FiberNode
) {
	const lastOne = childrenToDelete[childrenToDelete.length - 1];

	if (!lastOne) {
		childrenToDelete.push(unmountFiber);
	} else {
		let node = lastOne.sibling;
		while (node !== null) {
			if (node === unmountFiber) {
				childrenToDelete.push(unmountFiber);
			}
			node = node.sibling;
		}
	}
}

function commitDeletion(childToDelete: FiberNode, root: FiberRootNode) {
	const rootChildrenToDelete: FiberNode[] = [];
	// 递归子树
	commitNestedComponent(childToDelete, (unMountFiber) => {
		switch (unMountFiber.tag) {
			case HostComponent:
				recordHostChildrenToDelete(rootChildrenToDelete, unMountFiber);
				// 解绑ref
				safelyDetachRef(unMountFiber);
				return;

			case HostText:
				recordHostChildrenToDelete(rootChildrenToDelete, unMountFiber);
				return;

			case FunctionComponent:
				// TODO: 解绑ref
				commitPassiveEffect(unMountFiber, root, 'unmount');
				return;

			default:
				if (__DEV__) {
					console.log('暂未实现的unmount类型', unMountFiber);
				}
				break;
		}
	});
	// 移出rootHostNode的DOM节点
	if (rootChildrenToDelete.length > 0) {
		const hostParent = getHostParent(childToDelete);
		if (hostParent) {
			rootChildrenToDelete.forEach((node) => {
				removeChild(node.stateNode, hostParent);
			});
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
