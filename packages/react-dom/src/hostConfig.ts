import { FiberNode } from 'react-reconciler/src/fiber';
import { HostComponent, HostText } from 'react-reconciler/src/workTags';
import { Props } from 'shared/ReactTypes';
import { DOMElement, updateFiberProps } from './SyntheticEvent';

export type Container = Element;
export type Instance = Element;
export type TextInstance = Text;

/** 创建dom */
export const createInstance = (type: string, props: Props): Instance => {
	// TODO: props待处理
	const instance = document.createElement(type) as unknown;
	updateFiberProps(instance as DOMElement, props);
	return instance as DOMElement;
};

/** 创建文本节点 */
export const createTextInstance = (content: string) => {
	return document.createTextNode(content);
};

/** 向父节点添加子节点 */
export const appendInitialChild = (
	parent: Instance | Container,
	child: Instance
) => {
	parent.appendChild(child);
};

export const insertChildToContainer = (
	parent: Container,
	child: Instance,
	before: Instance
) => {
	parent.insertBefore(child, before);
};

export const appendChildToContainer = appendInitialChild;

export function commitUpdate(fiber: FiberNode) {
	switch (fiber.tag) {
		case HostText:
			commitTextUpdate(fiber.stateNode, fiber.memoizedProps.content);
			break;

		case HostComponent:
			// TODO:更新属性
			break;

		default:
			if (__DEV__) {
				console.log('未实现的update类型', fiber);
			}
			break;
	}
}

export function commitTextUpdate(textInstance: TextInstance, content: string) {
	textInstance.textContent = content;
}

export function removeChild(
	child: Instance | TextInstance,
	container: Container
) {
	container.removeChild(child);
}
