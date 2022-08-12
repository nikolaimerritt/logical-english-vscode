// initially taken from https://github.com/microsoft/vscode-extension-samples/blob/main/helloworld-test-sample/src/test/suite/extension.test.ts

import * as assert from 'assert';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
// import * as myExtension from '../../extension';
import { Template } from '../../template';
import { TypeTree } from '../../type-tree';

suite('Template.fromString()', () => {
	const typeTree = new TypeTree();

	test('Empty strings give no elements', () => {
		const strings = [
			'',
			'   ',
			' . '
		];

		assert.ok(strings.every(string => 
			Template.fromString(typeTree, string).allElements.length === 0
		));
	});

	test('Can reuse surrounding names', () => {
		const string = '*a person* says that *a person* says that *a person* says that *a sentence*.';
		const expectedTypeNames = [
			'a person',
			'a person',
			'a person',
			'a sentence'
		];

		const expectedSurroundings = [
			'says that',
			'says that',
			'says that'
		];

		const template = Template.fromString(typeTree, string);
		assert.ok(
			template.types.length === expectedTypeNames.length 
			&& template.types.every(({ name }, idx) => name === expectedTypeNames[idx])
		);

		assert.ok(
			template.surroundings.length === expectedSurroundings.length
			&& template.surroundings.every(({ name: phrase }, idx) => phrase === expectedSurroundings[idx])
		);
	});
});