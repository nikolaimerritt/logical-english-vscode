import { CodeAction, CodeActionParams, DiagnosticSeverity, CodeActionKind, Position, Range } from 'vscode-languageserver';
import { TextDocument } from 'vscode-languageserver-textdocument';
import { Template } from './template';
import { atomicFormulaHasNoTemplateMessage } from './diagnostics';
import { ignoreComments } from './utils';
import { 
	formulasInDocument, 
	sectionWithHeader, 
	templatesInDocument, 
	clausesInDocument, 
	ContentRange, 
	termsInClause,
	typeTreeInDocument 
} from './parsing';

import { TemplatelessFormula, Term } from './formula';
import { isTemplateless, Schema } from './schema';

// adapted from https://github.com/YuanboXue-Amber/endevor-scl-support/blob/master/server/src/CodeActionProvider.ts

export function quickfixes(document: string, params: CodeActionParams): CodeAction[] {	
	document = ignoreComments(document);
	const schema = Schema.fromDocument(document);
	return literalWithNoTemplateFixes(params, schema, document);
}

function literalWithNoTemplateFixes(params: CodeActionParams, schema: Schema, document: string): CodeAction[] {
	const formulasWithNoTemplate: ContentRange<TemplatelessFormula>[] = formulasInDocument(schema, document)
	.filter(({content: formula}) => isTemplateless(formula))
	.map(c => c.mapContent(f => f as TemplatelessFormula));
	
	const templatesRange = sectionWithHeader(document, 'templates')?.range;
	if (templatesRange === undefined)
		return [];
	
	const endOfTemplates: Range = {
		start: templatesRange.end,
		end: templatesRange.end
	};


	let generatedTemplate = Template.fromLGG(formulasWithNoTemplate.map(f => f.content.name));
	if (generatedTemplate === undefined)
		return [];

	
	// trying to add every variable in the clauses containing the literals, to the template
	for (const formula of formulasWithNoTemplate) {
		const clause = clauseContainingLiteral(document, formula.mapContent(f => f.name));
		if (clause !== undefined) {
			for (const { content: term } of termsInClause(schema, clause)) 
				generatedTemplate = generatedTemplate.withVariable(term);
		}
	}

	// does not generate the trivial template '*an X*'
	// or a template with no varaibles
	if (generatedTemplate.surroundings.length === 0 || generatedTemplate.types.length === 0)
		return [];
	
	const actions: CodeAction[] = [];
	params.context.diagnostics.forEach(diag => {
		if (diag.severity === DiagnosticSeverity.Warning && diag.message.includes(atomicFormulaHasNoTemplateMessage)) {
			actions.push({
				title: 'Generate a template',
				kind: CodeActionKind.QuickFix,
				diagnostics: [diag],
				edit: {
					changes: {
						[params.textDocument.uri]: [{
							range: endOfTemplates,
							newText: `${generatedTemplate!.toString()}.\n` 
							// why is TypeScript saying that generatedTemplate could be undefined??
						}]
					}
				}
			});
		}
	});

	return actions;
}


function clauseContainingLiteral(document: string, literal: ContentRange<string>): ContentRange<string> | undefined {
	return clausesInDocument(document)
	.find(clause => 
			clause.range.start.line <= literal.range.start.line 
			&& clause.range.end.line >= literal.range.end.line
	);
}


// function termsInClause(templates: Template[], clause: ContentRange<string>): Term[] {
// 	let terms: Term[] = [];
// 	const formulas = formulasInClause(clause);

// 	for (const { content: formula } of formulas) {
// 		// const template = templates.find(t => t.matchesLiteral(literal));
// 		const template = Template.findBestMatch(templates, formula);
// 		if (template !== undefined) 
// 			terms = terms.concat(parseFormulaFromTemplate(template, formula).terms);
// 	}

// 	return terms;
// }