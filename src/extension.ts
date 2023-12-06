// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

// This method is called when your extension is activated
// Your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	const config = vscode.workspace.getConfiguration('create-snowflake-worksheets');

	// The command has been defined in the package.json file
	// Now provide the implementation of the command with registerCommand
	// The commandId parameter must match the command field in package.json
	let disposable = vscode.commands.registerCommand('create-snowflake-worksheets.createSnowflakeWorksheet', () => {
		// The code you place here will be executed every time your command is executed
		// Display a message box to the user
		const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');
		const hour = String(now.getHours()).padStart(2, '0');
		const minutes = String(now.getMinutes()).padStart(2, '0');
		const seconds = String(now.getSeconds()).padStart(2, '0');

		const fileName = `worksheet__${year}-${month}-${day}_${hour}-${minutes}-${seconds}.sql`;

		const dirPath: string | undefined = config.get('savePath');

		if (!dirPath) {
			vscode.window.showOpenDialog({
				canSelectFiles: false,
				canSelectFolders: true,
				canSelectMany: false,
				openLabel: 'Select Folder',
			}).then((uri) => {
				if (uri) {
					const dirPath = uri[0].fsPath;
					const filePath = path.join(dirPath, fileName);

					fs.mkdirSync(dirPath, { recursive: true });
					fs.writeFileSync(filePath, '', 'utf8');

					vscode.workspace.openTextDocument(filePath).then(doc => {
						vscode.window.showTextDocument(doc);
					});
				}
			});

			return;
		} else {
			const filePath = path.join(dirPath, fileName);

			fs.mkdirSync(dirPath, { recursive: true });
			fs.writeFileSync(filePath, '', 'utf8');

			vscode.workspace.openTextDocument(filePath).then(doc => {
				vscode.window.showTextDocument(doc);
			});

			return;
		}
	});

	context.subscriptions.push(disposable);
}

// This method is called when your extension is deactivated
export function deactivate() {}
