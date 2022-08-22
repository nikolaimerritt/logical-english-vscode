// initially taken from https://github.com/microsoft/vscode-extension-samples/blob/main/helloworld-test-sample/src/test/suite/extension.test.ts

import * as assert from 'assert';
import { Type } from '../../element';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
// import * as myExtension from '../../extension';
import { TypeTree } from '../../type-tree';

suite('TypeTree.fromHierarchy()', () => {
	test('Multiple highest-level (all new) nodes in hierarchy', () => {
		const hierarchy = `
a parent
	a B
	a C
		a C1
		a C2
		a C3
	a D
		a D1

a nother parent
		`.split('\n');
		const testTree = TypeTree.fromHierarchy(hierarchy);

		const actualTree = new TypeTree();
		actualTree.getType('a parent').makeSubtype(new Type('a B'));
		actualTree.getType('a parent').makeSubtype(new Type('a C'));
			actualTree.getType('a C').makeSubtype(new Type('a C1'));
			actualTree.getType('a C').makeSubtype(new Type('a C2'));
			actualTree.getType('a C').makeSubtype(new Type('a C3'));

		actualTree.getType('a parent').makeSubtype(new Type('a D'));
			actualTree.getType('a D').makeSubtype(new Type('a D1'));
		
		actualTree.getType('a nother parent');

		assert.ok(actualTree.equals(testTree));
	});

	test('Use of top type in hierarchy', () => {
		const hierarchy = `
a thing
	a B
	a C
		a C1
		a C2
		a C3
	a D
		a D1

	a nother parent
		`.split('\n');
		const testTree = TypeTree.fromHierarchy(hierarchy);

		const actualTree = new TypeTree();
		// actualTree.getType('a thing').makeSubtype(new Type('a B'));
		// actualTree.getType('a thing').makeSubtype(new Type('a C'));
		actualTree.getType('a B');
		actualTree.getType('a C');
			actualTree.getType('a C').makeSubtype(new Type('a C1'));
			actualTree.getType('a C').makeSubtype(new Type('a C2'));
			actualTree.getType('a C').makeSubtype(new Type('a C3'));

		actualTree.getType('a thing').makeSubtype(new Type('a D'));
			actualTree.getType('a D').makeSubtype(new Type('a D1'));
		
		actualTree.getType('a nother parent');

		assert.ok(actualTree.equals(testTree));
	});
});

suite('TypeTree.getType()', () => {
	test('Modifying existing type using TypeTree.getType()', () => {
		const hierarchy = `
a parent
	a B
	a C
		a C1
		a C2
		a C3
	a D
		a D1

a nother parent
		`.split('\n');
		const testTree = TypeTree.fromHierarchy(hierarchy);
		testTree.getType('a parent').makeSubtype(new Type('an E'));

		const actualTree = new TypeTree();
		actualTree.getType('a parent').makeSubtype(new Type('a B'));
		actualTree.getType('a parent').makeSubtype(new Type('a C'));
			actualTree.getType('a C').makeSubtype(new Type('a C1'));
			actualTree.getType('a C').makeSubtype(new Type('a C2'));
			actualTree.getType('a C').makeSubtype(new Type('a C3'));

		actualTree.getType('a parent').makeSubtype(new Type('a D'));
			actualTree.getType('a D').makeSubtype(new Type('a D1'));

		actualTree.getType('a parent').makeSubtype(new Type('an E'));
		
		actualTree.getType('a nother parent');

		assert.ok(actualTree.equals(testTree));
	});

	test('Adding type using TypeTree.getType()', () => {
		const hierarchy = `
a parent
	a B
	a C
		a C1
		a C2
		a C3
	a D
		a D1

a nother parent
		`.split('\n');
		const testTree = TypeTree.fromHierarchy(hierarchy);
		testTree.getType('an elephant').makeSubtype(new Type('an E'));

		const actualTree = new TypeTree();
		actualTree.getType('a parent').makeSubtype(new Type('a B'));
		actualTree.getType('a parent').makeSubtype(new Type('a C'));
			actualTree.getType('a C').makeSubtype(new Type('a C1'));
			actualTree.getType('a C').makeSubtype(new Type('a C2'));
			actualTree.getType('a C').makeSubtype(new Type('a C3'));

		actualTree.getType('a parent').makeSubtype(new Type('a D'));
			actualTree.getType('a D').makeSubtype(new Type('a D1'));
		
		actualTree.getType('a nother parent');

		actualTree.getType('an elephant').makeSubtype(new Type('an E'));

		assert.ok(actualTree.equals(testTree));
	});
});