import { deepCopy, removeBlanks, removeFirst, regexSanitise, maximal, sortBy } from './utils';
import { Type, TypeTree } from './type';
import { Term } from './term';

export enum TokenKind {
	Type,
	Word
}


export type PredicateWord = string;


export class Token {
	public readonly kind: TokenKind;
	public readonly content: Type | PredicateWord;

	constructor(kind: TokenKind, content: Type | PredicateWord) {
		this.kind = kind;
		this.content = content;
	}

	public static fromType(type: Type): Token {
		return new Token(TokenKind.Type, type);
	}

	public static fromWord(word: PredicateWord): Token {
		return new Token(TokenKind.Word, word);
	}
}


export class Template {
	private readonly elements: Token[];
	public static readonly typeNameRegex = /\*(an? [\w|\s]+)\*/;

	private constructor(_elements: Token[]) {
		this.elements = _elements;
	}


	public static fromString(typeTree: TypeTree, templateString: string, useExistingVariableNames = true): Template {
		templateString = templateString.replace('.', '');
		const argumentBlockRegex = /((?:\*)an? (?:[\w|\s]+)\*)/g;
		const elementStrings = templateString.split(argumentBlockRegex);

		let variableIdx = 0;

		const elements: Token[] = [];
		for (let elString of elementStrings) {
			elString = elString.trim();
			if (elString.length > 0) {
				const varName = elString.match(Template.typeNameRegex);
				if (varName === null) 
					// elements.push(new PredicateWord(elString));
					elements.push(Token.fromWord(elString));

				else {
					const typeName = useExistingVariableNames 
						? elString.replace(/\*/g, '')
						: Template.variableName(variableIdx++);

					elements.push(Token.fromType(typeTree.getType(typeName)));
					// if (useExistingVariableNames)
					// 	// elements.push(new TemplateVariable(elString.replace(/\*/g, '')));
					// else 
					// 	elements.push(new TemplateVariable(Template.variableName(variableIdx++)));
				} 
			}
		}

		// const elements: TemplateElement[] = elementStrings
		// .map(elString => elString.trim())
		// .filter(elString => elString.length > 0)
		// .map(elString => {
		// 	const varName = elString.match(argumentNameRegex);
		// 	if (varName !== null) {
		// 		if (useExistingVariableNames)
		// 			return new TemplateVariable(elString);
		// 		else 
		// 			return new TemplateVariable(Template.variableName(variableIdx++));
		// 	}
				
		// 	return new PredicateWord(elString);
		// });

		return new Template(elements);
	}


	public static fromLiteral(typeTree: TypeTree, literal: string, terms: Term[]): Template {
		literal = literal.replace('.', '');
		terms = terms.filter(t => t.name.trim().length > 0);
		const sanitisedTermNames = terms.map(t => regexSanitise(t.name));
		const argumentBlockRegex = new RegExp(`(?:(${sanitisedTermNames.join('|')}))`, 'g');
		const elementStrings = removeBlanks(literal.split(argumentBlockRegex));

		let variableIdx = 0;
		const elements: Token[] = elementStrings
		.map(el => {
			if (terms.some(t => t.name === el)) 
				// return new TemplateVariable(Template.variableName(variableIdx++));
				return Token.fromType(typeTree.getType(Template.variableName(variableIdx++)));
			// return new PredicateWord(el);
			return Token.fromWord(el);
		});

		return new Template(elements);
	}

	public static fromLGG(typeTree: TypeTree, literals: string[]): Template | undefined {
		if (literals.length === 0)
			return undefined;

		if (literals.length === 1)
			return Template.fromString(typeTree, literals[0]);

		const wordsFromEachLiteral = literals.map(literal => literal.replace('.', '').split(/\s+/g));
		const predicateWords = Template.predicateWordsFromLiterals(wordsFromEachLiteral);
		
		// assumes that literals all conform to same template
		// takes first literal, compares against predicate words to construct a template
		const termNames = Template.termNamesFromLiteral(literals[0], predicateWords);
		const terms = termNames.map(t => new Term(t, typeTree.getType(t)));
		const template = Template.fromLiteral(typeTree, literals[0], terms);

		// now check that all literals match the template
		if (literals.some(literal => !template.matchesLiteral(literal)))
			return undefined;
		
		return template;
	}

	// chcks if `this` has same predicate name *and* same argument names / types as `other`
	public equals(other: Template): boolean {
		if (!this.hasSameSigniature(other))
			return false;
		
		for (let i = 0; i < this.elements.length; i++) {
			if (this.elements[i] !== other.elements[i])
				return false;
		}

		return true;
	}

	// checks if other has the same predicate name and argument count
	public hasSameSigniature(other: Template): boolean {
		if (other === null)
			return false;
		
		if (other === undefined)
			return false;
		
		if (this.elements.length !== other.elements.length)
			return false;
		
		for (let i = 0; i < this.elements.length; i++) {
			if (this.elements[i].kind !== other.elements[i].kind)
				return false;
			
			if (this.elements[i].kind === TokenKind.Word 
					&& other.elements[i].kind === TokenKind.Word
					&& this.elements[i].content as PredicateWord !== other.elements[i].content as PredicateWord)
				return false;
		}

		return true;
	}

	public toString(): string {
		return this.elements
		.map(el => {
			if (el.kind === TokenKind.Type)
				return `*${(el.content as Type).name}*`;
			
			return el.content as PredicateWord;
		})
		.join(' ');
	}

	public toSnippet(): string {
		let snippet = '';
		let placeholderCount = 0;
		this.elements.forEach(el => {
			if (el.kind === TokenKind.Type) {
				placeholderCount++;
				snippet += '${' + placeholderCount + ':' + (el.content as Type).name + '}';
			} else 
				snippet += (el.content as PredicateWord);
			
			snippet += ' ';
		});
		return snippet;
	}

	
	public termsFromLiteral(literal: string): Term[] {
		literal = literal.replace('.', '');
		const predicateWords = this.elements
		.filter(el => el.kind === TokenKind.Word)
		.map(w => w.content as PredicateWord)
		.flatMap(word => word.split(' '));

		const termNames = Template.termNamesFromLiteral(literal, predicateWords);
		const variables = this.types();
		const terms: Term[] = [];
		
		for (let i = 0; i < termNames.length; i++) 
			terms.push(new Term(termNames[i], variables[i]));
		
		return terms;
	}
	

	// TODO: refactor to take variable as term -- then no need for type tree
	public withVariable(term: Term, variableName: string | undefined = undefined): Template {
		if (variableName === undefined)
			variableName = `a ${term}`;
		
		const variableRegex = new RegExp(`(${regexSanitise(term.name)})`); // keeps the `variable` delimeter
		const newElements: Token[] = [];

		for (const el of this.elements) {
			if (el.kind === TokenKind.Word && variableRegex.test(term.name)) {
				const elementStrings = (el.content as PredicateWord).split(variableRegex);
				for (let elString of elementStrings) {
					elString = elString.trim();
					if (elString.length > 0) {
						if (elString === term.name)
							// newElements.push(new TemplateVariable(variableName));
							newElements.push(Token.fromType(term.type));
						else 
							// newElements.push(new PredicateWord(elString));
							newElements.push(Token.fromWord(elString));
					}
				}
			} 
			else 
				newElements.push(el);
		}

		return new Template(newElements);
	}

	private static variableName(index: number): string {
		const variableNames = [
			'an X',
			'a Y',
			'a Z',
		];


		if (index >= variableNames.length) {
			const subscript = 1 + index - variableNames.length;
			return `an A${subscript}`;
		}

		return variableNames[index];
	}

	// the 	big mother 		of the person is 	unknown
	// the 	very ugly dad 	of the person is 	a citizen
	// the 	___				of the person is	___

	private static predicateWordsFromLiterals(literals: string[][]): string[] {
		const literal = literals[0];
		const otherLiterals: string[][] = deepCopy(literals.slice(1, undefined));
		const predicateWords: string[] = [];

		for (const word of literal) {
			if (otherLiterals.every(literal => literal.includes(word))) {
				predicateWords.push(word);
				for (const otherLiteral of otherLiterals) 
					removeFirst(otherLiteral, word);
			}
		}

		return predicateWords;
	}
		
	private static termNamesFromLiteral(literal: string, predicateWords: string[]): string[] {
		const literalWords = literal.split(/\s+/g);
		const terms: string[] = [];
		let currentTerm = '';

		literalWords.forEach(word => {
			if (predicateWords.length > 0 && word === predicateWords[0]) {
				if (currentTerm.length > 0) {
					terms.push(currentTerm);
					currentTerm = '';
				}
				predicateWords.shift(); // pop first word
			}
			else {
				if (currentTerm.length > 0)
					currentTerm += ' ';
				currentTerm += word;
			}
		});

		if (currentTerm.length > 0) 
			terms.push(currentTerm);

		return terms;
	}


	// public termsFromIncompleteLiteral(literal: string): string[] {
	// 	const literalWords = literal.split(/\s+/g);
	// 	const predicateWords = this.predicateWords()
	// 	.flatMap(w => w.split(/\s+/g));
	// 	const terms: string[] = [];
	// 	let currentTerm = '';


	// 	for (let i = 0; i < literalWords.length; i++) {
	// 		if (predicateWords.length > 0 && 
	// 				(literalWords[i] === predicateWords[0] 
	// 					|| i === literalWords.length - 1 && predicateWords[0].startsWith(literalWords[i]))) {
	// 			if (currentTerm.length > 0) {
	// 				terms.push(currentTerm);
	// 				currentTerm = '';  
	// 			}
	// 			predicateWords.shift(); // pop first word
	// 		} else {
	// 			if (currentTerm.length > 0) 
	// 				currentTerm += ' ';
	// 			currentTerm += literalWords[i];
	// 		}
	// 	}

	// 	if (currentTerm.length > 0)
	// 		terms.push(currentTerm);

	// 	return terms;
	// }


	// *a person* wants to see *a place*
	// fred bloggs
	// fred bloggs wan
	// fred bloggs wants to see italy
	public termsFromIncompleteLiteral(literal: string): string[] {
		const terms: string[] = [];
		for (const predWord of this.predicateWords()) {
			let predWordIdx = literal.indexOf(predWord);
			if (predWordIdx === -1) {
				// does the literal ends with the start of the predicate word?
				const maybePredWordIdx = Array.from(Array(literal.length).keys())
				.find(i => predWord.startsWith(literal.slice(i, undefined)));
				if (maybePredWordIdx !== undefined)
					predWordIdx = maybePredWordIdx;
				
			} 
			if (predWordIdx !== -1) {
				terms.push(literal.slice(0, predWordIdx).trim());
				literal = literal.slice(predWordIdx + predWord.length, undefined).trim();
			}
		}

		return terms;
	}


	// TODO: use clause to see if the types of literal's terms match with this template
	// TODO: why not simply extract predicate words from literal?
	public matchesLiteral(literal: string): boolean {
		// given literal L, template T
		// extract terms of L, assuming that L matches T
		// generate a template T' from L  using the extracted terms
		// check if T' has same signiature as T
		
		literal = literal.replace(/\./g, '');
		const terms = this.termsFromLiteral(literal);
		// TODO: ignoring types here, by supplying blank type tree!
		const templateOfLiteral = Template.fromLiteral(new TypeTree(), literal, terms);
		return this.hasSameSigniature(templateOfLiteral);
	}


	// score = length of literal words that are shared
	// *a person* wants to see *a thing* at *a location*
	// fred bloggs [wan] --> score = 3
	// fred bloggs [wants to see] the eiffel tower [at] --> score = 12
	// wants to [wants to see] --> score = 10
	public incompleteMatchScore(literal: string): number {
		const terms = this.termsFromIncompleteLiteral(literal);
		const termsLength = terms.join().length;
		const predicateWordsLength = literal.length - termsLength;
		return predicateWordsLength;
	}

	// *an A* 		really likes 	*a B* 	with value 	*a C*
	// fred bloggs	really likes 	apples	with val
	// output = fred bloggs really likes apples with value *a C*
	public withMissingTerms(typeTree: TypeTree, literal: string): Template {
		const terms = this.termsFromIncompleteLiteral(literal);
		const tokens: Token[] = [];
		this.elements.forEach(token => {
			if (token.kind === TokenKind.Word) 
				tokens.push(token);
			else if (token.kind === TokenKind.Type) {
				if (terms.length > 0) {
					// templateElements.push(new PredicateWord(terms[0]));
					tokens.push(Token.fromWord(terms[0])); // using term as word, rather than variable
					terms.shift(); // remove first term
				} else 
					tokens.push(token);
			}
		});

		return new Template(tokens);
	}

	// finds the template that 
	// 	- matches the literal
	// 	- then, has the most amount of variables
	//  - then, has the longest name
	public static findBestMatch(templates: Template[], literal: string): Template | undefined {
		const candidates = templates.filter(t => t.matchesLiteral(literal));

		if (candidates.length === 0)
			return undefined;

		const maxVariableCount = Math.max(...candidates.map(t => t.types().length));
		const candidatesWithMaxVars = candidates.filter(t => t.types().length === maxVariableCount);
		return maximal(candidatesWithMaxVars, t => t.predicateWords().join(' ').length);
	}


	public predicateWords(): PredicateWord[] {
		return this.elements
		.filter(el => el.kind === TokenKind.Word)
		.map(el => el.content as PredicateWord);
	} 


	public types(): Type[] {
		return this.elements
		.filter(el => el.kind === TokenKind.Type)
		.map(el => el.content as Type);
	}
}

