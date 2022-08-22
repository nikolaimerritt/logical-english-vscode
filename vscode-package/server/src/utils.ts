
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