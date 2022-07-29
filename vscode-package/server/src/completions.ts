import { Position, Range, TextDocument } from 'vscode-languageserver-textdocument';
import { 
	CompletionItem, 	
	CompletionItemKind, /* InsertReplaceEdit,*/ 
	TextDocumentPositionParams, 
	InsertTextFormat, 
	InsertReplaceEdit, 
	TextEdit 
} 
from "vscode-languageserver";
import { areaWithClauses, templatesInDocument, typeTreeInDocument } from './parsing';
import { sortBy, literalAtPosition } from './utils';
import { Template } from './template';
import { createNoSubstitutionTemplateLiteral } from 'typescript';


export function provideCompletions(document: TextDocument, params: TextDocumentPositionParams): CompletionItem[] {	
	const text = document.getText();
	return literalCompletion(text, params);
}

// sort literal completion
function literalCompletion(text: string, params: TextDocumentPositionParams): CompletionItem[] {
	// const knowledgeBaseRange = sectionRange('knowledge base', text)?.range;
	const allClausesRange = areaWithClauses(text)?.range;
	if (allClausesRange === undefined 
			|| params.position.line < allClausesRange.start.line 
			|| params.position.line > allClausesRange.end.line) 
		return [];
	
	const typeTree = typeTreeInDocument(text);

	const line = text.split('\n')[params.position.line];
	const literal = literalAtPosition(line, params.position.character);
	if (literal === undefined)
		return [];

	const literalStart: Position = {
		line: params.position.line,
		character: line.indexOf(literal)
	};

	const literalEnd: Position = {
		line: params.position.line,
		character: line.indexOf(literal) + literal.length + 1
	};

	const literalToEndOfLine: Range = {
		start: literalStart,
		end: literalEnd
	};

	const maxCompletions = 3;
	const templates = templatesInDocument(text);
	
	// console.log(`literal: ${literal}`);
    // for (const t of templates) {
	// 	console.log(`${t.toString()} \thas score = ${t.matchScore(literal)}`);
	// }

	const bestTemplatesWithScores = sortBy(
		templates.map(t => [t, t.matchScore(literal)] as [Template, number]),
		([_, score]) => score
	)
	.slice(Math.max(templates.length - maxCompletions, 0));

	return bestTemplatesWithScores.map(([template, score]) => {
		const templateWithMissingTerms = template.substituteTerms(typeTree, literal);
		const textEdit = TextEdit.replace(literalToEndOfLine, templateWithMissingTerms.toSnippet());
		const completion: CompletionItem = {
			label: templateWithMissingTerms.toString(),
			kind: CompletionItemKind.Text,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit,
			sortText: String(score).padStart(4, '0')
		};
		return completion;
	});
}