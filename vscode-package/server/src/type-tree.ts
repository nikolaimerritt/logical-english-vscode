import { Template } from './template';
import { Type } from './element';


export class TypeTree {
	private readonly root: Type;
	private static readonly rootTypeName = 'a thing';


	constructor(root: Type = new Type(TypeTree.rootTypeName)) {
		this.root = root;
	}


	// creates if does not exist
	public getType(name: string): Type { 
		const type = find(this.root, t => t.name === name);
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
		for (const type of template.types) {
			if (find(this.root, t => t.name === type.name) === undefined)
				this.root.makeSubtype(type);
		}
	}


	public static areCompatibleTypes(type: Type, otherType: Type): boolean {
		return isSubtype(type, otherType) || isSubtype(otherType, type);
	}


	public static fromHierarchy(hierarchy: string[]): TypeTree {
		const tree = new TypeTree();
		hierarchy = hierarchy.filter(line => line.trim().length > 0);
		
		for (let i = 0; i < hierarchy.length; i++) {
			if (hierarchy[i][0] !== ' ') {
				const parent = new Type(hierarchy[i].trim());
				if (i + 1 < hierarchy.length && hierarchy[i + 1][0] === ' ') {
					const subtypeLines = subtypeSection(hierarchy.slice(i, undefined));
					this.populateFromHierarchy(parent, subtypeLines);
				}
				
				tree.root.makeSubtype(parent);
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

	private buildStringRepresentation(repr: string, start = this.root, depth = 0): string {
		const indent = '    ';
		repr += indent.repeat(depth) + start.name + '\n';
		for (const sub of start.subtypes)
			repr = this.buildStringRepresentation(repr, sub, depth + 1);
		
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