import * as vscode from 'vscode';
import * as assert from 'assert';
import { getDocUri, activate, positionToString, makeRange, equalRange, rangeOfWord } from './helper';

suite('Template Generation Quick Fixes', () => {	
	test('Re-using term: term defined before atomic formula', async () => {
		await testQuickFixes(
			getDocUri('quickfixes-vari.le'),
			rangeOfWord(6, 8, 'fred bloggs has married kim wexler'),
			{
				range: makeRange(2, 0, 2, 0),
				newText: '*a person* has married *a person*'
			}
		);
	});

	test('Re-using term: terms type is top of hierarchy', async () => {
		await testQuickFixes(
			getDocUri('quickfixes-top.le'),
			rangeOfWord(15, 8, 'fred bloggs becomes fed up of the hovel'),
			{
				range: makeRange(11, 0, 11, 0),
				newText: '*a person* becomes fed up of *an abode*.'
			},
		);
	});

	test('Re-using term: terms type is bottom of hierarchy', async () => {
		await testQuickFixes(
			getDocUri('quickfixes-bottom.le'),
			rangeOfWord(15, 8, 'fred bloggs becomes fed up of the white house'),
			{
				range: makeRange(11, 0, 11, 0),
				newText: '*a person* becomes fed up of *a mansion*.'
			},
		);
	});

	test('Re-using term: terms type is middle of hierarchy', async () => {
		await testQuickFixes(
			getDocUri('quickfixes-middle.le'),
			rangeOfWord(15, 8, 'fred bloggs becomes fed up of 221b baker street'),
			{
				range: makeRange(11, 0, 11, 0),
				newText: '*a person* becomes fed up of *a house*.'
			},
		);
	});

	test('LGG: one varying term in middle of atomic formula', async () => {
		await testQuickFixes(
			getDocUri('quickfixes-just-lgg-middle.le'),
			rangeOfWord(15, 4, 'he knows the plane tickets are affordable'),
			{
				range: makeRange(11, 0, 11, 0),
				newText: 'he knows the *an X* are affordable.'
			},
		);
	});

	test('LGG: three varying term at start, middle, end of atomic formula', async () => {
		await testQuickFixes(
			getDocUri('quickfixes-just-lgg-everywhere.le'),
			rangeOfWord(15, 4, 'he knows the plane tickets are affordable'),
			{
				range: makeRange(11, 0, 11, 0),
				newText: '*an X* knows the *a Y* are *a Z*.'
			},
		);
	});

	test('LGG: terms are multiple words long', async () => {
		await testQuickFixes(
			getDocUri('quickfixes-just-lgg-longer.le'),
			rangeOfWord(15, 4, 'he knows the plane tickets are affordable'),
			{
				range: makeRange(11, 0, 11, 0),
				newText: '*an X* knows the *a Y* are *a Z*.'
			},
		);
	});

	test('Reuse + LGG', async () => {
		await testQuickFixes(
			getDocUri('quickfixes-reuse-lgg.le'),
			rangeOfWord(15, 4, 'fred bloggs knows the plane tickets are affordable'),
			{
				range: makeRange(11, 0, 11, 0),
				newText: '*a person* knows the *an X* are *a Y*.'
			},
		);
	});
});


interface QuickFix {
	title: string,
	kind: { value: string },
	edit: QuickFixEdit
}

interface QuickFixEdit {
	range: vscode.Range,
	newText: string
}


async function testQuickFixes(docUri: vscode.Uri, range: vscode.Range, expectedEdit: QuickFixEdit) {
	const editor = await activate(docUri);
	const quickFixData = (await vscode.commands.executeCommand(
		'vscode.executeCodeActionProvider',
		docUri,
		range
	) as vscode.CodeAction);
	const quickFix = extractQuickFix(quickFixData);

	const message = 
`
In document ${docUri.path},
at range from ${positionToString(range.start)} to ${positionToString(range.end)}
expected quick fix edit ${JSON.stringify(expectedEdit, undefined, 4)}
found quick fix edit ${JSON.stringify(quickFix.edit, undefined, 4)}
`;

	assert.equal(quickFix.title, 'Generate a template', message);
	assert.equal(quickFix.kind.value, 'quickfix', message);
	assert.ok(equalRange(quickFix.edit.range, expectedEdit.range), message);
	assert.equal(
		sanitiseTemplate(quickFix.edit.newText), 
		sanitiseTemplate(expectedEdit.newText), 
		message
	);
}


function extractQuickFix(data: any): QuickFix {
	const title = data.at(0).title;
	const kindValue = data.at(0).kind.value;
	const editBlock = JSON.parse(JSON.stringify(data.at(0).edit));
	const edit = JSON.parse(JSON.stringify(editBlock.at(0).at(1).at(0)));
	const range = makeRange(
		edit.range.at(0).line, 
		edit.range.at(0).character, 
		edit.range.at(1).line,
		edit.range.at(1).character	
	);
	// const edit = data['edit'][0][1] as QuickFixEdit;

	return {
		title, 
		kind: { value: kindValue },
		edit: {
			range,
			newText: edit.newText
		}
	};
}

function sanitiseTemplate(template: string) {
	return template.replace('.', '').trim();
}