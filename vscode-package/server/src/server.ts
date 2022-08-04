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
import { textDocumentDiagnostics } from "./diagnostics";
import { provideCompletions } from './completions';
import { tokenTypes, tokenModifiers, semanticTokens } from './highlighter';

// Create a connection for the server, using Node's IPC as a transport.
// Also include all preview / proposed LSP features.
const connection = createConnection(ProposedFeatures.all);

// Create a simple text document manager.
const documents = new TextDocuments(TextDocument);

// let hasConfigurationCapability = false;

connection.onInitialize((params: InitializeParams) => {
	const capabilities = params.capabilities;

	// Does the client support the `workspace/configuration` request?
	// If not, we fall back using global settings.
	// hasConfigurationCapability = !!(
	// 	capabilities.workspace && !!capabilities.workspace.configuration
	// );


	const hasWorkspaceFolderCapability = !!(
		capabilities.workspace && 
		!!capabilities.workspace.workspaceFolders
	);
	// hasDiagnosticRelatedInformationCapability = !!(
	// 	capabilities.textDocument &&
	// 	capabilities.textDocument.publishDiagnostics &&
	// 	capabilities.textDocument.publishDiagnostics.relatedInformation
	// );
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
	if (hasWorkspaceFolderCapability) {
		result.capabilities.workspace = {
			workspaceFolders: {
				supported: true
			}
		};
	}

	if (hasCodeActionLiteralsCapability) {
		result.capabilities.codeActionProvider = {
			codeActionKinds: ['quickfix', 'refactor.extract']
		};
	}
	return result;
});

// connection.onInitialized(() => {
// 	// if (hasConfigurationCapability) {
// 	// 	// Register for all configuration changes.
// 	// 	connection.client.register(DidChangeConfigurationNotification.type, undefined);
// 	// }
// });

// The example settings
// interface ExampleSettings {
// 	maxNumberOfProblems: number;
// }

// The global settings, used when the `workspace/configuration` request is not supported by the client.
// Please note that this is not the case when using this server with the client provided in this example
// but could happen with other clients.
// const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
// let globalSettings: ExampleSettings = defaultSettings;

// Cache the settings of all open documents
// const documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

// connection.onDidChangeConfiguration(() => {
// 	// if (hasConfigurationCapability) {
// 	// 	// Reset all cached document settings
// 	// 	documentSettings.clear();
// 	// } 
// 	// else {
// 	// 	globalSettings = <ExampleSettings>(
// 	// 		(change.settings.languageServerExample || defaultSettings)
// 	// 	);
// 	// }

// 	// Revalidate all open text documents
// 	documents.all().forEach(validateTextDocument);
// });

// function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
// 	if (!hasConfigurationCapability) {
// 		return Promise.resolve(globalSettings);
// 	}
// 	let result = documentSettings.get(resource);
// 	if (!result) {
// 		result = connection.workspace.getConfiguration({
// 			scopeUri: resource,
// 			section: 'languageServerExample'
// 		});
// 		documentSettings.set(resource, result);
// 	}
// 	return result;
// }

// Only keep settings for open documents
// documents.onDidClose(e => {
// 	// documentSettings.delete(e.document.uri);
// });

// The content of a text document has changed. This event is emitted
// when the text document first opened or when its content has changed.
documents.onDidChangeContent(change => {
	// const files = ["foo/bar.txt", "plip/plop.ts"];
	// connection.sendNotification("custom/loadFiles", [files]);
	const diagnostics = textDocumentDiagnostics(change.document.getText());
	connection.sendDiagnostics({ uri: change.document.uri, diagnostics });
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
	
	return provideCompletions(document.getText(), params);
});

connection.languages.semanticTokens.on((params: SemanticTokensParams) => {
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
