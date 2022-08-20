import * as vscode from 'vscode';
import * as assert from 'assert';
import { getDocUri, activate, positionToString } from './helper';

suite('Completions', () => {
	const docUri = getDocUri('completions.le');

	test('Complete with no more variables', async () => {
		await testCompletion(
			docUri,
			new vscode.Position(12, 15),
			[ 'fred bloggs takes a week off work' ]
		);
	});

	test('Complete with one more variable', async () => {
		await testCompletion(
			docUri, 
			new vscode.Position(13, 8),
			[
				'mike works for *a person*'
			]
		);
	});

	test('Complete starting with surrounding', async () => {
		await testCompletion(
			docUri, 
			new vscode.Position(14, 5),
			[ 'a week off work is taken by *an employee* due to *a reason*' ]
		);
	});

	test('Completion works in higher-order atomic formula', async () => {
		await testCompletion(
			docUri,
			new vscode.Position(16, 66),
			['a week off work is taken by fred bloggs due to fred bloggs wants to go to *a location*']
		);
	});
});

function completionsToString(completions: vscode.CompletionItem[]) {
	return completions.map(({ label }) => `'${label}'`).join('\n');
}

async function testCompletion(
		docUri: vscode.Uri,
		position: vscode.Position,
		labels: string[]
) {
	const editor = await activate(docUri);

	const expectedCompletions = labels.map(label => ({ label, kind: vscode.CompletionItemKind.Text }));

	const completions = (await vscode.commands.executeCommand(
		'vscode.executeCompletionItemProvider',
		docUri, 
		position
	)) as vscode.CompletionList;



	const message = `
In document ${docUri.path}\n
At position ${positionToString(position)}\n
text at position = '${editor?.document.getText(new vscode.Range(position, new vscode.Position(position.line + 1, 0)))}'\n
Expected completions:\n
${completionsToString(expectedCompletions)}
Actual completions:\n
${completionsToString(completions.items)}
	`;

	assert.ok(
		expectedCompletions.length <= completions.items.length, 
		message
	);
	
	expectedCompletions.forEach(expectedItem => {
		const actualItem = completions.items
		.find(c => c.label === expectedItem.label && c.kind === expectedItem.kind);
		assert.ok(actualItem, message);
	});
}