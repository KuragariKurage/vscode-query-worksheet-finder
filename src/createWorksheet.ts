import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';

export function createWorksheet(dirPath: string | undefined) {
    const now = new Date();
		const year = now.getFullYear();
		const month = String(now.getMonth() + 1).padStart(2, '0');
		const day = String(now.getDate()).padStart(2, '0');
		const hour = String(now.getHours()).padStart(2, '0');
		const minutes = String(now.getMinutes()).padStart(2, '0');
		const seconds = String(now.getSeconds()).padStart(2, '0');

		const fileName = `worksheet__${year}-${month}-${day}_${hour}-${minutes}-${seconds}.sql`;

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
}