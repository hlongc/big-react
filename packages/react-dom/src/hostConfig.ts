export type Container = Element;
export type Instance = Element;

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
