import { Template } from './template';
import { Type } from './element';

export const dummyType = new Type('dummy', []);

export class TypeTree {
	public readonly topType: Type;
	public readonly predicateTopType: Type;

	private static readonly topTypeName = 'a thing';
	private static readonly predicateTopTypeName = 'a predicate';

	constructor(root: Type = new Type(TypeTree.topTypeName)) {
		this.topType = root;
		this.predicateTopType = new Type(TypeTree.predicateTopTypeName);
		this.topType.makeSubtype(this.predicateTopType);
	}


	// creates if does not exist
	public getType(name: string): Type { 
		const type = find(this.topType, t => t.name === name);
		if (type !== undefined)
			return type;
		
		const newType = new Type(name);
		this.topType.makeSubtype(newType);
		return newType;
	}

	public addType(name: string) {
		this.getType(name);
	}
	

	public toString(): string {
		return this.buildStringRepresentation();
	}

	public addTypesFromTemplate(template: Template) {
		for (const type of template.types) {
			if (find(this.topType, t => t.name === type.name) === undefined)
				this.topType.makeSubtype(type);
		}
	}


	public static areCompatibleTypes(type: Type, otherType: Type): boolean {
		return isSubtype(type, otherType) || isSubtype(otherType, type);
	}


	public static fromHierarchy(hierarchy: string[]): TypeTree {
		const tree = new TypeTree();
		hierarchy = hierarchy.filter(line => line.trim().length > 0);
		const indentedRegex = /^\s+\w/m;
		
		for (let i = 0; i < hierarchy.length; i++) {
			if (!indentedRegex.test(hierarchy[i])) {
				const parent = new Type(hierarchy[i].trim());
				if (i + 1 < hierarchy.length && indentedRegex.test(hierarchy[i + 1])) {
					const subtypeLines = subtypeSection(hierarchy.slice(i, undefined));
					this.populateFromHierarchy(parent, subtypeLines);
				}
				
				tree.topType.makeSubtype(parent);
			}
		}

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

	private buildStringRepresentation(start = this.topType): string {
		const indent = '#';
		let repr = start.name + '\n';
		for (const sub of start.subtypes)
			repr += indent + this.buildStringRepresentation(sub);
		
		return repr;
	}
}


function isSubtype(superType: Type, subtype: Type): boolean {
	return find(superType, t => t.name === subtype.name) !== undefined;
}


function find(start: Type, predicate: (type: Type) => boolean): Type | undefined {
	if (predicate(start))
		return start;
	
	for (const subtype of start.subtypes) {
		if (find(subtype, predicate) !== undefined)
			return subtype;
	}

	return undefined;
}


// returns all lines that are subtype to lines[0]
// cannot mix tabs and spaces!
function subtypeSection(lines: string[]): string[] {
	const startIndent = indentationOf(lines[0]);
		
	for (let endIdx = 1; endIdx < lines.length; endIdx++) {
		if (indentationOf(lines[endIdx]).length <= startIndent.length)
			return lines.slice(1, endIdx);
	}

	return lines.slice(1, undefined);
}


function indentationOf(line: string): string {
	const indentRegex = /^([\t| ]*)(?=\w)/m;
	const indent = line.match(indentRegex);
	if (indent === null)
		return '';
	
	return indent[0];
}