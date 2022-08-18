// initially taken from https://github.com/microsoft/vscode-extension-samples/blob/main/helloworld-test-sample/src/test/suite/extension.test.ts

import * as assert from 'assert';
import { Type } from '../../element';
import { Atom, Term } from '../../formula';

// You can import and use all API from the 'vscode' module
// as well as import your extension to test it
// import * as myExtension from '../../extension';
import { Template } from '../../template';
import { TypeTree } from '../../type-tree';
import { everySublistOf, listOfPhrases } from './helper';

suite('Template.fromString()', () => {
	const typeTree = new TypeTree();

	function testConstruction(
			templateString: string, 
			expectedTypeNames: string[], 
			expectedSurroundings: string[]
	) {
		const template = Template.fromString(typeTree, templateString);
		assert.ok(
			template.types.length === expectedTypeNames.length 
			&& template.types.every(
				({ name }, idx) => name === expectedTypeNames[idx]
			)
		);

		assert.ok(
			template.surroundings.length === expectedSurroundings.length
			&& template.surroundings.every(
				({ name: phrase }, idx) => phrase === expectedSurroundings[idx]
			)
		);
	}

	test('Empty strings give no elements', () => {
		const strings = [
			'',
			'   ',
			' . '
		];

		for (const string of strings)
			testConstruction(string, [], []);
	});

	test('Works with no edge cases', () => {
		const string = '*a person* goes to *a doctor* for *an illness*.';
		const expectedTypeNames = [
			'a person',
			'a doctor',
			'an illness'
		];

		const expectedSurroundings = [
			'goes to',
			'for'
		];

		testConstruction(string, expectedTypeNames, expectedSurroundings);
	});

	test('Can reuse surrounding and type names', () => {
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

		testConstruction(string, expectedTypeNames, expectedSurroundings);		
	});

	test('Can have surrounding = type name', () => {
		const string = '*a person* a person *a person* a person *a person*.';
		const expectedTypeNames = [
			'a person',
			'a person',
			'a person',
		];

		const expectedSurroundings = [
			'a person',
			'a person'
		];

		testConstruction(string, expectedTypeNames, expectedSurroundings);		
	});


	test('Whitespace does not affect result', () => {
		const string1 = '  *a person* 	goes to		*a doctor* to treat *an illness*   ';
		const template1 = Template.fromString(typeTree, string1);

		const string2 = '*a person* goes to *a doctor* to treat *an illness*';
		const template2 = Template.fromString(typeTree, string2);

		assert.ok(
			template1.elements.length === template2.elements.length
			&& template1.elements.every(
				(el, idx) => el.elementKind === template2.elements[idx].elementKind
					&& el.name === template2.elements[idx].name
			)
		);
	});
});


suite('Template.fromLGG()', () => {
	function testConstruction(
			formulas: string[],
			expectedSurroundings: string[],
			expectedTypeCount: number
	) {
		const template = Template.fromLGG(formulas);
		let templateDetails = `Template constructed from LGG of \n${formulas.join('\n')}\n`;
		assert.ok(
			template !== undefined, 
			`${templateDetails} is undefined`
		);
		
		templateDetails += `with string repr = ${template.toString()}\n`;


		assert.ok(
			template.types.length === expectedTypeCount,
			`${templateDetails}has ${template.types.length} types when ${expectedTypeCount} types were expected.`
		);

		assert.ok(
			template.surroundings.length === expectedSurroundings.length
			&& template.surroundings.every(
				({ name: phrase }, idx) => phrase === expectedSurroundings[idx]
			),
			`${templateDetails} has surroundings\n${template.surroundings.map(s => s.name).join('\n')}\n but the surroundings\n${expectedSurroundings.join('\n')}\n were expected`
		);
	}


	test('Works with no edge cases', () => {
		const formulas = [
			'bob smith goes to doctor fred to fix his leg',
			'alison may goes to nurse joan to fix her ankle'
		];

		const expectedSurroundings = [
			'goes to',
			'to fix'
		];

		const expectedTypeCount = 3;
		testConstruction(formulas, expectedSurroundings, expectedTypeCount);
	});

	test('Formulas can end in a variable', () => {
		const formulas = [
			'fred bloggs travels to guantanamo bay',
			'alice smith travels to new york',
			'peter the plumber travels to hawaii'
		];

		const expectedSurroundings = [
			'travels to',
		];

		const expectedTypeCount = 2;
		for (const sublist of everySublistOf(formulas))
			testConstruction(
				sublist, 
				expectedSurroundings, 
				expectedTypeCount
			);
	});

	test('Formulas can end in a surrounding', () => {
		const formulas = [
			'fred bloggs travels to guantanamo bay on holiday',
			'alice smith travels to new york on holiday',
			'peter the plumber travels to hawaii on holiday'
		];

		const expectedSurroundings = [
			'travels to',
			'on holiday'
		];

		const expectedTypeCount = 2;
		for (const sublist of everySublistOf(formulas))
			testConstruction(
				sublist, 
				expectedSurroundings, 
				expectedTypeCount
			);
	});


	test('Incompatible formulas give no template', () => {
		const formulas = [
			'an apple a day keeps the doctor away',
			// 'one two three four five',
			// 'hello',
			// 'six seven eight nine ten',
			'sixteen seventeen eighteen nineteen twenty'
		];

		for (const sublist of everySublistOf(formulas)) {
			if (sublist.length >= 2) {
				const template = Template.fromLGG(formulas);
				assert.ok(
					template === undefined, 
					`\nFormulas:\n${sublist.join('\n')}\ngive template\n${template?.toString()}`
				);
			}
		}
	});

	test('Terms can vary greatly in length', () => {
		const formulas = [
			'bob eats',
			'there is not a person in the world who wouldnt say that he or she eats'
		];

		const expectedSurroundings = [
			'eats'
		];

		const expectedTypeCount = 1;
		testConstruction(formulas, expectedSurroundings, expectedTypeCount);
	});

	test('Works with repeated terms', () => {
		const formulas = [
			'alice likes alice and alice',
			'jane smith likes jane smith and janne smith'
		];

		const expectedSurroundings = [
			'likes',
			'and'
		];

		const expectedTypeCount = 3;
		testConstruction(formulas, expectedSurroundings, expectedTypeCount);
	});

	test('Terms can have common substrings', () => {
		const formulas = [
			'alice jones likes alice potter and peters girlfriend alice',
			'john smith likes blacksmiths and johnson'
		];

		const expectedSurroundings = [
			'likes',
			'and'
		];

		const expectedTypeCount = 3;
		testConstruction(formulas, expectedSurroundings, expectedTypeCount);
	});
});



suite('Template.toString()', () => {
	const typeTree = new TypeTree();

	test('toString() and fromString() are inverse', () => {
		const strings = [
			'*a person* likes to go to *a place* at *a time*',
			'',
			'   *a person*      goes to   	 *a place*  at *a time*    ',
			'   .     '
		];

		for (const string of strings) {
			const template = Template.fromString(typeTree, string);
			assert.strictEqual(
				template.toString(),
				string.replace('.', '').replace(/\s+/g, ' ').trim()
			);
		}
	});
});


suite('Template.toSnippet()', () => {
	const typeTree = new TypeTree();

	test('toSnippet() sanitised is inverse of fromString()', () => {
		const strings = [
			'*a person* likes to go to *a place* at *a time*',
			'',
			'   *a person*      goes to   	 *a place*  at *a time*    ',
			'   .     '
		];

		const typeNameInSnippet = /\${\d+\s*:\s*([\w|\s]+)\s*}/g;
		for (const string of strings) {
			const template = Template.fromString(typeTree, string);
			const snippet = template.toSnippet();

			let snippetSanitised = snippet;
			for (const m of snippet.matchAll(typeNameInSnippet))
				snippetSanitised = snippetSanitised.replace(m[0], `*${m[1]}*`);

			const stringSantised = string.replace('.', '').replace(/\s+/g, ' ').trim();
			
			assert.equal(
				snippetSanitised,
				stringSantised
			);
		}
	});
});

suite('Template.withVariable()', () => {
	const typeTree = new TypeTree();

	test('withVariable differs from original by just variable', () => {
		interface TestCase {
			templateString: string,
			term: Term,
			surroundingsCount: number,
			typeCount: number
		}

		const testCases: TestCase[] = [
			{
				templateString: '*a person* goes to london to visit *a museum*',
				term: new Atom('london', new Type('a place', [])),
				surroundingsCount: 2,
				typeCount: 3
			},
			{
				templateString: '*a person* goes to london to visit *a museum* today',
				term: new Atom('london', new Type('a place', [])),
				surroundingsCount: 3,
				typeCount: 3
			},
			{
				templateString: '*a person* ships ships',
				term: new Atom('ships', new Type('a product', [])),
				surroundingsCount: 1,
				typeCount: 2
			},
			{
				templateString: '*a person* goes to london to see london even though theyve been to london on *a day*',
				term: new Atom('london', new Type('a place', [])),
				surroundingsCount: 4,
				typeCount: 5
			}
		];

		for (const { templateString, term, surroundingsCount, typeCount } of testCases) {
			const template = Template.fromString(typeTree, templateString);
			const newTemplate = template.withVariable(term);

			assert.ok(
				newTemplate.surroundings.length === surroundingsCount
				&& newTemplate.surroundings.every(newS => 
					template.surroundings.some(oldS => 
						oldS.name.includes(newS.name)
					)
				),
				`old template = ${templateString}\nterm = ${term.name}\nnew template = ${newTemplate.toString()}\nexpected ${surroundingsCount} surroundings but have ${newTemplate.surroundings.length}`
			);

			assert.ok(
				newTemplate.types.length === typeCount && 
				template.types.every(oldT => 
					newTemplate.types.some(newT => 
						newT.name === oldT.name	
					)
				),
				`old template = ${templateString}\nterm = ${term.name}\nnew template = ${newTemplate.toString()}\nexpected ${typeCount} types but have ${newTemplate.types.length}`
			);
			
		}
	});
});


suite('Template.matchesFormula()', () => {
	const typeTree = new TypeTree();

	interface TestCase  {
		template: string,
		formula: string
	}

	test('Positive examples', () => {
		const testCases: TestCase[] = [
			{
				template: '*a person* goes to *a place* to visit *a thing*',
				formula: 'john doe goes to london to visit the museum'
			},
			{
				template: '*a person* goes to *a place* to visit *a thing*',
				formula: 'john doe goes to london to visit the london'
			},
			{
				template: '*a person* goes to *a place* to visit *a thing*',
				formula: 'john doe goes to john doe to visit john doe'
			}
		];

		for (const { template: templateString, formula } of testCases) {
			const template = Template.fromString(typeTree, templateString);
			assert.ok(
				template.matchesFormula(formula),
				`Expected to match:\n
				template = ${template.toString()}\n
				formula = ${formula}`	
			);
		}
	});

	test('Negative examples', () => {
		const testCases: TestCase[] = [
			{
				template: '*a person* goes to *a place* to visit *a thing*',
				formula: 'john doe goess to london to visit the museum'
			},
			{
				template: '*a person* goes to *a place* to visit *a thing*',
				formula: 'goes to london to visit the the museum'
			},
			{
				template: '*a person* goes to *a place* to visit *a thing*',
				formula: 'john doe goes to john doe to visit'
			}
		];

		for (const { template: templateString, formula } of testCases) {
			const template = Template.fromString(typeTree, templateString);
			assert.ok(
				!template.matchesFormula(formula),
				`Expected to not match:\n
				template = ${template.toString()}\n
				formula = ${formula}`	
			);
		}
	});
});


suite('Template.matchScore()', () => {
	const typeTree = new TypeTree();
	test('Match score decreases as templates become more general', () => {
		const templateStrings = [
			'*a person* goes to *a location* on holiday on *a date* by using *an airline*',
			'*a person* goes to *a location* by using *an airline*',
			'*a person* goes *a place*',
			'*an X'
		];

		const templates = templateStrings.map(t => Template.fromString(typeTree, t));
		const terms = listOfPhrases();
		const formula = formulaForTemplate(templates[0]);

		const scores = templates.map(t => t.matchScore(formula));
		for (let i = 1; i < scores.length; i++) {
			assert.ok(
				scores[i] < scores[i - 1],
				`\nformula = ${formula}\n
				template ${i} = ${templates[i].toString()}\n
				score ${i} = ${scores[i]}\n
				template ${i - 1} = ${templates[i - 1].toString()}\n
				score ${i - 1} = ${scores[i - 1]}\n
				`
			);
		}
	});
});

suite('Template.substituteTerms()', () => {
	test('Terms are substituted and features are preserved', () => {
		const templateStrings = [
			'*a person* goes to *a location* on holiday on *a date* by using *an airline*',
			'*a person* goes to *a location* by using *an airline*',
			'*a person* goes *a place*',
			'*an X'
		];

		for (const string of templateStrings) {
			const localTypeTree = new TypeTree();
			const template = Template.fromString(localTypeTree, string);
			const formula = formulaForTemplate(template);

			for (let i = 1; i < formula.length; i++) {
				const subformula = template.parseFormula(localTypeTree, formula.substring(0, i));
				const newTemplate = template.substituteTerms(subformula.name);

				assert.ok(
					newTemplate.types.every(newT => 
						template.types.some(oldT => 
							oldT.name === newT.name	
						)	
					)
				);

				assert.ok(
					template.surroundings.every(oldS => 
						newTemplate.surroundings.some(newS => 
							newS.name.includes(oldS.name)	
						)	
					)
				);

				assert.ok(
					subformula.terms.every(t => 
						newTemplate.surroundings.some(newS => 
							newS.name.includes(t.name)	
						)	
					)
				);
			}
		}
	});
});

suite('Template.parseFormula()', () => {
	test('Parses auto-generated formulas', () => {
		const templateStrings = [
			'*a person* goes to *a location* on holiday on *a date* by using *an airline*',
			'*a person* goes to *a location* by using *an airline*',
			'*a person* goes *a place*',
			'*an X'
		];
	
		for (const string of templateStrings) {
			const localTypeTree = new TypeTree();
			const template = Template.fromString(localTypeTree, string);
			const terms = listOfPhrases().slice(0, template.types.length);
			const formulaString = formulaForTemplate(template, terms);
			const formula = template.parseFormula(localTypeTree, formulaString);
	
			assert.ok(
				terms.length === formula.terms.length
				&& terms.every((term, idx ) => 
					term === formula.terms[idx].name
				),
				`formula = ${formulaString}\n
				with terms = \n
				[${terms.join(',')}]\n

				template generated formula = ${formula.name}\n
				with terms = \n
				[${formula.terms.map(t => t.name).join(',')}]
				`
			);
	
			assert.ok(
				formula.surroundings.every((surrounding, idx) => 
					surrounding.name === template.surroundings[idx].name
					&& formulaString.includes(surrounding.name)
				)
			);
		}
	});
});


function formulaForTemplate(
	template: Template, 
	terms: string[] = listOfPhrases()
): string {
terms = terms.filter(_ => true);
let formula = template.toString();
for (const type of template.types) {
	formula = formula.replace(
		new RegExp(`\\*${type.name}\\*`, 'g'), 
		terms[0]
	);
	terms.shift();
}

return formula;
}