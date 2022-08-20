import * as vscode from 'vscode';
import * as assert from 'assert';
import { getDocUri, activate, positionToString, makeRange, equalRange } from './helper';

suite('Highlighting', () => {
	test('Semantic highlighting', async () => {
		const docUri = getDocUri('highlight.le');
		await testHighlights(docUri);
	});
});


async function testHighlights(docUri: vscode.Uri) {
	const editor = await activate(docUri);
	const tokenTypesLegend = (await vscode.commands.executeCommand(
			'vscode.provideDocumentSemanticTokensLegend',
			docUri
	) as vscode.SemanticTokensLegend)
	.tokenTypes;

	const tokensData = await vscode.commands.executeCommand(
		'vscode.provideDocumentSemanticTokens',
		docUri
	) as vscode.SemanticTokens;


	const tokens = Token.fromData(tokenTypesLegend, tokensData);
	assert.equal(JSON.stringify(tokens), 'tokens!');
}

class Token {
	constructor(
		public readonly line: number,
		public readonly char: number,
		public readonly length: number,
		public readonly tokenType: string
	) { }

	// data is of form { '0': number, '1': number, '2': number, ... }
	// according to https://microsoft.github.io/language-server-protocol/specifications/lsp/3.17/specification/#textDocument_semanticTokens
	public static fromData(tokenTypesLegend: string[], data: any): Token[] {
		const dataArray = Token.dataToArray(data);
		const tokens: Token[] = [];

		let line = 0;
		let char = 0;
		for (let i = 0; i < dataArray.length / 5; i++) {
			const deltaLine = dataArray[5 * i];
			const deltaChar = dataArray[5 * i + 1];
			const length = dataArray[5 * i + 2];
			const tokenType = dataArray[5 * i + 3];
			// ignore token modifier, at 5 * i + 4

			line += deltaLine;
			char += deltaChar;

			tokens.push(new Token(line, char, length, tokenTypesLegend[tokenType]));
		}

		return tokens;
	}

	private static dataToArray(data: any): number[] {
		return Array.from(Object.values(data.data));
	}
}