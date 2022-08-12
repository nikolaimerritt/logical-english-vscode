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
import { literalsInDocument as formulasInDocument, templatesInDocument } from './parsing';
import { ignoreComments } from './utils';
import { ElementKind } from './element';
import { parseFormula, parseFormulaFromTemplate } from './term-extractor';
import { Formula, TermKind } from './formula';


export const tokenTypes = ['variable', 'class', 'interface', 'keyword'];
export const tokenModifiers = ['declaration', 'implementation', 'control'];

interface TokenDetails {
    line: number,
    char: number,
    length: number,
    tokenTypeName: string,
    tokenModifierName: string | null
}

export function semanticTokens(textWithComments: string): SemanticTokens {
    const tokens: TokenDetails[] = [];
    tokens.push(...specialCommentTokens(textWithComments));

    const textWithoutComments = ignoreComments(textWithComments);
    tokens.push(...tokensFromAllTerms(textWithComments));

    const builder = new SemanticTokensBuilder();
    for (const token of tokens) {
        const { line, char, length, tokenTypeName, tokenModifierName } = token;
        builder.push(line, char, length, encodeTokenType(tokenTypeName), encodeTokenModifier(tokenModifierName));
    }
    
    return builder.build();
}


function tokensFromAllTerms(text: string): TokenDetails[] {
    const templates = templatesInDocument(text);
    const tokens: TokenDetails[] = [];
    
    // eslint-disable-next-line prefer-const
    for (let { content: formulaString, range } of formulasInDocument(text)) {
        // let elIdx = 0;
        // for (const el of parseFormula(templates, formula).elements) {
        //     elIdx = formula.indexOf(el.name, elIdx);

        //     if (el.elementKind === ElementKind.Term) {
        //         tokens.push({
        //             line: range.start.line,
        //             char: range.start.character + elIdx,
        //             length: el.name.length,
        //             tokenTypeName: 'variable',
        //             tokenModifierName: null
        //         });
        //     }
        //     elIdx += el.name.length;
        // }
        const formula = parseFormula(templates, formulaString);
        const atomTokens = atomsInFormulaTokens(
            formula,
            range.start.line, 
            range.start.character
        );

        tokens.push(...atomTokens);
    }

    return tokens;
}

function atomsInFormulaTokens(formula: Formula, line: number, startChar: number): TokenDetails[] {
    const tokens: TokenDetails[] = [];
    let elIdx = 0;

    for (const el of formula.elements) {
        elIdx = formula.name.indexOf(el.name, elIdx);

        if (el.elementKind === ElementKind.Term) {
            if (el.termKind === TermKind.Atom) {
                tokens.push({
                    line,
                    char: startChar + elIdx,
                    length: el.name.length,
                    tokenTypeName: 'variable',
                    tokenModifierName: null
                });
            }
            else { // el is formula
                const subformulaAtoms = atomsInFormulaTokens(el, line, startChar + elIdx);
                tokens.push(...subformulaAtoms);
            }
        }
        elIdx += el.name.length;
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