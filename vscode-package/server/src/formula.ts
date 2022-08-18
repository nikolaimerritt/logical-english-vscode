import { Type, ElementKind, Surrounding } from './element';

export type Term = Data | AtomicFormula | TemplatelessFormula;
export type FormulaElement = Surrounding | Term;

export enum TermKind {
	Data,
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

	public get name(): string {
		return this.elements.map(el => el.name).join(' ');
	}

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

	constructor(type: Type, elements: FormulaElement[]) {
		this.type = type;
		this.elements = elements;
	}
}