import { FiberNode } from './fiber';
/** 和context一样，用栈来实现，来查找带有 shouldCapture和didCapture的fiber节点，然后调度这些节点 */
const suspenseHandlerStack: FiberNode[] = [];

export function getSuspenseHandler() {
	return suspenseHandlerStack[suspenseHandlerStack.length - 1];
}

export function pushSuspenseHandler(handler: FiberNode) {
	suspenseHandlerStack.push(handler);
}

export function popSuspenseHandler() {
	suspenseHandlerStack.pop();
}
