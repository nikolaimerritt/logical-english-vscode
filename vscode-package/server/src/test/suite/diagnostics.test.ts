import * as vscode from 'vscode';
import * as assert from 'assert';
import { getDocUri, activate, positionToString, sleep, makeRange, equalRange } from './helper';

interface Diag {
	message: string,
	range: vscode.Range
}

const errorMessage = 'Atomic formula has no template.';


suite('Diagnostics: Atomic formula has no template', () => {
	const docUri = getDocUri('no-template.le');

	test('Incomplete template surrounding', async () => {

		testDiagnostics(
			docUri,
			[ diagAt(5, 4, 5, 18) ]
		);
	});

	test('Complete template surrounding, missing variable', async () => {
		testDiagnostics(
			docUri,
			[ diagAt(6, 4, 6, 34) ]
		);
	});

	test('In higher-order formula: incomplete template surrounding', async () => {
		testDiagnostics(
			docUri,
			[ diagAt(7, 48, 7, 62) ]
		);
	});

	test('In higher-order formula: missing variable', async () => {
		testDiagnostics(
			docUri,
			[ diagAt(8, 48, 8, 80) ]
		);
	});
});


async function testDiagnostics(docUri: vscode.Uri, expectedDiags: Diag[]) {
	const editor = await activate(docUri);
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
}


function diagnosticToString(diagnostic: Diag) {
	return `'${diagnostic.message}' from ${positionToString(diagnostic.range.start)} to ${positionToString(diagnostic.range.end)}`;
}

function diagAt(startLine: number, startChar: number, endLine: number, endChar: number): Diag {
	return {
		message: errorMessage,
		range: makeRange(startLine, startChar, endLine, endChar)
	};
}