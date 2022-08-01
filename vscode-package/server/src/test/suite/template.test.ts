// initially taken from https://github.com/microsoft/vscode-extension-samples/blob/main/helloworld-test-sample/src/test/suite/extension.test.ts

import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
// import * as myExtension from '../../extension';

suite('Extension Test Suite', () => {

	test('Sample test', () => {
		assert.strictEqual([1, 2, 3].indexOf(5), -1);
		assert.strictEqual([1, 2, 3].indexOf(0), -1);
	});
});