export type Flags = number;

export const NoFlags = 0b00000000;
export const Placemement = 0b00000001;
export const Update = 0b00000010;
export const ChildDeletion = 0b00000100;
/** 本次更新需要触发useEffect */
export const PassiveEffect = 0b00001000;
export const Ref = 0b00010000;
/** Suspense组件显隐切换发生改变 */
export const Visibility = 0b0100000;
/** redner阶段捕获到了一些值，需要进行处理 */
export const ShouldCapture = 0b1000000000000;
/** 是否已经处理抛出来的值 */
export const DidCapture = 0b1000000;

export const MutationMask =
	Placemement | Update | ChildDeletion | Ref | Visibility;
export const LayoutMask = Ref;
// 组件卸载时也需要执行useEffect回调
export const PassiveMask = PassiveEffect | ChildDeletion;
