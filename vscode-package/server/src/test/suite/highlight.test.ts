import * as vscode from 'vscode';
import * as assert from 'assert';
import { getDocUri, activate, positionToString, makeRange, equalRange } from './helper';

suite('Semantic tokens', () => {
	test('Semantic tokens from a short document', async () => {
		const docUri = getDocUri('highlight.le');
		await testSemanticTokens(
			docUri,
			[
				Token.variable(4, 0, 'bob frank'),
				Token.variable(4, 18, 'lisbon')
			]
		);
	});
});


async function testSemanticTokens(docUri: vscode.Uri, expectedTokens: Token[]) {
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
	const message = `
In file ${docUri.path},
expected tokens 
${expectedTokens.map(t => t.toString()).join('\n')}
received tokens 
${tokens.map(t => t.toString()).join('\n')}
`;

	assert.equal(expectedTokens.length, tokens.length, message);
	expectedTokens.forEach((expectedToken, idx) => {
		assert.ok(expectedToken.equal(tokens[idx]), message);
	});
}



class Token {
	constructor(
		public readonly line: number,
		public readonly char: number,
		public readonly length: number,
		public readonly tokenType: string
	) { }

	public toString() {
		return `'${this.tokenType}' at line ${this.line} from char ${this.char} to char ${this.char + this.length}`;
	}

	public equal(other: Token) {
		return this.line === other.line
			&& this.char === other.char
			&& this.length === other.length
			&& this.tokenType === other.tokenType;
	}

	public static variable(line: number, char: number, name: string) {
		return new Token(
			line,
			char, 
			name.length,
			'variable'
		);
	}

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