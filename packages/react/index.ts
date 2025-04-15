import currentBatchConfig from './src/currentBatchConfig';
import currentDispatcher, {
	Dispatcher,
	resolveDispatcher
} from './src/currentDispatcher';
import { jsx, jsxDEV } from './src/jsx';
export { isValidElement } from './src/jsx';
export { createContext } from './context';

const useState: Dispatcher['useState'] = (initialState) => {
	const dispatcher = resolveDispatcher();
	return dispatcher.useState(initialState);
};

const useEffect: Dispatcher['useEffect'] = (create, deps) => {
	const dispatcher = resolveDispatcher();
	return dispatcher.useEffect(create, deps);
};

const useTransition: Dispatcher['useTransition'] = () => {
	const dispatcher = resolveDispatcher();
	return dispatcher.useTransition();
};

const useRef: Dispatcher['useRef'] = (initialValue) => {
	const dispatcher = resolveDispatcher();
	return dispatcher.useRef(initialValue);
};

const useContext: Dispatcher['useContext'] = (context) => {
	const dispatcher = resolveDispatcher();
	return dispatcher.useContext(context);
};

// 内部数据共享层
const __SECRET_INTERNAL_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = {
	currentDispatcher,
	currentBatchConfig
};

export {
	useState,
	useEffect,
	useTransition,
	useRef,
	useContext,
	__SECRET_INTERNAL_DO_NOT_USE_OR_YOU_WILL_BE_FIRED
};

export const version = '0.0.1';
// TODO:根据环境区分使用jsx/jsxDEB
export const createElement = jsx;

// export default {
// 	version: '0.0.1',
// 	createElement: jsxDEV
// };
