import { Props, Key, Ref } from 'shared/ReactTypes';
import { WorkTag } from './workTags';
import { Flags, NoFlags } from './fiberTags';
import { Container } from 'hostConfig';

export class FiberNode {
	tag: WorkTag;
	props: Props;
	key: Key;
	type: any;
	// 真实dom
	stateNode: any;

	return: FiberNode | null;
	sibling: FiberNode | null;
	child: FiberNode | null;
	// 在子元素中的顺序
	index: number;

	ref: Ref;
	// 即将更新的props
	pendingProps: Props;
	// 现在的props
	memoizedProps: Props;
	memoziedState: unknown;
	updateQueue: unknown;

	alternate: FiberNode | null;
	flags: Flags;

	constructor(tag: WorkTag, pendingProps: Props, key: Key) {
		this.tag = tag;
		this.key = key;
		// HostComponent <div></div>
		this.stateNode = null;
		// FunctionComponent () => div
		this.type = null;

		this.return = null;
		this.sibling = null;
		this.child = null;
		this.index = 0;
		// 工作单元
		this.pendingProps = pendingProps;
		this.memoizedProps = null;
		this.memoziedState = null;
		this.updateQueue = null;

		this.alternate = null;
		// 副作用
		this.flags = NoFlags;
	}
}

export class FiberRootNode {
	container: Container;
	current: FiberNode;
	// 更新完成以后得hostRootFiber
	finishedWork: FiberNode | null;

	constructor(container: Container, hostRootFiber: FiberNode) {
		// React.createRoot(container).render(<App />)
		// hostRootFiber指的是container
		this.container = container;
		this.current = hostRootFiber;
		this.current.stateNode = this;
		this.finishedWork = null;
	}
}

export function createWornInProgress(current: FiberNode, pendingProps: Props) {
	// 双缓存技术，每次返回的是alternate
	let wip = current.alternate;

	if (wip === null) {
		// mount
		wip = new FiberNode(current.tag, pendingProps, current.key);

		wip.stateNode = current.stateNode;
		wip.alternate = current;
		current.alternate = wip;
	} else {
		// update
		wip.pendingProps = pendingProps;
		wip.flags = NoFlags;
	}

	wip.type = current.type;
	wip.updateQueue = current.updateQueue;
	wip.child = current.child;
	wip.memoizedProps = current.memoizedProps;
	wip.memoziedState = current.memoziedState;

	return wip;
}
