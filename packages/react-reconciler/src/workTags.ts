export type WorkTag =
	| typeof FunctionComponent
	| typeof HostRoot
	| typeof HostComponent
	| typeof HostText;

export const FunctionComponent = 0;
// 挂载的dom元素
export const HostRoot = 3;
export const HostComponent = 5;
export const HostText = 6;
