
export enum ElementKind {
	Surrounding,
	Type,
	Term
}

export type TemplateElement = Surrounding | Type;


export class Surrounding {
	public readonly elementKind = ElementKind.Surrounding;
	public readonly name: string;

	constructor(name: string) {
		this.name = name;
	}
}


export class Type {
	public readonly elementKind = ElementKind.Type;
	public readonly name: string;
	public readonly subtypes: Type[] = [];

	constructor(name: string, subtypes: Type[] = []) {
		this.name = name;
		this.subtypes = subtypes;
	}


	public makeSubtype(type: Type) {
		if (type.name !== this.name)
			this.subtypes.push(type);
		else throw new Error(`Type ${this.name} cannot set itself as a sub-type.`);
	}
}