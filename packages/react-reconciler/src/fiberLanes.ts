import { FiberRootNode } from './fiber';

export type Lane = number;

export type Lanes = number;

export const SyncLane = 0b0001;
export const NoLane = 0b0000;
export const NoLanes = 0b0000;

export function mergeLanes(a: Lane, b: Lane): Lanes {
	return a | b;
}

export function requestUpdateLane(): Lane {
	return SyncLane;
}

export function getHighestPriority(lanes: Lanes): Lane {
	// 0b0001  => 0b0001
	// 0b0110 => 0b0010
	// 找出最右边的1，数字越小优先级越高
	return lanes & -lanes;
}
// 把完成的lane移除
export function markRootFinished(root: FiberRootNode, lane: Lane) {
	root.pendingLanes &= ~lane;
}
