
export enum ElementKind {
	Join,
	Type,
	Term
}

export class Join {
	public readonly kind = ElementKind.Join;
	public readonly phrase: string;

	constructor(name: string) {
		this.phrase = name;
	}
}


export class Type {
	public readonly kind = ElementKind.Type;
	public readonly name: string;
	public readonly subtypes: Type[];

	constructor(_name: string, _subtypes: Type[] = []) {
		this.name = _name;
		this.subtypes = _subtypes;
	}

	public makeSubtype(type: Type) {
		if (type.name !== this.name)
			this.subtypes.push(type);
		else throw new Error(`Type ${this.name} cannot set itself as a sub-type.`);
	}
}


export class Term {
	public readonly kind = ElementKind.Term;
	public readonly name: string;
	public readonly type: Type;

	constructor(name: string, type: Type) {
		this.name = name;
		this.type = type;
	}
}


export type TemplateElement = Join | Type;
export type LiteralElement = Join | Term;