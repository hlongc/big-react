import { getPackageJSon, resolvePkgPath, getBaseRollupPlugin } from './utils';
import generatePackageJson from 'rollup-plugin-generate-package-json';
import alias from '@rollup/plugin-alias';

const { name, module, peerDependencies } = getPackageJSon('react-dom');

const pkgPath = resolvePkgPath(name);
const pkgDistPath = resolvePkgPath(name, true);

export default [
	// react-dom
	{
		input: `${pkgPath}/${module}`,
		output: [
			{
				file: `${pkgDistPath}/index.js`,
				name: 'index.js',
				format: 'umd'
			},
			{
				file: `${pkgDistPath}/client.js`,
				name: 'client.js',
				format: 'umd'
			}
		],
		// 不要把react也打包进去，否则无法实现数据共享层的唯一性
		externals: [...Object.keys(peerDependencies)],
		plugins: [
			...getBaseRollupPlugin(),
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
