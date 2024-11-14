import { Container } from 'hostConfig';
import { Props } from 'shared/ReactTypes';

export const elementPropsKey = '__props';
const validEventTypeList = ['click'];

type EventCallback = (e: Event) => void;

interface Paths {
	capture: EventCallback[];
	bubble: EventCallback[];
}

interface SyntheticEvent extends Event {
	__stopPropagation: boolean;
}

export interface DOMElement extends Element {
	[elementPropsKey]: Props;
}

export function updateFiberProps(node: DOMElement, props: Props) {
	node[elementPropsKey] = props;
}

export function initEvent(container: Container, eventType: string) {
	if (!validEventTypeList.includes(eventType)) {
		console.log('未支持的事件类型', eventType);
		return;
	}

	container.addEventListener(eventType, (e) => {
		dispatchEvent(container, eventType, e);
	});
}

function createSyntheticEvent(e: Event) {
	const se = e as SyntheticEvent;
	se.__stopPropagation = false;
	const originalStopPropagation = e.stopPropagation;

	se.stopPropagation = () => {
		se.__stopPropagation = true;
		if (originalStopPropagation) {
			originalStopPropagation.call(e);
		}
	};

	return se;
}

function dispatchEvent(container: Container, eventType: string, e: Event) {
	const target = e.target;
	if (!target) {
		console.log('事件不存在');
	}
	// 收集沿途的事件
	const { bubble, capture } = collectionPaths(
		target as DOMElement,
		container,
		eventType
	);
	// 构造合成事件
	const se = createSyntheticEvent(e);
	// 遍历capture
	triggerFlowCallback(capture, se);

	if (!se.__stopPropagation) {
		// 遍历bubble
		triggerFlowCallback(bubble, se);
	}
}

function triggerFlowCallback(cbList: EventCallback[], se: SyntheticEvent) {
	for (let i = 0; i < cbList.length; i++) {
		const callback = cbList[i];
		callback.call(null, se);

		if (se.__stopPropagation) {
			break;
		}
	}
}

function getCallbackEventNameFromEventType(eventType: string) {
	return {
		click: ['onClickCapture', 'onClick']
	}[eventType];
}

function collectionPaths(
	targetElement: DOMElement,
	container: Container,
	eventType: string
) {
	const paths: Paths = {
		capture: [],
		bubble: []
	};

	while (targetElement && targetElement !== container) {
		const elementProps = targetElement[elementPropsKey];
		if (elementProps) {
			const callbackList = getCallbackEventNameFromEventType(eventType);
			if (callbackList) {
				callbackList.forEach((cbName, index) => {
					const eventCb = elementProps[cbName];
					if (eventCb) {
						// 第一个是捕获阶段的事件
						if (index === 0) {
							paths.capture.unshift(eventCb);
						} else {
							paths.bubble.push(eventCb);
						}
					}
				});
			}
		}

		targetElement = targetElement.parentNode as DOMElement;
	}

	return paths;
}
