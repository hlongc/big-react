// ReactDOM.createRoot(root).render(<App />)

import {
	createContainer,
	updateContainer
} from 'react-reconciler/src/fiberReconciler';
import { Container, Instance } from './hostConfig';
import { ReactElementType } from 'shared/ReactTypes';
import { REACT_ELEMENT_TYPE, REACT_FRAGMENT_TYPE } from 'shared/ReactSymbols';
import * as Scheduler from 'scheduler';

let idCounter = 0;

export function createRoot() {
	const container: Container = {
		rootID: idCounter++,
		children: []
	};
	// @ts-ignore
	const root = createContainer(container);

	const getChildren = (parent: Container | Instance) => {
		if (parent) {
			return parent.children;
		}
		return null;
	};

	function getChildrenAsJSX(root: Container) {
		const children = childToJSX(getChildren(root));

		if (Array.isArray(children)) {
			return {
				$$typeof: REACT_FRAGMENT_TYPE,
				type: REACT_FRAGMENT_TYPE,
				key: null,
				ref: null,
				props: { children },
				__mark: 'Ronnie'
			};
		}

		return children;
	}

	function childToJSX(child: any): any {
		// 数字或者字符串
		if (typeof child === 'string' || typeof child === 'number') {
			return child;
		}
		// 数组
		if (Array.isArray(child)) {
			if (child.length === 0) {
				return null;
			}
			if (child.length === 1) {
				return childToJSX(child[0]);
			}
			const children = child.map(childToJSX);
			if (
				children.every((item) => ['string', 'number'].includes(typeof item))
			) {
				return child.join('');
			}
			// [TextInstance, Instance, number]
			return child;
		}

		// Instance
		if (Array.isArray(child.chldren)) {
			const instance: Instance = child;
			const children = childToJSX(instance.children);
			const props = instance.props;

			if (children !== null) {
				props.children = children;
			}

			return {
				$$typeof: REACT_ELEMENT_TYPE,
				type: instance.type,
				key: null,
				ref: null,
				props,
				__mark: 'Ronnie'
			};
		}

		// TextInstance
		return child.text;
	}

	return {
		_Scheduler: Scheduler,
		render(element: ReactElementType) {
			return updateContainer(element, root);
		},
		getChildren() {
			return getChildren(container);
		},
		getChildrenAsJSX() {
			return getChildrenAsJSX(container);
		}
	};
}
