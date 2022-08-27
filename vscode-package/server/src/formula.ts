import { Type, ElementKind, Surrounding } from './element';

export type Term = Data | Variable | AtomicFormula | TemplatelessFormula;
export type FormulaElement = Surrounding | Term;

export enum TermKind {
	Data,
	Variable,
	AtomicFormula,
	TemplatelessFormula
}


export class Data {
	public readonly elementKind = ElementKind.Term;
	public readonly termKind = TermKind.Data;
	public readonly type: Type;
	public readonly name: string;

	constructor(name: string, type: Type) {
		this.name = name;
		this.type = type;
	}
}

export class Variable {
	public readonly elementKind = ElementKind.Term;
	public readonly termKind = TermKind.Variable;
	public readonly type: Type;
	public readonly name: string;

	public static readonly variablePattern = /(?<=an?|the)\s+\w[\w|\s]*/;

	public get varName(): string {
		const match = this.name.match(Variable.variablePattern);
		if (match === null)
			return this.name;
		
		return match[0].trim();
	}

	constructor(name: string, type: Type) {
		this.name = name;
		this.type = type;
	}

	public sameVariable(other: Variable) {
		return this.varName === other.varName;
	}
}

export class TemplatelessFormula {
	public readonly name: string;
	public readonly elementKind = ElementKind.Term;
	public readonly termKind = TermKind.TemplatelessFormula;
	public readonly type: Type;

	constructor(name: string, type: Type) {
		this.name = name;
		this.type = type;
	}
}


export class AtomicFormula {
	public readonly elementKind = ElementKind.Term;
	public readonly termKind = TermKind.AtomicFormula;
	public readonly type: Type;
	public readonly elements: FormulaElement[];
	public readonly name: string;

	// public get name(): string {
	// 	return this.elements.map(el => el.name).join(' ');
	// }

	public get terms(): Term[] {
		return this.elements
		.filter(el => el.elementKind === ElementKind.Term)
		.map(term => term as Term);
	}

	public get surroundings(): Surrounding[] {
		return this.elements
		.filter(el => el.elementKind === ElementKind.Surrounding)
		.map(s => s as Surrounding);
	}

	public get subFormulas(): AtomicFormula[] {
		return this.terms
		.filter(term => term.termKind === TermKind.AtomicFormula)
		.map(term => term as AtomicFormula);
	}

	constructor(name: string, type: Type, elements: FormulaElement[]) {
		this.name = name;
		this.type = type;
		this.elements = elements;
	}
}