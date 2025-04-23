import { FiberNode } from './fiber';
import { popContext } from './fiberContext';
import { DidCapture, NoFlags, ShouldCapture } from './fiberFlags';
import { popSuspenseHandler } from './suspenseContext';
import { ContextProvider, SuspenseComponent } from './workTags';

export function unwindWork(wip: FiberNode) {
	const { flags } = wip;

	switch (flags) {
		case SuspenseComponent:
			// completeWork和unwind都需要出栈
			popSuspenseHandler();
			// 需要被处理捕获数据但是还未处理的fiber，先捕获处理
			if (
				(flags & ShouldCapture) !== NoFlags &&
				(flags & DidCapture) === NoFlags
			) {
				wip.flags = (flags & ~ShouldCapture) | DidCapture;

				return wip;
			}

			return null;
		case ContextProvider:
			const context = wip.type._context;
			popContext(context);
			return null;

		default:
			return null;
	}
}
