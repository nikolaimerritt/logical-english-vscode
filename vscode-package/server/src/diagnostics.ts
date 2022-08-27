import {
	Diagnostic,
	DiagnosticSeverity
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';
import { 
	templatesInDocument, 
	formulasInDocument, 
	clausesInDocument, 
	termsInClause,
	typeTreeInDocument, 
	typeCheckingEnabled
} from './parsing';
import { ignoreComments, isSamePosition, isSameRange } from './utils';
import { Template } from './template';
import { Type } from './element';
import { TypeTree } from './type-tree';
import { isTemplateless, Schema } from './schema';
import { Term, TermKind } from './formula';

export interface ExampleSettings {
	maxNumberOfProblems: number;
}

export const globalSettings: ExampleSettings = {
	maxNumberOfProblems: 1000
};

export const atomicFormulaHasNoTemplateMessage = "Atomic formula has no template.";
export const clauseHasMisalignedConnectivesMessage = 'Clause has misaligned connectives.';

export function diagnostics(document: string): Diagnostic[] {	
	// debugOnStart();

	const schema = Schema.fromDocument(document);
	const typeChecking = typeCheckingEnabled(document);
	document = ignoreComments(document);

	const diags = [];
	diags.push(... templatelessAtomicFormulaDiags(schema, document));
	diags.push(...misalignedConnectivesDiags(document));

	if (typeChecking) 
		diags.push(...typeMismatchDiags(schema, document));

	return diags;
}


export function debugOnStart() {
	// const template = Template.fromString(new TypeTree(), 
	// 	'the amount of gain excluded for *a person* from *a sale or exchange* under subsection (a) shall not exceed *an amount*'
	// );
	// const incompleteLiteral = 'gross i';
	// console.log(`Elements from ${incompleteLiteral}:`);
	// console.log(template.parseElements(incompleteLiteral));
}


// refactor to export function text -> literals with no template
function templatelessAtomicFormulaDiags(schema: Schema, text: string): Diagnostic[] {
	const diagnostics: Diagnostic[] = [];	
	for (const { content: formula, range } of formulasInDocument(schema, text))
		if (isTemplateless(formula) && diagnostics.every(d => !isSameRange(d.range, range)))
			diagnostics.push({
				severity: DiagnosticSeverity.Warning,
				range,
				message: atomicFormulaHasNoTemplateMessage
			});

	return diagnostics;
}


function misalignedConnectivesDiags(text: string): Diagnostic[] {
	const diagnostics: Diagnostic[] = [];

	for (const { content: clause, range } of clausesInDocument(text)) {
		if (clauseHasMisalignedConnectives(clause)) {
			diagnostics.push({
				severity: DiagnosticSeverity.Warning,
				range,
				message: clauseHasMisalignedConnectivesMessage
			});
		}
	}

	return diagnostics;
}

function typeMismatchDiags(schema: Schema, text: string): Diagnostic[] {
	const diagnostics: Diagnostic[] = [];

	for (const clause of clausesInDocument(text)) {
		const terms = termsInClause(schema, clause);
		for (let i = 0; i < terms.length; i++) {
			for (let j = i + 1; j < terms.length; j++) {
				if (typeMismatchError(terms[i].content, terms[j].content)) {				
					const message = `Type mismatch: '${terms[i].content.type.name}' versus '${terms[j].content.type.name}'`;
					for (const range of [terms[i].range, terms[j].range]) {
						if (!diagnostics.some(diag => diag.range === range)) {
							diagnostics.push({
								severity: DiagnosticSeverity.Warning,
								range,
								message
							});
						}
					}
				}
			}
		}
	}

	return diagnostics;
}


function typeMismatchError(term: Term, otherTerm: Term) {
	return !TypeTree.areCompatibleTypes(term.type, otherTerm.type)
		&&  nameClash(term, otherTerm);
}

function nameClash(term: Term, otherTerm: Term) {
	if (term.termKind === TermKind.Variable && otherTerm.termKind === TermKind.Variable)
		return term.varName === otherTerm.varName;
	
	return term.name === otherTerm.name;
}


function clauseHasMisalignedConnectives(clause: string): boolean {
	const connectives = [
		'and',
		'or'
	];

	const lines = clause.split(/\n+/g);
	const startsWith = (idx: number, conn: string) => 
		lines[idx].trimStart().startsWith(conn);

	for (let i = 0; i < lines.length; i++) {
		const connective = connectives.find(conn => startsWith(i, conn));
		if (connective !== undefined) {
			const indentation = lines[i].split(connective)[0];
			for (let j = i + 1; j < lines.length; j++) {
				const otherConnective = connectives.find(conn => conn !== connective && startsWith(j, conn));
				if (otherConnective !== undefined) {
					const otherIndentation = lines[j].split(otherConnective)[0];
					if (indentation === otherIndentation)
						return true;
				}
			}
		}
	}

	return false;
}