import { Key, Props, ReactElementType } from 'shared/ReactTypes';
import {
	createFiberFromElement,
	createFiberFromFragment,
	createWornInProgress,
	FiberNode
} from './fiber';
import { REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE } from 'shared/ReactSymbols';
import { Fragment, HostText } from './workTags';
import { ChildDeletion, Placemement } from './fiberFlags';

type ExistingChildren = Map<string | number, FiberNode>;

function ChildReconciler(shouldTrackEffects: boolean) {
	function deleteChild(returnFiber: FiberNode, childToDelete: FiberNode) {
		if (!shouldTrackEffects) return;
		const deletion = returnFiber.deletion;
		if (deletion === null) {
			returnFiber.deletion = [childToDelete];
			returnFiber.flags |= ChildDeletion;
		} else {
			deletion.push(childToDelete);
		}
	}

	function deleteRemainingChildren(
		returnFiber: FiberNode,
		currentFirstChild: FiberNode | null
	) {
		if (!shouldTrackEffects) return;

		let childToDelete = currentFirstChild;
		while (childToDelete !== null) {
			deleteChild(returnFiber, childToDelete);
			childToDelete = childToDelete.sibling;
		}
	}

	function reconcileSingleElement(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		element: ReactElementType
	) {
		while (currentFiber !== null) {
			// update阶段
			if (currentFiber.key === element.key) {
				if (element.$$typeof === REACT_ELEMENT_TYPE) {
					if (currentFiber.type === element.type) {
						let props = element.props;
						if (element.type === REACT_FRAGMENT_TYPE) {
							// TODO: 不是很懂，为什么fragment要拆出来
							props = element.props.children;
						}
						// 复用
						const existing = useFiber(currentFiber, props);
						existing.return = returnFiber;
						// 删除剩余的兄弟节点
						deleteRemainingChildren(returnFiber, currentFiber.sibling);
						return existing;
					}

					// type不同，也不能复用
					deleteRemainingChildren(returnFiber, currentFiber);
					break;
				} else {
					if (__DEV__) {
						console.log('暂未实现的类型', element);
						break;
					}
				}
			} else {
				// key不同，删除当前fiber，继续遍历兄弟节点
				deleteChild(returnFiber, currentFiber);
				currentFiber = currentFiber.sibling;
			}
		}
		// 根据element创建fiber
		let fiber: FiberNode;

		if (element.type === REACT_FRAGMENT_TYPE) {
			fiber = createFiberFromFragment(element.props.children, element.key);
		} else {
			fiber = createFiberFromElement(element);
		}

		fiber.return = returnFiber;
		return fiber;
	}

	function reconcileSingleTextNode(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		content: string | number
	) {
		while (currentFiber !== null) {
			// update
			if (currentFiber.tag === HostText) {
				const existing = useFiber(currentFiber, { content });
				existing.return = returnFiber;

				deleteRemainingChildren(returnFiber, currentFiber.sibling);
				return existing;
			}
			// 从<div></div> => 哈哈哈  ，把之前的div删掉，继续看兄弟节点是否能复用
			deleteChild(returnFiber, currentFiber);
			currentFiber = currentFiber.sibling;
		}
		const fiber = new FiberNode(HostText, { content }, null);
		fiber.return = returnFiber;
		return fiber;
	}

	function placeSingleChild(fiber: FiberNode) {
		if (shouldTrackEffects && fiber.alternate === null) {
			// 对应首屏渲染
			fiber.flags |= Placemement;
		}

		return fiber;
	}

	function getElementKeyToUse(element: any, index?: number) {
		if (
			Array.isArray(element) ||
			typeof element === 'number' ||
			typeof element === 'string' ||
			element === undefined ||
			element === null
		) {
			return index;
		}

		return element.key ?? index;
	}

	function reconcileChildrenArray(
		returnFiber: FiberNode,
		currentFirstChild: FiberNode | null,
		newChild: any[]
	) {
		// 最后一个可复用fiber在current中的index
		let lastPlacedIndex = 0;
		let lastNewFiber: FiberNode | null = null;
		let firstNewFiber: FiberNode | null = null;

		const existingChildren: ExistingChildren = new Map();

		// 1.将current保存在map中
		let current = currentFirstChild;
		while (current !== null) {
			const keyToUse = getElementKeyToUse(current, current.index);
			existingChildren.set(keyToUse, current);
			current = current.sibling;
		}

		// 2.遍历newChild，寻找可复用的fiber
		for (let i = 0; i < newChild.length; i++) {
			const after = newChild[i];
			const newFiber = updateFromMap(returnFiber, existingChildren, i, after);

			if (newFiber === null) {
				continue;
			}
			// 3.标记移动还是插入
			newFiber.index = i;
			newFiber.return = returnFiber;

			if (lastNewFiber === null) {
				lastNewFiber = newFiber;
				firstNewFiber = newFiber;
			} else {
				lastNewFiber.sibling = newFiber;
				lastNewFiber = lastNewFiber.sibling;
			}

			if (!shouldTrackEffects) {
				continue;
			}

			const current = newFiber.alternate;
			if (current !== null) {
				const oldIndex = current.index;
				if (oldIndex < lastPlacedIndex) {
					// 移动
					newFiber.flags |= Placemement;
					continue;
				} else {
					lastPlacedIndex = oldIndex;
				}
			} else {
				// mount
				newFiber.flags |= Placemement;
			}
		}

		// 4.将map中剩下的标记为删除
		existingChildren.forEach((fiber) => {
			deleteChild(returnFiber, fiber);
		});

		return firstNewFiber;
	}

	function updateFromMap(
		returnFiber: FiberNode,
		existingChildren: ExistingChildren,
		index: number,
		element: any
	): FiberNode | null {
		const keyToUse = getElementKeyToUse(element, index);
		const before = existingChildren.get(keyToUse);

		// HostText
		if (['number', 'string'].includes(typeof element)) {
			if (before?.tag === HostText) {
				// 如果可以复用，就把老的从缓存里面删掉，因为缓存里面最终剩下的是需要删除的
				existingChildren.delete(keyToUse);
				return useFiber(before, { content: element + '' });
			} else {
				return new FiberNode(HostText, { content: element + '' }, null);
			}
		}

		// ReactElement
		if (typeof element === 'object' && element !== null) {
			switch (element.$$typeof) {
				case REACT_ELEMENT_TYPE:
					if (element.type === REACT_FRAGMENT_TYPE) {
						return updateFragment(
							returnFiber,
							before,
							element,
							keyToUse,
							existingChildren
						);
					}
					if (before && before?.type === element.type) {
						existingChildren.delete(keyToUse);
						return useFiber(before, element.props);
					}
					return createFiberFromElement(element);

				default:
					break;
			}
		}

		if (Array.isArray(element)) {
			// 数组当成fragment来处理
			return updateFragment(
				returnFiber,
				before,
				element,
				keyToUse,
				existingChildren
			);
		}

		// TODO:  数组类型
		if (Array.isArray(element) && __DEV__) {
			console.log('数组类型暂未实现');
		}

		return null;
	}

	return function reconcileChildFibers(
		returnFiber: FiberNode,
		currentFiber: FiberNode | null,
		newChild?: any
	) {
		const isUnkeyedTopLevelFragment =
			typeof newChild === 'object' &&
			newChild !== null &&
			newChild.type === REACT_FRAGMENT_TYPE &&
			newChild.key === null;

		if (isUnkeyedTopLevelFragment) {
			// <> <div></div><span></span> </> => <div></div><span></span>
			newChild = newChild.props.children;
		}

		// 判断当前fiber类型
		if (typeof newChild === 'object' && newChild !== null) {
			// 节点类型 ul > 3 * li
			if (Array.isArray(newChild)) {
				return reconcileChildrenArray(returnFiber, currentFiber, newChild);
			}
			switch (newChild.$$typeof) {
				case REACT_ELEMENT_TYPE:
					// 单个react element
					return placeSingleChild(
						reconcileSingleElement(returnFiber, currentFiber, newChild)
					);

				default:
					if (__DEV__) {
						console.warn('未实现的reconcile类型', newChild);
					}
					break;
			}
		}

		if (typeof newChild === 'string' || typeof newChild === 'number') {
			return placeSingleChild(
				reconcileSingleTextNode(returnFiber, currentFiber, newChild)
			);
		}

		if (currentFiber !== null) {
			// 兜底
			deleteRemainingChildren(returnFiber, currentFiber);
		}

		if (__DEV__) {
			console.warn('未实现的reconcile类型', newChild);
		}

		return null;
	};
}

function useFiber(fiber: FiberNode, pendingProps: Props): FiberNode {
	const clone = createWornInProgress(fiber, pendingProps);
	clone.index = 0;
	clone.sibling = null;
	return clone;
}

function updateFragment(
	returnFiber: FiberNode,
	current: FiberNode | undefined,
	elements: any[],
	key: Key,
	existingChildren: ExistingChildren
) {
	let fiber: FiberNode;
	if (!current || current.tag !== Fragment) {
		fiber = createFiberFromFragment(elements, key);
	} else {
		existingChildren.delete(key);
		fiber = useFiber(current, elements);
	}

	fiber.return = returnFiber;

	return fiber;
}

// 更新时才追踪副作用
export const reconcilerChildren = ChildReconciler(true);
// 初次挂载时不需要追踪
export const mountChildren = ChildReconciler(false);
