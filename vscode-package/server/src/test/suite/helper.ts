import { DocumentUri, TextDocument } from 'vscode-languageserver-textdocument';
import * as vscode from 'vscode';
import * as path from 'path';

export function everySublistOf<T>(list: T[], minLength = 2) {
	return everySublistRec(list)
	.filter(sub => sub.length >= minLength);
}


function everySublistRec<T>(list: T[]): T[][] {
	if (list.length === 1)
		return [list, []];

	// sublist with list[0] present + sublist with list[0] absent
	const withoutFirst = everySublistRec(list.slice(1, undefined));
	const every: T[][] = [];
	for (const sublist of withoutFirst) {
		every.push(sublist);	
		every.push(sublist.concat([ list[0] ]));
	}
	return every;
}

export function listOfPhrases(): string[] {
	const maxPhrases = 10;
	const maxWordsPerPhrase = 3;
	const maxWords = maxPhrases * maxWordsPerPhrase;

	const text = 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum';
	const words = text
	.replace(/,|\./g, '')
	.toLowerCase()
	.repeat(Math.ceil(maxWords / countOccurances(text, ' ')))
	.split(' ');

	const spacesCounts = `${Math.E}${Math.PI}`
	.replace(/\./g, '')
	.split('')
	.map(n => 1 + parseInt(n) % maxWordsPerPhrase);


	const phrases: string[] = [];
	let spaceCountIdx = 0;
	let phrase = '';
	for (const word of words) {
		if (countOccurances(phrase, ' ') === spacesCounts[spaceCountIdx]) {
			phrases.push(phrase.trim().replace(/\s+/g, ' '));
			phrase = '';
			spaceCountIdx = (spaceCountIdx + 1) % spacesCounts.length;
		}
		else 
			phrase += ' ' + word;
	}

	return phrases;

}


export function countOccurances(text: string, substring: string): number {
	return text.split(substring).length - 1;
}

export let doc: vscode.TextDocument;
export let editor: vscode.TextEditor;


export async function activate(docUri: vscode.Uri): Promise<vscode.TextEditor | undefined> {
	const extensionName = 'NikolaiMerritt.logical-english-vscode';
	const extension = vscode.extensions.getExtension(extensionName)!;
	if (extension === undefined)
		console.error(`Could not find extension with name '${extensionName}'`);

	await extension.activate();

	try {
		doc = await vscode.workspace.openTextDocument(docUri);
		editor = await vscode.window.showTextDocument(doc);
		return editor;
	}
	catch (error) {
		console.error(error);
	}

	return undefined;
}

export async function sleep(ms: number) {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export function getDocPath(p: string[]) {
	return path.resolve(__dirname, '../../../testFixture', ...p);
}

export function getDocUri(...p: string[]) {
	return vscode.Uri.file(getDocPath(p));
}

export async function setTestContent(content: string) {
	const all = new vscode.Range(
		doc.positionAt(0),
		doc.positionAt(doc.getText().length)
	);
	return editor.edit(editBuilder => editBuilder.replace(all, content));
}

export function positionToString(position: { line: number, character: number }) {
	return `(line = ${position.line}, char = ${position.character})`;
}

export function makeRange(startLine: number, startChar: number, endLine: number, endChar: number): vscode.Range {
	return new vscode.Range(
		new vscode.Position(startLine, startChar), 
		new vscode.Position(endLine, endChar)
	);
}

export function rangeOfWord(startLine: number, startChar: number, word: string): vscode.Range {
	return makeRange(startLine, startChar, startLine, startChar + word.length);
}

export function equalPosition(position: vscode.Position, otherPosition: vscode.Position) {
	return position.line === otherPosition.line 
	&& position.character === otherPosition.character;
}


export function equalRange(range: vscode.Range, otherRange: vscode.Range) {
	return equalPosition(range.start, otherRange.start) 
	&& equalPosition(range.end, otherRange.end);
}

export function objectToArray(object: any): any[] {
	return Object.keys(object)
	.map(key => [Number(key), object[key]]);
}