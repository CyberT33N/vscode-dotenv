import * as vscode from "vscode";

const DOTENV_LANGUAGE_ID = "dotenv";
const DOTENV_PATTERN = /^\.env(?:\..+)?$/;

function getBasename(uri: vscode.Uri): string {
  const path = uri.path;
  const lastSlash = path.lastIndexOf("/");
  return lastSlash === -1 ? path : path.slice(lastSlash + 1);
}

function isDotenvFilename(filename: string): boolean {
  return filename === ".env-sample" || filename === ".flaskenv" || DOTENV_PATTERN.test(filename);
}

async function assignDotenvLanguage(document: vscode.TextDocument): Promise<void> {
  if (document.languageId === DOTENV_LANGUAGE_ID || document.uri.scheme !== "file") {
    return;
  }

  if (!isDotenvFilename(getBasename(document.uri))) {
    return;
  }

  await vscode.languages.setTextDocumentLanguage(document, DOTENV_LANGUAGE_ID);
}

function normalizeOpenDocuments(): void {
  for (const document of vscode.workspace.textDocuments) {
    void assignDotenvLanguage(document);
  }
}

export function activate(context: vscode.ExtensionContext): void {
  normalizeOpenDocuments();

  context.subscriptions.push(
    vscode.workspace.onDidOpenTextDocument((document) => {
      void assignDotenvLanguage(document);
    }),
    vscode.workspace.onDidRenameFiles(() => {
      normalizeOpenDocuments();
    }),
  );
}

export function deactivate(): void {}
