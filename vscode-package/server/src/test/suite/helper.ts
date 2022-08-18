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