import * as vscode from 'vscode';
import * as assert from 'assert';
import { getDocUri, activate, positionToString, sleep, makeRange, equalRange } from './helper';

interface Diag {
	message: string,
	range: vscode.Range
}

const errorMessage = 'Atomic formula has no template.';

suite('Diagnostics: Atomic formula has no template', () => {

	const docUri = getDocUri('notemplate.le');

	test('Incomplete template surrounding', async () => {
		await testDiagnostics(
			docUri,
			[ diagAt(5, 4, 'fred bloggs go') ]
		);
	});

	test('Complete template surrounding, missing variable', async () => {
		await testDiagnostics(
			docUri,
			[ diagAt(6, 4, 'fred bloggs goes on holiday to') ]
		);
	});

	test('In higher-order formula: incomplete template surrounding', async () => {
		await testDiagnostics(
			docUri,
			[],
			[ diagAt(7, 48, 'fred bloggs go') ]
		);
	});

	test('In higher-order formula: missing variable', async () => {
		await testDiagnostics(
			docUri,
			[],
			[ diagAt(8, 48, 'fred bloggs goes on holiday to') ]
		);
	});
});


async function testDiagnostics(docUri: vscode.Uri, expectedDiags: Diag[], dontWantDiags: Diag[] = []) {
	const editor = await activate(docUri);
	await vscode.commands.executeCommand(
		'vscode.provideDocumentSemanticTokensLegend',
		docUri
	);
	const diags = await vscode.languages.getDiagnostics(docUri);

	const message = 
`
In document ${editor?.document.fileName}
expected diagnostics 
${expectedDiags.map(diagnosticToString).join('\n')}

received diagnostics
${diags.map(diagnosticToString).join('\n')}
`;

	assert.ok(expectedDiags.length <= diags.length, message);

	for (const expectedDiag of expectedDiags) {
		const foundDiag = diags
		.find(
			d => d.message === expectedDiag.message 
			&& equalRange(d.range, expectedDiag.range)
		);

		assert.ok(foundDiag, message);
	}

	for (const dontWant of dontWantDiags) {
		const foundDiag = diags
		.find(
			d => d.message === dontWant.message 
			&& equalRange(d.range, dontWant.range)
		);

		assert.ok(foundDiag === undefined, message);
	}
}


function diagnosticToString(diagnostic: Diag) {
	return `'${diagnostic.message}' from ${positionToString(diagnostic.range.start)} to ${positionToString(diagnostic.range.end)}`;
}

function diagAt(startLine: number, startChar: number, formula: string): Diag {
	return {
		message: errorMessage,
		range: makeRange(startLine, startChar, startLine, startChar + formula.length + 1)
	};
}