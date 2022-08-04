// initially taken from https://github.com/microsoft/vscode-extension-samples/blob/main/helloworld-test-sample/src/test/suite/extension.test.ts

import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
// import * as myExtension from '../../extension';
import { TypeTree } from '../../type-tree';

// suite('TypeTree.toString()', () => {
// 	test('Type tree to string', () => {
// 		const string = `
// a parent
// 	a B
// 	a C
// 		a C1
// 		a C2
// 		a C3
// 	a D
// 		a D1

// a nother parent
// 		`.trim();
// 		const hierarchy = string.split('\n');

// 		const tree = TypeTree.fromHierarchy(hierarchy);
// 		assert.strictEqual(tree.toString().trim(), string);
// 	});
// });