import { Props, Key, Ref } from 'shared/ReactTypes';
import { WorkTag } from './workTags';

export class FiberNode {
	tag: WorkTag;
	props: Props;
	key: Key;
	type: any;
	stateNode: any;

	return: FiberNode | null;
	sibling: FiberNode | null;
	child: FiberNode | null;
	index: number;

	ref: Ref;

	pendingProps: Props;
	memoizedProps: Props;

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
	}
}
