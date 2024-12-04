import { getPackageJSon, resolvePkgPath, getBaseRollupPlugin } from './utils';
import generatePackageJson from 'rollup-plugin-generate-package-json';
import alias from '@rollup/plugin-alias';

const { name, module, peerDependencies } = getPackageJSon(
	'react-noop-renderer'
);

const pkgPath = resolvePkgPath(name);
const pkgDistPath = resolvePkgPath(name, true);

export default [
	// react-noop-renderer
	{
		input: `${pkgPath}/${module}`,
		output: [
			{
				file: `${pkgDistPath}/index.js`,
				name: 'ReactNoopRenderer',
				format: 'umd'
			}
		],
		// 不要把react也打包进去，否则无法实现数据共享层的唯一性
		external: [...Object.keys(peerDependencies), 'scheduler'],
		plugins: [
			...getBaseRollupPlugin({
				typescript: {
					exclude: ['./packages/react-dom/**/*'],
					paths: {
						// 重写，指向noop-renderer下面的hostConfig
						hostConfig: [`./${name}/src/hostConfig.ts`]
					}
				}
			}),
			alias({
				entries: {
					hostConfig: `${pkgPath}/src/hostConfig.ts`
				}
			}),
			generatePackageJson({
				inputFolder: pkgPath,
				outputFolder: pkgDistPath,
				baseContents: ({ name, version, description }) => ({
					name,
					version,
					description,
					// peerDependencies: { react: version },
					main: 'index.js'
				})
			})
		]
	}
];
