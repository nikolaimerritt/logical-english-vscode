// Minimum Working Example based on https://code.visualstudio.com/api/language-extensions/semantic-highlight-guide
// and on https://github.com/microsoft/vscode-extension-samples/blob/main/semantic-tokens-sample/src/extension.ts

import {
	SemanticTokenModifiers,
	SemanticTokens,
    SemanticTokensLegend,
	SemanticTokensBuilder,
	SemanticTokenTypes
} from "vscode-languageserver";

import { TextDocument } from "vscode-languageserver-textdocument";
import { Template } from './template';
import { literalsInDocument, templatesInDocument } from './parsing';
import { ignoreComments } from './utils';


export const tokenTypes = ['variable', 'class', 'interface', 'keyword'];
export const tokenModifiers = ['declaration', 'implementation', 'control'];

interface TokenDetails {
    line: number,
    char: number,
    length: number,
    tokenTypeName: string,
    tokenModifierName: string | null
}

export function semanticTokens(document: TextDocument): SemanticTokens {
    const tokens: TokenDetails[] = [];
    const textWithComments = document.getText();
    tokens.push(...specialCommentTokens(textWithComments));

    const text = ignoreComments(document.getText());
    tokens.push(...termInLiteralTokens(text));

    const builder = new SemanticTokensBuilder();
    for (const token of tokens) {
        const { line, char, length, tokenTypeName, tokenModifierName } = token;
        builder.push(line, char, length, encodeTokenType(tokenTypeName), encodeTokenModifier(tokenModifierName));
    }
    
    return builder.build();
}


function termInLiteralTokens(text: string): TokenDetails[] {
    const templates = templatesInDocument(text);
    const tokens: TokenDetails[] = [];
    
    // eslint-disable-next-line prefer-const
    for (let { content: literal, range } of literalsInDocument(text)) {
        // const template = templates.find(template => template.matchesLiteral(literal));
        const template = Template.findBestMatch(templates, literal);
        
        if (template !== undefined) {
            const terms = template.parseTerms(literal);
            
            let char = range.start.character;
            for (const { name: term } of terms) {
                const termStart = literal.indexOf(term);
                char += termStart;
                tokens.push({
                    line: range.start.line,
                    char,
                    length: term.length,
                    tokenTypeName: 'variable',
                    tokenModifierName: null
                });
                literal = literal.slice(termStart + term.length, undefined);
                char += term.length;
            }
        }
    }

    return tokens;
}


function specialCommentTokens(text: string): TokenDetails[] {
    const specialCommentsRegex = /^.*(%type checking:? on)\s*$/gm;
    const lines = text.split('\n');
    const tokens: TokenDetails[] = [];

    for (let i = 0; i < lines.length; i++) {
        for (const commentMatch of lines[i].matchAll(specialCommentsRegex)) {
            if (commentMatch.index !== undefined && commentMatch.length >= 2) {
                tokens.push({
                    line: i,
                    char: commentMatch.index,  
                    length: commentMatch[1].length,
                    tokenTypeName: 'keyword',
                    tokenModifierName: 'control'
                });
            }
        }
    }

    return tokens;
}


function encodeTokenType(type: string): number {
    if (tokenTypes.includes(type))
        return tokenTypes.indexOf(type);
    
    return tokenTypes.length + 2;
}

function encodeTokenModifier(modifier: string | null): number {
    if (modifier === null)
        return 0;

    if (tokenModifiers.includes(modifier))
        return tokenModifiers.indexOf(modifier);
    
    return tokenModifiers.length + 2;
}