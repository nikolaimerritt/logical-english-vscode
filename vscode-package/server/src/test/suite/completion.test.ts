import * as vscode from 'vscode';
import * as assert from 'assert';
import { getDocUri, activate } from './helper';

suite('Should do a completion', () => {
	const docUri = getDocUri('small.le');

	test('Complete JS / TS', async () => {
		await testCompletion(
			docUri, 
			new vscode.Position(9, 8),
			[
				'mike works for *a person*'
			]
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
At position (line = ${position.line}, char = ${position.character})\n
text at position = '${editor?.document.getText(new vscode.Range(position, new vscode.Position(position.line + 1, 0)))}'\n
Expected completions:\n
${completionsToString(expectedCompletions)}
Actual completions:\n
${completionsToString(completions.items)}
	`;

	assert.ok(
		completions.items.length === expectedCompletions.length, 
		message
	);
	
	expectedCompletions.forEach((expectedItem, idx) => {
		const actualItem = completions.items[idx];
		assert.equal(actualItem.label, expectedItem.label, message);
		assert.equal(actualItem.kind, expectedItem.kind, message);
	});
}