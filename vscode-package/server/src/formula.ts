import { Type, ElementKind, Surrounding } from './element';

export type Term = Formula | Atom;
export type FormulaElement = Surrounding | Term;

export enum TermKind {
	Atom,
	Formula
}


export class Atom {
	public readonly elementKind = ElementKind.Term;
	public readonly termKind = TermKind.Atom;
	public readonly type: Type;
	public readonly name: string;

	constructor(name: string, type: Type) {
		this.name = name;
		this.type = type;
	}
}


export class Formula {
	public readonly elementKind = ElementKind.Term;
	public readonly termKind = TermKind.Formula;
	public readonly type: Type;
	public readonly elements: FormulaElement[];

	public get name(): string {
		return this.elements.map(el => el.name).join(' ');
	}

	constructor(type: Type, elements: FormulaElement[]) {
		this.type = type;
		this.elements = elements;
	}
}