import { Template } from './template';
import { Type } from './element';
import { countOccurances, sortBy } from './utils';

export const dummyType = new Type('dummy', []);

interface IndentedTypeName {
	name: string,
	indent: number
}

export class TypeTree {
	public readonly topType: Type;
	// public readonly predicateTopType: Type;

	private static readonly topTypeName = 'a thing';
	private static readonly predicateTopTypeName = 'a predicate';

	constructor(root = new Type(TypeTree.topTypeName)) {
		this.topType = root;
		// this.predicateTopType = new Type(TypeTree.predicateTopTypeName);
		// this.topType.makeSubtype(this.predicateTopType);
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

	public getPredicateTopType(): Type {
		return this.getType(TypeTree.predicateTopTypeName);
	}

	public equals(other: TypeTree) {
		return TypeTree.treesEqual(this.topType, other.topType);
	}
	

	// public toString(): string {
	// 	return this.buildStringRepresentation();
	// }

	public addTypesFromTemplate(template: Template) {
		for (const type of template.types) {
			if (find(this.topType, t => t.name === type.name) === undefined)
				this.topType.makeSubtype(type);
		}
	}


	public static areCompatibleTypes(type: Type, otherType: Type): boolean {
		return type.name === otherType.name 
			|| isSubtype(type, otherType) 
			|| isSubtype(otherType, type);
	}


	public static fromHierarchy(hierarchy: string[]): TypeTree {
		const tree = new TypeTree();
		hierarchy = hierarchy.filter(line => line.trim().length > 0);
		const indentedRegex = /^\s+\w/m;
		
		for (let i = 0; i < hierarchy.length; i++) {
			if (!indentedRegex.test(hierarchy[i])) {

				const parentName = hierarchy[i].trim();
				let parent = find(tree.topType, p => p.name === parentName);
				if (parent === undefined) {
					parent = new Type(parentName);
					tree.topType.makeSubtype(parent);
				}

				if (i + 1 < hierarchy.length && indentedRegex.test(hierarchy[i + 1])) {
					const subtypeLines = subtypeSection(hierarchy.slice(i, undefined));
					this.populateFromHierarchy(parent, subtypeLines);
				}
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
				const childName = subtypeLines[i].trim();
				
				let child = find(root, t => t.name === childName);
				if (child === undefined) {
					child = new Type(childName);
					root.makeSubtype(child);
				}
				
				const subchildLines = subtypeSection(subtypeLines.slice(i, undefined));
				TypeTree.populateFromHierarchy(child, subchildLines);
			}
		}
	}

	private static treesEqual(first: Type, second: Type) {
		if (first.name !== second.name)
			return false;
		
		if (first.subtypes.length !== second.subtypes.length)
			return false;
		
		for (const firstChild of first.subtypes) {
			const secondChild = second.subtypes
			.find(s => s.name === firstChild.name);

			if (secondChild === undefined)
				return false;
			
			if (!TypeTree.treesEqual(firstChild, secondChild))
				return false;
		}

		return true;
	}

	// private buildStringRepresentation(start = this.topType): string {
	// 	const indent = '#';
	// 	let repr = start.name + '\n';
	// 	for (const sub of start.subtypes)
	// 		repr += indent + this.buildStringRepresentation(sub);
		
	// 	return repr;
	// }

	// private static linesToIndentedName(lines: string[]): IndentedTypeName[] {
	// 	const indentedNames: IndentedTypeName[] = [];
	// 	const typeLines = lines
	// 	.filter(/\w+/.test);

	// 	const sortedIndents = sortBy(
	// 		typeLines
	// 			.map(TypeTree.indentOf)
	// 			.filter(indent => indent.length > 0),
	// 		indent => indent.length
	// 	);


	// 	if (sortedIndents.length > 0) {
	// 		const leastIndent = sortedIndents[0];
	// 		return typeLines.map(line => ({
	// 			name: line.trim(),
	// 			indent: countOccurances(this.indentOf(line), leastIndent)
	// 		} as IndentedTypeName));
	// 	}
	// 	else {
	// 		return typeLines.map(line => ({

	// 		}));
	// 	}
		
		
	// }

	// private static indentOf(line: string): string {
	// 	const indentRegex = /^\s+(?=\w.*)/m;
	// 	const match = line.match(indentRegex);
	// 	if (match === null) 
	// 		return '';
	// 	return match[0];
	// }
}


function isSubtype(superType: Type, subtype: Type): boolean {
	return find(superType, t => t.name === subtype.name) !== undefined;
}


function find(start: Type, predicate: (type: Type) => boolean): Type | undefined {
	if (predicate(start))
		return start;
	
	for (const subtype of start.subtypes) {
		const found = find(subtype, predicate);
		if (found !== undefined)
			return found;
	}

	return undefined;
}

/*
a thing
	a predicate
	a person
		an employee
*/


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

