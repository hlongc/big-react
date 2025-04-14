function PostsTab() {
	// 打印一次。真正变慢的地方在 SlowPost 内。
	console.log('[ARTIFICIALLY SLOW] Rendering 500 <SlowPost />');

	let items = [];
	for (let i = 0; i < 500; i++) {
		items.push(<SlowPost key={i} index={i} />);
	}

	return <ul className="items">{items}</ul>;
}

function SlowPost({ index }) {
	let startTime = performance.now();
	while (performance.now() - startTime < 10) {
		// 每个 item 都等待 1 毫秒以模拟极慢的代码。
	}

	return <li className="item">Post #{index + 1}</li>;
}

export default PostsTab;
