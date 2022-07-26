import { Template } from './template';
import { Type } from './element';


export class TypeTree {
	private readonly root: Type;
	private static readonly rootTypeName = 'thing';


	constructor(root: Type = new Type(TypeTree.rootTypeName)) {
		this.root = root;
	}


	// creates if does not exist
	public getType(name: string): Type { 
		const type = TypeTree.find(this.root, t => t.name === name);
		if (type !== undefined)
			return type;
		
		const newType = new Type(name);
		this.root.makeSubtype(newType);
		return newType;
	}

	public addType(name: string) {
		this.getType(name);
	}
	

	public toString(): string {
		return this.buildStringRepresentation('');
	}

	public addTypesFromTemplate(template: Template) {
		const types = template.types();
		for (const type of types) {
			if (TypeTree.find(this.root, t => t.name === type.name) === undefined)
				this.root.makeSubtype(type);
		}
	}


	public areCompatibleTypes(type: Type, otherType: Type): boolean {
		return TypeTree.isSubtype(type, otherType) || TypeTree.isSubtype(otherType, type);
	}


	public static fromHierarchy(hierarchy: string[]): TypeTree {
		const tree = new TypeTree();
		TypeTree.populateFromHierarchy(tree.root, hierarchy);
		return tree;
	}


	private static populateFromHierarchy(root: Type, subtypeLines: string[]) {
		subtypeLines = subtypeLines.filter(line => line.trim().length > 0);
		if (subtypeLines.length === 0)
			return;

		const childIndent = indentationOf(subtypeLines[0]);

		for (let i = 0; i < subtypeLines.length; i++) {
			if (indentationOf(subtypeLines[i]) === childIndent) {
				const child = new Type(subtypeLines[i].trim());
				const subchildLines = subtypeSection(subtypeLines.slice(i, undefined));
				TypeTree.populateFromHierarchy(child, subchildLines);
				root.makeSubtype(child);
			}
		}
	}


	private static isSubtype(superType: Type, subtype: Type): boolean {
		return TypeTree.find(superType, t => t.name === subtype.name) !== undefined;
	}


	private buildStringRepresentation(repr: string, start = this.root, depth = 0): string {
		const indent = '    ';
		repr += indent.repeat(depth) + start.name + '\n';
		for (const sub of start.subtypes)
			repr = this.buildStringRepresentation(repr, sub, depth + 1);
		
		return repr;
	}


	private static find(start: Type, predicate: (type: Type) => boolean): Type | undefined {
		if (predicate(start))
			return start;
		
		for (const subtype of start.subtypes) {
			if (TypeTree.find(subtype, predicate) !== undefined)
				return subtype;
		}

		return undefined;
	}
}


// returns all lines that are subtype to lines[0]
// cannot mix tabs and spaces!
function subtypeSection(lines: string[]): string[] {
	const startIndent = indentationOf(lines[0]);
		
	for (let endIdx = 1; endIdx < lines.length; endIdx++) {
		if (indentationOf(lines[endIdx]).length < startIndent.length)
			return lines.slice(1, endIdx);
	}

	return lines.slice(1, undefined);
}


function indentationOf(line: string): string {
	const indentRegex = /^([\t| ]*)(?=\w)/gm;
	const indent = indentRegex.exec(line);
	if (indent === null)
		return '';
	
	return indent[0];
}