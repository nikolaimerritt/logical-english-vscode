import { Position, Range, TextDocument } from 'vscode-languageserver-textdocument';
import { CompletionItem, CompletionItemKind, /* InsertReplaceEdit,*/ TextDocumentPositionParams, InsertTextFormat, InsertReplaceEdit, TextEdit } from "vscode-languageserver";
import { literalAtPosition, areaWithClauses, templatesInDocument, typeTreeInDocument, sortBy } from './utils';
import { Template } from './template';


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


	const completionsWithScores: [CompletionItem, number][] = templatesInDocument(text)
	.map(template => {
		const templateWithMissingTerms = template.withMissingTerms(typeTree, literal);
		const textEdit = TextEdit.replace(literalToEndOfLine, templateWithMissingTerms.toSnippet());
		const score = template.incompleteMatchScore(literal);
		const completion: CompletionItem = {
			label: templateWithMissingTerms.toString(),
			kind: CompletionItemKind.Text,
			insertTextFormat: InsertTextFormat.Snippet,
			textEdit,
			sortText: String(score).padStart(4, '0')
		};
		return [completion, score];
	});
	console.log(`Completions for ${literal}`);
	console.log(completionsWithScores);


	const completions = sortBy(completionsWithScores, ([_, score]) => score)
	.reverse()
	.map(([template, _]) => template)
	.slice(0, 3);

	return completions;
}

function dummyCompletion(): CompletionItem[] {
	return [
		{
			label: 'TypeScript',
			kind: CompletionItemKind.Text,
			data: 1
		},
		{
			label: 'JavaScript',
			kind: CompletionItemKind.Text,
			data: 2
		},
		{
			label: 'LogicalEnglish',
			kind: CompletionItemKind.Text,
			data: 3
		}
	];
}