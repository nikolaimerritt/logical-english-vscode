import * as vscode from 'vscode';
import * as assert from 'assert';
import { getDocUri, activate, positionToString, makeRange, equalRange } from './helper';

suite('Template Generation Quick Fixes', () => {
	const docUri = getDocUri('quick-fixes.le');
	
	test('Re-using term: term defined before atomic formula', async () => {
		await testQuickFixes(
			docUri,
			makeRange(6, 8, 6, 42), 
			{
				range: makeRange(2, 0, 2, 0),
				newText: '*a person* has married *a person*'
			}
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