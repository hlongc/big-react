import path from 'path';
import fs from 'fs';
import ts from '@rollup/plugin-typescript';
import cmj from '@rollup/plugin-commonjs';
import replace from '@rollup/plugin-replace';

// 包源码的路径
const pkgPath = path.resolve(__dirname, '../../packages');
// 打包以后得路径
const distPath = path.resolve(__dirname, '../../dist/node_modules');

export function resolvePkgPath(name, isDist) {
	if (isDist) {
		return `${distPath}/${name}`;
	}
	return `${pkgPath}/${name}`;
}

export function getPackageJSon(name) {
	const path = resolvePkgPath(name);
	const str = fs.readFileSync(`${path}/package.json`, { encoding: 'utf8' });
	return JSON.parse(str);
}

export function getBaseRollupPlugin({
	alias = { __DEV__ },
	typescript = {}
} = {}) {
	return [replace(alias), cmj(), ts()];
}
