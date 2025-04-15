import { ReactContext } from 'shared/ReactTypes';

let prevContextValue: any = null;
// 因为存在多个context嵌套，所以用栈保存
const prevContextValueStack: any[] = [];

export function pushContext<T>(context: ReactContext<T>, newValue: T) {
	prevContextValueStack.push(prevContextValue);
	prevContextValue = context._currentValue;
	context._currentValue = newValue;
}

export function popContext<T>(context: ReactContext<T>) {
	context._currentValue = prevContextValue;
	prevContextValue = prevContextValueStack.pop();
}
