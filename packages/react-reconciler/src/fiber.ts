import { Props, Key, Ref } from 'shared/ReactTypes';
import { WorkTag } from './workTags';
import { Flags, NoFlags } from './fiberTags';

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

		this.pendingProps = pendingProps;
		this.memoizedProps = null;

		this.alternate = null;
		// 副作用
		this.flags = NoFlags;
	}
}
