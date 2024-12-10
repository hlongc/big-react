type Callback = (...args: any[]) => void;

let syncQueue: Callback[] | null = null;
// 是否正在执行同步任务
let isFlushingSyncQueue = false;

export function scheduleSyncCallback(callback: Callback) {
	if (syncQueue === null) {
		syncQueue = [callback];
	} else {
		syncQueue.push(callback);
	}
}

export function flushSyncCallbacks() {
	if (!isFlushingSyncQueue && syncQueue) {
		isFlushingSyncQueue = true;
		try {
			console.log('syncQueue', syncQueue);
			syncQueue.forEach((cb) => cb());
		} catch (e) {
			if (__DEV__) {
				console.log('flushSyncQueue出错', e);
			}
		} finally {
			isFlushingSyncQueue = false;
			syncQueue = null;
		}
	}
}
