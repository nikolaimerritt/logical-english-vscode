import { deepCopy, removeBlanks, removeFirst, regexSanitise, maximal, sortBy, sanitiseLiteral } from './utils';
import { dummyType, TypeTree } from './type-tree';
import { Type, TemplateElement, Surrounding, ElementKind } from './element';
import { Data, AtomicFormula, FormulaElement, Term, TermKind, Variable } from './formula';



export class Template {
	public readonly elements: TemplateElement[];
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

	// public get allElements(): TemplateElement[] {
	// 	return this.elements.map(x => x); // shallow copy
	// }


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


	public static fromLGG(formulas: string[]): Template | undefined {
		if (formulas.length === 0)
			return undefined;

		if (formulas.length === 1)
			return new Template([ new Surrounding(formulas[0]) ]);

		const wordsFromEachFormula = formulas.map(literal => sanitiseLiteral(literal).split(/\s+/g));
		
		const formula = wordsFromEachFormula[0];
		const otherFormulas = deepCopy(wordsFromEachFormula.slice(1, undefined));
		const elements: TemplateElement[] = [];

		let passedTerm = false;
		let currSurrounding = '';
		let typeNumber = 0;
		for (const word of formula) {
			if (otherFormulas.every(f => f.includes(word))) {
				if (passedTerm) {
					elements.push(new Type(Template.variableName(typeNumber++)));
					passedTerm = false;
				}
				if (currSurrounding.length > 0)
					currSurrounding += ' ';
				currSurrounding += word;

				for (const f of otherFormulas) 
					removeFirst(f, word);
			} 
			else {
				if (currSurrounding.length > 0) {
					elements.push(new Surrounding(currSurrounding));
					currSurrounding = '';
				}
				passedTerm = true;
			}
		}

		if (currSurrounding.length > 0)
			elements.push(new Surrounding(currSurrounding));

		if (passedTerm && elements.length > 0) 
			elements.push(new Type(Template.variableName(typeNumber++)));

		
		if (elements.length === 0 
				|| elements.length === 1 && elements[0].elementKind === ElementKind.Type
		) 
			return undefined;


		// now check that all literals match the template
		const template = new Template(elements);
		if (formulas.some(f => !template.matchesFormula(f)))
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
		for (let i = 0; i < this.elements.length; i++) {
			if (this.elements[i].elementKind === ElementKind.Type) {
				placeholderCount++;
				snippet += '${' + placeholderCount + ':' + this.elements[i].name + '}';
			} 
			else
				snippet += this.elements[i].name;
			
			if (i + 1 < this.elements.length)
				snippet += ' ';	
		}
		return snippet;
	}

	
	public withVariable(term: Term): Template {
		const variableRegex = new RegExp(`(${regexSanitise(term.name)})`); // keeps the `variable` delimeter
		const newElements: TemplateElement[] = [];

		for (const el of this.elements) {
			if (el.elementKind === ElementKind.Surrounding && variableRegex.test(term.name)) {
				const elementStrings = el.name.split(variableRegex);
				for (let i = 0; i < elementStrings.length; i++) {
					const elString = elementStrings[i].trim();
					if (elString.length > 0) {
						if (elString === term.name && 
							(newElements.length === 0 
								|| (newElements.length > 0 
									&& newElements.at(-1)?.elementKind === ElementKind.Surrounding))
						)
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


	// TODO: use clause to see if the types of literal's terms match with this template
	public matchesFormula(formula: string): boolean {
		const surroundings = this.surroundings;
		const localTypeTree = new TypeTree();
		const parsedFormula = this.parseFormula(localTypeTree, formula);
		const otherSurroundings = parsedFormula.surroundings;

		if (surroundings.length !== otherSurroundings.length)
			return false;
		
		for (let i = 0; i < surroundings.length; i++) {
			if (surroundings[i].name !== otherSurroundings[i].name)
				return false;
		}

		if (parsedFormula.terms.length !== this.types.length)
			return false;

		return true;
	}


	// score = length of literal words that are shared
	// *a person* wants to see *a thing* at *a location*
	// fred bloggs [wan] --> score = 3
	// fred bloggs [wants to see] the eiffel tower [at] --> score = 12
	// wants to [wants to see] --> score = 10
	public matchScore(formula: string): number {
		const localTypeTree = new TypeTree();
		return this.parseFormula(localTypeTree, formula)
		.surroundings
		.map(surrounding => surrounding.name)
		.join(' ')
		.length;
	}

	// *an A* 		really likes 	*a B* 	with value 	*a C*
	// fred bloggs	really likes 	apples	with val
	// output = fred bloggs really likes apples with value *a C*
	public substituteTerms(formula: string): Template {
		const localTypeTree = new TypeTree();
		const terms = this.parseFormula(localTypeTree, formula).terms;

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


	public parseFormula(typeTree: TypeTree, formula: string): AtomicFormula {
		const elements = this.parseElements(formula);
		return new AtomicFormula(formula, typeTree.getPredicateTopType(), elements);
	}

	private parseElements(formula: string): FormulaElement[] {
		formula = sanitiseLiteral(formula);
		const elements: FormulaElement[] = [];
		let lastTypeIdx = this.elements[0].elementKind === ElementKind.Type
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
				
				lastTypeIdx = i + 1;

				if (i > 0 && phraseIdx > 0) {
					const type = this.elements[i - 1];
					if (type.elementKind === ElementKind.Type) {
						const termName = sanitiseLiteral(formula.slice(0, phraseIdx));
						
						if (Variable.variablePattern.test(termName)) 
							elements.push(new Variable(termName, type));
						else
							elements.push(new Data(termName, type));
					}
				}

				elements.push(new Surrounding(phrase));
				formula = sanitiseLiteral(formula.slice(phraseIdx + phrase.length + 1, ));
			}
		}

		if (formula.length > 0 && lastTypeIdx >= 0 && lastTypeIdx < this.elements.length) {
			const type = this.elements[lastTypeIdx];
			if (type.elementKind === ElementKind.Type) {
				const termName = sanitiseLiteral(formula);
						
				if (Variable.variablePattern.test(termName)) 
					elements.push(new Variable(termName, type));
				else
					elements.push(new Data(termName, type));
			}
		}
		return elements;
	}
}