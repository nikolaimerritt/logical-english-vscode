import { deepCopy, removeBlanks, removeFirst, regexSanitise, maximal, sortBy, sanitiseLiteral } from './utils';
import { dummyType, TypeTree } from './type-tree';
import { Type, TemplateElement, Surrounding, ElementKind } from './element';
import { Atom, Formula, FormulaElement, Term } from './formula';



export class Template {
	private readonly elements: TemplateElement[];
	public static readonly typeNameRegex = /\*(an? [\w|\s]+)\*/;

	private constructor(elements: TemplateElement[]) {
		this.elements = elements;
	}

	public get surroundings(): Surrounding[] {
		return this.elements
		.filter(el => el.elementKind === ElementKind.Surrounding)
		.map(el => el as Surrounding);
	} 


	public get types(): Type[] {
		return this.elements
		.filter(el => el.elementKind === ElementKind.Type)
		.map(el => el as Type);
	}

	public get allElements(): TemplateElement[] {
		return this.elements.map(x => x); // shallow copy
	}


	public static fromString(typeTree: TypeTree, templateString: string, useExistingVariableNames = true): Template {
		templateString = templateString.replace('.', '');
		const argumentBlockRegex = /((?:\*)an? (?:[\w|\s]+)\*)/g;
		const elementStrings = templateString.split(argumentBlockRegex);

		let variableIdx = 0;

		const elements: TemplateElement[] = [];
		for (let elString of elementStrings) {
			elString = elString.trim();
			if (elString.length > 0) {
				const varName = elString.match(Template.typeNameRegex);
				if (varName === null) 
					elements.push(new Surrounding(elString));

				else {
					const typeName = useExistingVariableNames 
						? elString.replace(/\*/g, '')
						: Template.variableName(variableIdx++);

					
					elements.push(typeTree.getType(typeName));
				} 
			}
		}

		return new Template(elements);
	}


	public static fromFormula(typeTree: TypeTree, formula: string, terms: Term[]): Template {
		formula = formula.replace('.', '');
		// terms = terms.filter(t => t.name.trim().length > 0);
		const sanitisedTermNames = terms.map(t => regexSanitise(t.name));
		const argumentBlockRegex = new RegExp(`(?:(${sanitisedTermNames.join('|')}))`, 'g');
		const elementStrings = removeBlanks(formula.split(argumentBlockRegex));

		let variableIdx = 0;
		const elements: TemplateElement[] = [];

		for (const el of elementStrings) {
			if (terms.some(t => t.name === el)) {
				const type = typeTree.getType(Template.variableName(variableIdx++));
				elements.push(type);
			}
			else 
				elements.push(new Surrounding(el));
		}

		return new Template(elements);
	}

	public static fromLGG(typeTree: TypeTree, literals: string[]): Template | undefined {
		if (literals.length === 0)
			return undefined;

		if (literals.length === 1)
			return new Template([ new Surrounding(literals[0]) ]);

		const wordsFromEachLiteral = literals.map(literal => sanitiseLiteral(literal).split(/\s+/g));
		const predicateWords = Template.predicateWordsFromLiterals(wordsFromEachLiteral);
		
		// assumes that literals all conform to same template
		// takes first literal, compares against predicate words to construct a template
		const termNames = Template.termNamesFromLiteral(literals[0], predicateWords);
		const terms = termNames.map(t => new Atom(t, typeTree.getType(t)));
		const template = Template.fromFormula(typeTree, literals[0], terms);

		// now check that all literals match the template
		if (literals.some(literal => !template.matchesLiteral(literal)))
			return undefined;
		
		return template;
	}


	public toString(): string {
		const elementStrings: string[] = this.elements.map(el => {
			switch (el.elementKind) {
				case ElementKind.Surrounding:
					return el.name;
				case ElementKind.Type:
					return `*${el.name}*`;
			}
		});
		return elementStrings.join(' ');
	}

	public toSnippet(): string {
		let snippet = '';
		let placeholderCount = 0;
		for (const el of this.elements) {
			if (el.elementKind === ElementKind.Type) {
				placeholderCount++;
				snippet += '${' + placeholderCount + ':' + el.name + '}';
			} 
			else
				snippet += el.name;
			
			snippet += ' ';
		}
		return snippet;
	}

	
	public withVariable(term: Term, variableName: string | undefined = undefined): Template {
		if (variableName === undefined)
			variableName = `a ${term}`;
		
		const variableRegex = new RegExp(`(${regexSanitise(term.name)})`); // keeps the `variable` delimeter
		const newElements: TemplateElement[] = [];

		for (const el of this.elements) {
			if (el.elementKind === ElementKind.Surrounding && variableRegex.test(term.name)) {
				const elementStrings = el.name.split(variableRegex);
				for (let elString of elementStrings) {
					elString = elString.trim();
					if (elString.length > 0) {
						if (elString === term.name)
							newElements.push(term.type);
						else 
							newElements.push(new Surrounding(elString));
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
		const otherLiterals = deepCopy(literals.slice(1, undefined));
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


	public parseFormula(formula: string): Formula {
		formula = sanitiseLiteral(formula);
		const elements: FormulaElement[] = [];
		let typeOfLeftoversIdx = this.elements[0].elementKind === ElementKind.Type
			? 0
			: -1;
		
		for (let i = 0; i < this.elements.length; i++) {
			const join = this.elements[i];
			if (join.elementKind === ElementKind.Surrounding) {
				let phraseIdx = formula.indexOf(join.name);
				let phrase = join.name;
				if (phraseIdx === -1) {
					const startOfPhraseIdx = [...Array(formula.length).keys()]
					.find(i => join.name.startsWith(formula.slice(i, )));
					if (startOfPhraseIdx !== undefined) {
						phraseIdx = startOfPhraseIdx;
						phrase = formula.slice(phraseIdx, );
					}
				}

				if (phraseIdx === -1)
					break;
				
				typeOfLeftoversIdx = i + 1;

				if (i > 0 && phraseIdx > 0) {
					const type = this.elements[i - 1];
					if (type.elementKind === ElementKind.Type) {
						const termName = sanitiseLiteral(formula.slice(0, phraseIdx));
						elements.push(new Atom(termName, type));
					}
				}

				elements.push(new Surrounding(phrase));
				formula = sanitiseLiteral(formula.slice(phraseIdx + phrase.length + 1, ));
			}
		}

		if (formula.length > 0 && typeOfLeftoversIdx !== -1 && typeOfLeftoversIdx < this.elements.length) {
			const type = this.elements[typeOfLeftoversIdx];
			if (type.elementKind === ElementKind.Type)
				elements.push(new Atom(sanitiseLiteral(formula), type));
		}
		return new Formula(dummyType, elements);
	}


	public parseTerms(formula: string): Term[] {
		return this.parseFormula(formula)
		.elements
		.filter(el => el.elementKind === ElementKind.Term)
		.map(term => term as Term);
	}

	public parseSurroundings(formula: string): Surrounding[] {
		return this.parseFormula(formula)
		.elements
		.filter(el => el.elementKind === ElementKind.Surrounding) 
		.map(s => s as Surrounding);
	}


	// TODO: use clause to see if the types of literal's terms match with this template
	public matchesLiteral(literal: string): boolean {
		const joins = this.surroundings;
		const otherJoins = this.parseSurroundings(literal);

		if (joins.length !== otherJoins.length)
			return false;
		
		for (let i = 0; i < joins.length; i++) {
			if (joins[i].name !== otherJoins[i].name)
				return false;
		}

		return true;
	}


	// score = length of literal words that are shared
	// *a person* wants to see *a thing* at *a location*
	// fred bloggs [wan] --> score = 3
	// fred bloggs [wants to see] the eiffel tower [at] --> score = 12
	// wants to [wants to see] --> score = 10
	public matchScore(literal: string): number {
		return this.parseSurroundings(literal)
		.map(surrounding => surrounding.name)
		.join(' ')
		.length;
	}

	// *an A* 		really likes 	*a B* 	with value 	*a C*
	// fred bloggs	really likes 	apples	with val
	// output = fred bloggs really likes apples with value *a C*
	public substituteTerms(typeTree: TypeTree, formula: string): Template {
		const terms = this.parseTerms(formula);
		const elements: TemplateElement[] = [];
		for (const el of this.elements) {
			if (el.elementKind === ElementKind.Surrounding) 
				elements.push(el);

			else {
				if (terms.length > 0) {
					elements.push(new Surrounding(terms[0].name));
					terms.shift(); // remove first term
				} else 
					elements.push(el);
			}
		}

		return new Template(elements);
	}

	// finds the template that 
	// 	- matches the literal
	// 	- then, has the most amount of variables
	//  - then, has the longest name
	public static findBestMatch(templates: Template[], literal: string): Template | undefined {
		const candidates = templates.filter(t => t.matchesLiteral(literal));

		if (candidates.length === 0)
			return undefined;

		const maxVariableCount = Math.max(...candidates.map(t => t.types.length));
		const candidatesWithMaxVars = candidates.filter(t => t.types.length === maxVariableCount);
		return maximal(candidatesWithMaxVars, t => t.surroundings.join(' ').length);
	}
}