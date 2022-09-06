
import { Position, Range } from 'vscode-languageserver-textdocument';
import { connectivesRegex } from './parsing';


export function maximal<T>(list: T[], valueFunction: (element: T) => number): T {
	let bestElement = list[0];
	let maxValue = valueFunction(bestElement);

	for (let i = 1; i < list.length; i++) {
		const value = valueFunction(list[i]);
		if (value > maxValue) {
			bestElement = list[i];
			maxValue = value;
		}
	}

	return bestElement;
}

// sorts list in place
export function sortBy<T>(list: T[], key: (element: T) => number): T[] {
	return list.sort((a, b) => key(a) - key(b));
}


export function removeBlanks(words: string[]): string[] {
	return words
	.map(word => word.trim())
	.filter(word => word.length > 0);
}

export function removeFirst<T>(list: T[], element: T): void {
	const idx = list.indexOf(element);
	if (idx === -1)
		return;
	
	list.splice(idx, 1);
}


export function deepCopy<T>(object: T): T {
	return JSON.parse(JSON.stringify(object));
}

// taken from https://stackoverflow.com/questions/6300183/sanitize-string-of-regex-characters-before-regexp-build
export function regexSanitise(pattern: string): string {
	return pattern.replace(/[#-.]|[[-^]|[?|{}]/g, '\\$&');
}


export function sanitiseLiteral(literal: string): string {
	return literal.replace('.', '').trim();
}


export function literalAtPosition(line: string, characterOffset: number): string | undefined {
	const literals = line
	.split(connectivesRegex())
	.map(sanitiseLiteral)
	.filter(literal => literal.length > 0);

	for (const literal of literals) {
		const startPos = line.indexOf(literal);
		const endPos = startPos + literal.length;

		if (startPos <= characterOffset && characterOffset <= endPos)
			return literal;
	}

	return undefined;
}

export function ignoreComments(text: string): string {
	const singleLineComment = /%.*/g;
	return text.replace(singleLineComment, '');
}

export function paddedString(num: number, length = 4): string {
	return String(num).padStart(length, '0');
}

export function countOccurances(text: string, substring: string): number {
	return text.split(substring).length - 1;
}

export function isSamePosition(first: Position, second: Position) {
	return first.line === second.line && first.character === second.character;
}

export function isSameRange(first: Range, second: Range) {
	return isSamePosition(first.start, second.start) && isSamePosition(first.end, second.end);
}

export function findInText(text: string, substring: string, start: Position): Range | undefined {
	const i = positionToIndex(text, start);
	const startIdx = text.indexOf(
		substring, 
		i
	);
	if (startIdx === -1)
		return undefined;

	const endIdx = startIdx + substring.length;

	return {
		start: indexToPosition(text, startIdx),
		end: indexToPosition(text, endIdx)
	};
}


export function offsetRangeByPosition(range: Range, pos: Position): Range {
	return {
		start: {
			line: range.start.line + pos.line,
			character: range.start.character + pos.character
		},
		end: {
			line: range.end.line + pos.line,
			character: range.end.character + pos.character
		},
	};
}

export function offsetRangeByLine(range: Range, line: number): Range {
	return offsetRangeByPosition(range, { line, character: 0 });
}


export function positionToIndex(text: string, pos: Position): number {
	if (pos.line === 0)
        return pos.character;

	const linesBefore = text
    .split('\n')
    .slice(0, pos.line);
    
    // console.log('Lines before:');
    // console.log(linesBefore);

    const linesBeforeLength = linesBefore.join('\n').length;
	return linesBeforeLength + '\n'.length + pos.character;
}



export function indexToPosition(text: string, idx: number): Position {
	const textBefore = text.slice(0, idx);
	return {
		line: countOccurances(textBefore, '\n'),
		character: textBefore.split('\n').at(-1)!.length
	};
}


export function beforeSubstring(parent: string, substring: string) {
	const substringStart = parent.indexOf(substring);
	if (substringStart === -1)
		return '';

	return parent.slice(0, substringStart);
}

export function afterSubstring(parent: string, substring: string) {
	const substringStart = parent.indexOf(substring);
	if (substringStart === -1)
		return parent;

	return parent.slice(substringStart + substring.length, undefined);
}