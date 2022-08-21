import * as vscode from 'vscode';
import * as assert from 'assert';
import { getDocUri, activate, positionToString, makeRange, equalRange } from './helper';

suite('Semantic tokens', () => {
	const docUri = getDocUri('highlight.le');
	const kbBeginningLine = 7;
	test('Highlighting when atomic formulas fully match template', async () => {
		await testSemanticTokens(
			docUri,
			[
				Token.variable(kbBeginningLine, 1, 'bob frank'),
				Token.variable(kbBeginningLine, 19, 'lisbon')
			]
		);
	});

	test('Highlighting HOAF when HOAF fullly matches template', async () => {
		await testSemanticTokens(
			docUri,
			[
				Token.variable(kbBeginningLine + 1, 1, 'steve odoherty'),
				Token.variable(kbBeginningLine + 1, 34, 'the fact')
			]
		);
	});

	test('Highlighting HOAF and sub-formula when HOAF fullly matches template', async () => {
		await testSemanticTokens(
			docUri,
			[
				Token.variable(kbBeginningLine + 2, 1, 'will i am'),
				Token.variable(kbBeginningLine + 2, 29, 'steve odoherty'),
				Token.variable(kbBeginningLine + 2, 52, 'lisbon'),
			]
		);
	});

	test('Highlighting term that appears as surrounding', async () => {
		await testSemanticTokens(
			docUri,
			[
				Token.variable(kbBeginningLine + 3, 1, 'merchant mike'),
				Token.variable(kbBeginningLine + 3, 21, 'ships'),
			]
		);
	});

	test('Highlighting term that appears multiple times', async () => {
		await testSemanticTokens(
			docUri,
			[
				Token.variable(kbBeginningLine + 4, 1, 'merchant mike'),
				Token.variable(kbBeginningLine + 4, 20, 'bob spence'),
				Token.variable(kbBeginningLine + 4, 39, 'bob spence'),
				Token.variable(kbBeginningLine + 4, 63, 'merchant mike'),
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

	assert.ok(expectedTokens.length <= tokens.length, message);

	for (const expectedToken of expectedTokens) {
		const actualToken = tokens
		.find(t => t.equal(expectedToken));

		assert.ok(actualToken, message);
	}
}



class Token {
	private static maxUint32 = 4294967295;

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
		const dataArray = Token.dataToArray(data)
		.map(int => {
			if (int > 10000)
				return Token.maxUint32 - int;
			return int;
		});
		const tokens: Token[] = [];

		let line = 0;
		let char = 0;
		for (let i = 0; i < Math.floor(dataArray.length / 5); i++) {
			const deltaLine = dataArray[5 * i];
			const deltaChar = dataArray[5 * i + 1];
			const length = dataArray[5 * i + 2];
			const tokenType = dataArray[5 * i + 3];
			// ignore token modifier, at 5 * i + 4

			if (deltaLine === 0)
				char += deltaChar;
			else {
				char = deltaChar;
				line += deltaLine;
			}


			tokens.push(new Token(line, char, length, tokenTypesLegend[tokenType]));
		}

		return tokens;
	}

	private static dataToArray(data: any): number[] {
		data = data.data;
		const values = Object.values(data);
		const array = Array.from(values);
		const numArray = array.map(Number);
		return numArray;
	}
}