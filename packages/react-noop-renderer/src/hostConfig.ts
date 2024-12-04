import { FiberNode } from 'react-reconciler/src/fiber';
import { HostComponent, HostText } from 'react-reconciler/src/workTags';
import { Props } from 'shared/ReactTypes';

export interface Container {
	rootID: number;
	children: (Instance | TextInstance)[];
}
export interface Instance {
	id: number;
	type: string;
	children: (Instance | TextInstance)[];
	parent: number;
	props: Props;
}
export interface TextInstance {
	text: string;
	id: number;
	parent: number;
}

let instanceCounter = 0;

/** 创建dom */
export const createInstance = (type: string, props: Props): Instance => {
	return {
		id: instanceCounter++,
		children: [],
		parent: -1,
		props,
		type
	};
};

/** 创建文本节点 */
export const createTextInstance = (content: string): TextInstance => {
	return {
		id: instanceCounter++,
		parent: -1,
		text: content
	};
};

/** 向父节点添加子节点 */
export const appendInitialChild = (
	parent: Instance | Container,
	child: Instance
) => {
	const prevParentId = child.parent;
	const parentId = 'rootID' in parent ? parent.rootID : parent.id;
	if (prevParentId !== -1 && prevParentId !== parentId) {
		throw new Error('child不能被重复插入');
	}

	child.parent = parentId;
	parent.children.push(child);
};

export const insertChildToContainer = (
	parent: Container,
	child: Instance,
	before: Instance
) => {
	const beforeIndex = parent.children.indexOf(before);
	if (beforeIndex === -1) {
		throw new Error('before不存在children中');
	}

	const childIndex = parent.children.indexOf(child);
	if (childIndex !== -1) {
		parent.children.splice(childIndex, 1);
	}
	parent.children.splice(beforeIndex, 0, child);
};

export const appendChildToContainer = (parent: Container, child: Instance) => {
	const prevParentId = child.parent;
	const parentId = parent.rootID;
	if (prevParentId !== -1 && prevParentId !== parentId) {
		throw new Error('child不能被重复插入');
	}

	child.parent = parentId;
	parent.children.push(child);
};

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
	textInstance.text = content;
}

export function removeChild(
	child: Instance | TextInstance,
	container: Container
) {
	const childIndex = container.children.indexOf(child);
	if (childIndex !== -1) {
		container.children.splice(childIndex, 1);
	}
}

export const scheduleMicroTask =
	typeof queueMicrotask === 'function'
		? queueMicrotask
		: typeof Promise === 'function'
		? (callback: (...args: any[]) => void) =>
				Promise.resolve(null).then(callback)
		: setTimeout;
