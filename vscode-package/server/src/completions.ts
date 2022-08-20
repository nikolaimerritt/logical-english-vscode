import { Position, Range, TextDocument } from 'vscode-languageserver-textdocument';
import { 
	CompletionItem, 	
	CompletionItemKind, /* InsertReplaceEdit,*/ 
	TextDocumentPositionParams, 
	InsertTextFormat, 
	TextEdit 
} 
from "vscode-languageserver";
import { areaWithClauses, sectionWithHeader, templatesInDocument, typeCheckingEnabled, typeTreeInDocument } from './parsing';
import { sortBy, literalAtPosition, ignoreComments, paddedString } from './utils';
import { Template } from './template';

export function completions(text: string, params: TextDocumentPositionParams): CompletionItem[] {	
	const completions: CompletionItem[] = [];
	const typeChecking = typeCheckingEnabled(text);
	text = ignoreComments(text);

	completions.push(...headerCompletions(text, params.position, typeChecking));
	completions.push(...literalCompletion(text, params.position));

	return completions.slice(0, 3);
	// return dummyCompletions();
}


function literalCompletion(text: string, position: Position): CompletionItem[] {
	// const knowledgeBaseRange = sectionRange('knowledge base', text)?.range;
	const allClausesRange = areaWithClauses(text)?.range;
	if (allClausesRange === undefined 
			|| position.line < allClausesRange.start.line 
			|| position.line > allClausesRange.end.line) 
		return [];
	
	const typeTree = typeTreeInDocument(text);

	const line = text.split('\n')[position.line];
	const literal = literalAtPosition(line, position.character);
	if (literal === undefined)
		return [];

	const literalStart: Position = {
		line: position.line,
		character: line.indexOf(literal)
	};

	const literalEnd: Position = {
		line: position.line,
		character: line.indexOf(literal) + literal.length + 1
	};

	const literalToEndOfLine: Range = {
		start: literalStart,
		end: literalEnd
	};

	const maxCompletions = 3;
	const scoreThreshold = 2;
	const templates = templatesInDocument(text);
	const bestTemplatesWithScores = sortBy(
		templates
			.map(t => [t, t.matchScore(literal)] as [Template, number])
		,
		([_, score]) => score
	)
	.slice(Math.max(templates.length - maxCompletions, 0));

	console.log('Scores:');
	console.log(bestTemplatesWithScores);


	return bestTemplatesWithScores
	.filter(([_, score]) => score > 0)
	.map(([template, score]) => {
		const templateWithMissingTerms = template.substituteTerms(literal);
		const textEdit = TextEdit.replace(literalToEndOfLine, templateWithMissingTerms.toSnippet());
		const completion: CompletionItem = {
			label: templateWithMissingTerms.toString(),
			kind: CompletionItemKind.Text,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit,
			sortText: paddedString(score)
		};
		return completion;
	});
}


function headerCompletions(document: string, position: Position,  typeChecking: boolean): CompletionItem[] {
	const completions: CompletionItem[] = [];
	const line = document.split('\n')[position.line].trim();
	const lineRange: Range = {
		start: { line: position.line, character: 0 },
		end: { line: position.line, character: position.character + 1 }
	};

	let priority = 0;
	if (line.startsWith('the')) {
		const templatesHeader = 'the templates are:';
		const typeHierarchyHeader = 'the type hierarchy is:';

		if (typeChecking && sectionWithHeader(document, typeHierarchyHeader) === undefined) {
			completions.push({
				label: typeHierarchyHeader,
				kind: CompletionItemKind.Text,
				insertTextFormat: InsertTextFormat.PlainText,
				textEdit: TextEdit.replace(lineRange, templatesHeader),
				sortText: paddedString(priority++)
			});
		}

		if (sectionWithHeader(document, templatesHeader) === undefined) {
			completions.push({
				label: templatesHeader,
				kind: CompletionItemKind.Text,
				insertTextFormat: InsertTextFormat.PlainText,
				textEdit: TextEdit.replace(lineRange, templatesHeader),
				sortText: paddedString(priority++)
			});
		}

		if (sectionWithHeader(document, 'the knowledge base') === undefined) {
			completions.push({
				label: 'the knowledge base __ includes:',
				kind: CompletionItemKind.Text,
				insertTextFormat: InsertTextFormat.Snippet,
				textEdit: TextEdit.replace(lineRange, 'the knowledge base ${1} includes:'),
				sortText: paddedString(priority++)
			});
		}
	}
	
	else if (line.startsWith('scen')) {
		completions.push(({
			label: 'scenario __ is:',
			kind: CompletionItemKind.Text,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(lineRange, 'scenario ${1} is:'),
			sortText: paddedString(priority++)
		}));
	}

	else if (line.startsWith('quer')) {
		completions.push({
			label: 'query __ is:',
			kind: CompletionItemKind.Text,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit: TextEdit.replace(lineRange, 'query ${1} is:'),
			sortText: paddedString(priority++)
		});
	}

	return completions;
}

function dummyCompletions(): CompletionItem[] {
	return [
		{
			label: 'JavaScript',
			kind: CompletionItemKind.Text
		},
		{
			label: 'TypeScript',
			kind: CompletionItemKind.Text
		}
	];
}