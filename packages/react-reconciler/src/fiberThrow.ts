import { Wakeable } from 'shared/ReactTypes';
import { FiberRootNode } from './fiber';
import { Lane } from './fiberLanes';
import { ensureRootIsScheduled, markRootUpdated } from './workLoop';
import { getSuspenseHandler } from './suspenseContext';
import { ShouldCapture } from './fiberFlags';

export function throwException(root: FiberRootNode, value: any, lane: Lane) {
	// Error Boundary

	// thenable

	if (
		typeof value === 'object' &&
		value !== null &&
		typeof value.then === 'function'
	) {
		const wakeable = value as Wakeable<any>;
		const suspenseBoundary = getSuspenseHandler();
		if (suspenseBoundary) {
			suspenseBoundary.flags |= ShouldCapture;
		}
		attachPingListener(root, wakeable, lane);
	}
}

function attachPingListener(
	root: FiberRootNode,
	wakeable: Wakeable<any>,
	lane: Lane
) {
	let pingCache = root.pingCache;

	let threadIds: Set<Lane> | undefined;
	// 处理缓存，不重复处理同一个weakable即thenable
	if (pingCache === null) {
		threadIds = new Set<Lane>();
		pingCache = root.pingCache = new WeakMap<Wakeable<any>, Set<Lane>>();

		pingCache.set(wakeable, threadIds);
	} else {
		threadIds = pingCache.get(wakeable);
		if (threadIds === undefined) {
			threadIds = new Set<Lane>();
			pingCache.set(wakeable, threadIds);
		}
	}

	if (!threadIds.has(lane)) {
		threadIds.add(lane);

		const ping = () => {
			// 当前处理了就删掉，不重复处理
			if (pingCache !== null) {
				pingCache.delete(wakeable);
			}
			// 去触发更新，进行调度
			markRootUpdated(root, lane);
			ensureRootIsScheduled(root);
		};
		// promise完成以后就重新调度更新
		wakeable.then(ping, ping);
	}
}
