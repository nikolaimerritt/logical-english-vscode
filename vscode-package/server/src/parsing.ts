import { Position, Range } from 'vscode-languageserver';
import { Template } from './template';
import { Formula, TemplatelessFormula, Term } from './formula';
import { TypeTree } from './type-tree';
import { defaultTemplateStrings } from './default-templates';
import { sanitiseLiteral } from './utils';
import { isTemplateless, Schema } from './schema';


export class ContentRange<T> {
	public readonly content: T;
	public readonly range: Range;

	constructor(content: T, range: Range) {
		this.content = content;
		this.range = range;
	}

	public mapContent<U>(func: (content: T) => U): ContentRange<U> {
		return new ContentRange<U>(func(this.content), this.range);
	}
}


function sectionRange(text: string, headerPredicate: (header: string) => boolean): ContentRange<string[]> | undefined {
	const lines = text.split('\n');
	
	let start: Position | undefined = undefined;
	let end: Position | undefined = undefined;

	for (let i = 0; i < lines.length; i++) {
		// if (lines[i].includes(':')) {
		// 	if (start !== undefined) {
		// 		end = { line: i - 1, character: 0 };
		// 		break;
		// 	}
		// 	else if (headerPredicate(lines[i]))
		// 		start = { line: i + 1, character: 0 };
		// }

		if (lines[i].includes(':')) { // line is a header
			if (headerPredicate(lines[i]) && start === undefined) {
				start = { line: i + 1, character: 0 };
			}
			else if (!headerPredicate(lines[i]) && start !== undefined) {
				end = { line: i - 1, character: 0 };
				break;
			}
		}
	}

	if (start === undefined)
		return undefined;
	
	if (end === undefined)
		end = { line: lines.length, character: 0 };

	return new ContentRange(
		lines.slice(start.line, end.line + 1),
		{ start, end }
	);
}

export function sectionWithHeader(text: string, headerText: string): ContentRange<string[]> | undefined {
	return sectionRange(text, header => header.includes(headerText));
}

export function areaWithClauses(text: string): ContentRange<string[]> | undefined {
	return sectionRange(text, header => 
		header.includes('knowledge base') 
		|| header.includes('scenario')
		|| header.includes('query')
	);
}


export function typeTreeInDocument(text: string): TypeTree {
	const typeHierarchy = sectionWithHeader(text, 'type hierarchy');
	const tree = typeHierarchy
		? TypeTree.fromHierarchy(typeHierarchy.content) 
		: new TypeTree();

	const templateLines = sectionWithHeader(text, 'templates');
	const typeNameRegex = /(?<=\*)an? [\w|\s]+(?=\*)/g;
	if (templateLines !== undefined) {
		for (const line of templateLines.content) {
			for (const [typeName] of line.matchAll(typeNameRegex)) 
				tree.addType(typeName);
		}
	}

	return tree;
}


export function templatesInDocument(text: string): Template[] {
	const templateRange = sectionWithHeader(text, 'templates');
	const typeTree = typeTreeInDocument(text); // TODO: refactor this as argument?
	if (templateRange === undefined)
		return [];
	
	const templates: Template[] = [];
	const templateStrings = templateRange.content
	.concat(defaultTemplateStrings);

	for (let templateString of templateStrings) {
		templateString = templateString.trim();
		if (templateString.length > 0) 
			templates.push(Template.fromString(typeTree, templateString));
	}

	return templates;
}


export function clausesInDocument(text: string): ContentRange<string>[] {
	// const clauseRange = sectionRange('knowledge base', text)?.range;
	const clauseRange = areaWithClauses(text)?.range;
	if (clauseRange === undefined)
		return [];
	
	const lines = text.split('\n');
	const clauses: ContentRange<string>[] = [];
	const clauseStartPattern = /^\s*\w[^:]+$/m;
	const clauseEndPattern = /^.*\.\s*$/m;

	let clauseStart = undefined;
	let clauseEnd = undefined;
	let isInsideClause = false;

	for (let l = clauseRange.start.line; l <= clauseRange.end.line && l < lines.length; l++) {
		if (clauseStartPattern.test(lines[l]) && !isInsideClause) {
			clauseStart = l;
			isInsideClause = true;
		}
			
		if (clauseStart !== undefined && (clauseEndPattern.test(lines[l]) || l === clauseRange.end.line - 1)) {
			clauseEnd = l;
			clauses.push(new ContentRange(
				lines.slice(clauseStart, clauseEnd + 1).join('\n'),
				{
					start: {
						line: clauseStart,
						character: 0
					},
					end: {
						line: clauseEnd,
						character: lines[clauseEnd].length
					}
				} 
			));
			isInsideClause = false;
		}
	}

	return clauses;
}


export function connectivesRegex(): RegExp {
	const inlineConnectives = [ // connectives that can be placed in-line
		'it is the case that',
		'it is not the case that'
	];
	const lineBorderConnectives = [
		'if',
		'and',
		'or'
	];

	let regexTerms = inlineConnectives
	.map(conn => `\\b${conn}\\b`); // connective can appear at any word boundary
	
	regexTerms = regexTerms
	.concat(
		lineBorderConnectives.map(conn => `^\\s*${conn}\\b|\\b${conn}\\s*$`) // connective can only appear at start or end of line
	);

	const regex = `(?:${regexTerms.join('|')})`;
	return new RegExp(regex, 'gm');
}


function formulasInClause(schema: Schema, clause: ContentRange<string>): ContentRange<Formula | TemplatelessFormula>[] {
	const lines = clause.content.split('\n');
	const formulasWithRanges: ContentRange<Formula | TemplatelessFormula>[] = [];

	for (let lineOffset = 0; lineOffset < lines.length; lineOffset++) {
		const lineNumber = clause.range.start.line + lineOffset;
		const formulasInLine = formulaStringsInLine(lines[lineOffset]);

		formulasInLine.forEach(formula => {
			const range: Range = {
				start: {
					line: lineNumber,
					character: lines[lineOffset].indexOf(formula)
				},
				end: {
					line: lineNumber,
					character: lines[lineOffset].indexOf(formula) + formula.length
				}
			};
			formulasWithRanges.push(new ContentRange(
				schema.parseFormula(formula),
				range
			));
		});
	}

	return formulasWithRanges;
}

export const subformulaPattern = /(?<= that )(\s*).*/g;

function formulaStringsInLine(line: string): string[] {
	const formulaStrings: string[] = line.split(connectivesRegex())
	.map(sanitiseLiteral)
	.filter(lit => lit.length > 0);

	for (const match of line.matchAll(subformulaPattern)) {
		formulaStrings.push(match[0]);
	}

	return formulaStrings;
}



export function formulasInDocument(schema: Schema, text: string): ContentRange<Formula | TemplatelessFormula>[] {
	const clauses = clausesInDocument(text);
	return clauses
	.flatMap(clause => formulasInClause(schema, clause));
}


export function termsInClause(schema: Schema, clause: ContentRange<string>): ContentRange<Term>[] {
	const termRanges: ContentRange<Term>[] = [];

	for (const { content: formula, range: formulaRange } of formulasInClause(schema, clause)) {
		// const template = templates.find(t => t.matchesLiteral(literal));
		if (!isTemplateless(formula)) {
			let termIdx = 0;

			for (const term of formula.terms) {
				termIdx = formula.name.indexOf(term.name, termIdx);
				termRanges.push(new ContentRange(
					term,
					{
						start: { 
							line: formulaRange.start.line, 
							character: formulaRange.start.character + termIdx 
						},
						end: { 
							line: formulaRange.start.line, 
							character: formulaRange.start.character + termIdx + term.name.length 
						}
					}
				));
				termIdx += term.name.length;
			}
		}
	}

	return termRanges;
}


export function typeCheckingEnabled(document: string): boolean {
	const typeCheckingRegex = /^.*(%type checking:? on)\s*$/gm;
	return typeCheckingRegex.test(document);
}