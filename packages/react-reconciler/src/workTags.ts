export type WorkTag =
	| typeof FunctionComponent
	| typeof HostRoot
	| typeof HostComponent
	| typeof HostText
	| typeof Fragment
	| typeof ContextProvider
	| typeof SuspenseComponent
	| typeof OffScreenComponent;

// 不同的jsx类型
export const FunctionComponent = 0;
// 挂载的dom元素
export const HostRoot = 3;
export const HostComponent = 5;
export const HostText = 6;
export const Fragment = 7;
export const ContextProvider = 8;

export const SuspenseComponent = 13;
export const OffScreenComponent = 14;
