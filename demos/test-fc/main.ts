import {
	unstable_NormalPriority as NormalPriority,
	unstable_ImmediatePriority as ImmediatePriority,
	unstable_LowPriority as LowPriority,
	unstable_UserBlockingPriority as UserBlockingPriority,
	unstable_IdlePriority as IdlePriority,
	unstable_getFirstCallbackNode as getFirstCallbackNode,
	unstable_scheduleCallback as scheduleCallback,
	unstable_shouldYield as shouldYield,
	unstable_cancelCallback as cancelCallback,
	CallbackNode
} from 'scheduler';
import './style.css';

const root = document.querySelector('#root');
const wrapper = document.querySelector('#wrapper')!;

interface Work {
	count: number;
	priority: number;
}

const workList: Work[] = [];
// 上一次调度任务的优先级
let prevPriority = IdlePriority;
let curCallback: CallbackNode | null = null;

function createWork(priority: number) {
	workList.unshift({ count: 100, priority });
	schedule();
}

function schedule() {
	// 获取当前调度的回调
	const cbNode = getFirstCallbackNode();
	// 取出优先级最高的任务，priority越小优先级越高
	const curWork = workList.sort((a, b) => a.priority - b.priority)[0];

	if (!curWork) {
		// 如果当前没有任务可执行，那就重置
		curCallback = null;
		// 并且取消正在调度的会掉
		cbNode && cancelCallback(cbNode);
		return;
	}

	const { priority: curPriority } = curWork;

	if (curPriority === prevPriority) {
		return;
	}

	// 更高优先级的work
	cbNode && cancelCallback(cbNode);

	curCallback = scheduleCallback(curPriority, perform.bind(null, curWork));
}

function perform(work: Work, didTimeout?: boolean) {
	/**
	 * 1.work.priority
	 * 2.饥饿
	 * 3.时间切片
	 */
	const needSync = work.priority === ImmediatePriority || didTimeout;
	while ((needSync || !shouldYield()) && work.count) {
		work.count--;
		createSpan(work.priority);
	}

	// 中断执行 || 执行完了
	prevPriority = work.priority;

	if (!work.count) {
		const index = workList.indexOf(work);
		workList.splice(index, 1);
		prevPriority = IdlePriority;
	}

	const prevCallback = curCallback;
	schedule();
	const newCallback = curCallback;

	if (newCallback && prevCallback === newCallback) {
		// 如果仅有一个work，Scheduler有个优化路径，如果调度的回调函数的返回值是函数，则会继续调度返回的函数
		return perform.bind(null, work);
	}
}

function createSpan(priority: number) {
	const span = document.createElement('span');
	span.className = `sp${priority}`;
	span.innerText = priority.toString();

	doSomeBusyWork();

	wrapper.appendChild(span);
}

function doSomeBusyWork() {
	let count = 100000000;
	while (count) {
		count--;
	}
}

[LowPriority, NormalPriority, UserBlockingPriority, ImmediatePriority].forEach(
	(priority) => {
		const button = document.createElement('button');
		root?.appendChild(button);

		button.innerText = [
			'',
			'ImmediatePriority-1',
			'UserBlockingPriority-2',
			'NormalPriority-3',
			'LowPriority-4'
		][priority];

		button.onclick = () => {
			createWork(priority);
		};
	}
);
