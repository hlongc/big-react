export type Flags = number;

export const NoFlags = 0b00000000;
export const Placemement = 0b00000001;
export const Update = 0b00000010;
export const ChildDeletion = 0b00000100;
/** 本次更新需要触发useEffect */
export const PassiveEffect = 0b00001000;
export const Ref = 0b00010000;

export const MutationMask = Placemement | Update | ChildDeletion | Ref;
export const LayoutMask = Ref;
// 组件卸载时也需要执行useEffect回调
export const PassiveMask = PassiveEffect | ChildDeletion;
