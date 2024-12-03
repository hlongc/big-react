import currentDispatcher, {
	Dispatcher,
	resolveDispatcher
} from './src/currentDispatcher';
import { jsx, jsxDEV } from './src/jsx';
export { isValidElement } from './src/jsx';

const useState: Dispatcher['useState'] = (initialState) => {
	const dispatcher = resolveDispatcher();
	return dispatcher.useState(initialState);
};

const useEffect: Dispatcher['useEffect'] = (create, deps) => {
	const dispatcher = resolveDispatcher();
	return dispatcher.useEffect(create, deps);
};

// 内部数据共享层
const __SECRET_INTERNAL_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = {
	currentDispatcher
};

export {
	useState,
	useEffect,
	__SECRET_INTERNAL_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
};

export const version = '0.0.1';
// TODO:根据环境区分使用jsx/jsxDEB
export const createElement = jsx;

// export default {
// 	version: '0.0.1',
// 	createElement: jsxDEV
// };
