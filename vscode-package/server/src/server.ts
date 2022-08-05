/* --------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for license information.
 * ------------------------------------------------------------------------------------------ */

// Initial version taken from https://code.visualstudio.com/api/language-extensions/language-server-extension-guide
// Sending code actions based on code at https://github.com/YuanboXue-Amber/endevor-scl-support/blob/master/server/src/server.ts
// Configuring semantic token providers based on https://github.com/ansible/ansible-language-server/blob/592c59784dedeabf10c75a62637ce9e11f12bdfd/src/ansibleLanguageService.ts

import {
	createConnection,
	TextDocuments,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	TextDocumentSyncKind,
	InitializeResult,
	SemanticTokensParams
} from 'vscode-languageserver/node';

import { TextDocument } from 'vscode-languageserver-textdocument';

import { quickfixes } from "./quickfixes";
import { diagnostics } from "./diagnostics";
import { completions } from './completions';
import { tokenTypes, tokenModifiers, semanticTokens } from './highlighter';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents = new TextDocuments(TextDocument);

// let hasConfigurationCapability = false;

connection.onInitialize(params => {
	const capabilities = params.capabilities;

	const hasWorkspaceFolderCapability = !!(
		capabilities.workspace && 
		!!capabilities.workspace.workspaceFolders
	);

	const hasCodeActionLiteralsCapability = !!(
		capabilities.textDocument &&
		capabilities.textDocument.codeAction &&
		capabilities.textDocument.codeAction.codeActionLiteralSupport
	);

	const result: InitializeResult = {
		capabilities: {
			textDocumentSync: TextDocumentSyncKind.Incremental,
			// Tell the client that this server supports code completion.
			completionProvider: { resolveProvider: false },
			codeActionProvider: true,
			semanticTokensProvider: {
				documentSelector: [ { language: 'logical-english' } ],
				full: true,
				legend: { tokenTypes, tokenModifiers }
			}
		}
	};
	if (hasWorkspaceFolderCapability)
		result.capabilities.workspace = { workspaceFolders: { supported: true } };

	if (hasCodeActionLiteralsCapability) 
		result.capabilities.codeActionProvider = { codeActionKinds: ['quickfix'] };
	
	return result;
});


documents.onDidChangeContent(change => {
	const diags = diagnostics(change.document.getText());
	connection.sendDiagnostics({ uri: change.document.uri, diagnostics: diags });
});


connection.onCodeAction(params => {
	if (params.context.diagnostics.length === 0)
		return [];

	const document = documents.get(params.textDocument.uri);
	if (document === undefined)
		return [];
	
	return quickfixes(document, params);
});



connection.onCompletion(params => {
	const document = documents.get(params.textDocument.uri);
	if (document === undefined)
		return [];
	
	return completions(document.getText(), params);
});

// .on() sends and receives full semantic tokens of entire document
// as opposed to a semantic tokens delta, or a semantic tokens range
connection.languages.semanticTokens.on(params => {
	const document = documents.get(params.textDocument.uri);
	if (document === undefined)
		return { data: [] };
	
	return semanticTokens(document);
});


// Make the text document manager listen on the connection
// for open, change and close text document events
documents.listen(connection);

// Listen on the connection
connection.listen();
