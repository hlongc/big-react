import { FiberNode } from 'react-reconciler/src/fiber';
import { HostText } from 'react-reconciler/src/workTags';

export type Container = Element;
export type Instance = Element;
export type TextInstance = Text;

/** 创建dom */
export const createInstance = (type: string, props: any): Instance => {
	// TODO: props待处理
	const instance = document.createElement(type);
	return instance;
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

export const appendChildToContainer = appendInitialChild;

export function commitUpdate(fiber: FiberNode) {
	switch (fiber.tag) {
		case HostText:
			commitTextUpdate(fiber.stateNode, fiber.memoizedProps.content);
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
