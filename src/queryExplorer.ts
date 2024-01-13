import * as fs from 'fs';
import * as path from 'path';
import * as vscode from 'vscode';
import { createWorksheet } from './createWorksheet';

class SqlFile extends vscode.TreeItem {
    constructor(public readonly uri: vscode.Uri, public readonly label: string) {
        super(label);
        this.command = {
            command: 'create-snowflake-worksheets.openFile',
            title: 'Open File',
            arguments: [uri]
        };
    }

    contextValue = 'file';
}

class SqlDirectory extends vscode.TreeItem {
    constructor(public readonly uri: vscode.Uri, public readonly label: string) {
        super(label, vscode.TreeItemCollapsibleState.Collapsed);
        this.tooltip = `${this.label}`;
    }

    contextValue = 'directory';
}

export class QueryExplorerProvider implements vscode.TreeDataProvider<SqlFile> {
    private _onDidChangeTreeData: vscode.EventEmitter<SqlFile | SqlDirectory | undefined> = new vscode.EventEmitter<SqlFile | SqlDirectory | undefined>();
    readonly onDidChangeTreeData: vscode.Event<SqlFile | SqlDirectory | undefined> = this._onDidChangeTreeData.event;
    private fileWatcher: vscode.FileSystemWatcher | undefined;

    constructor() {
       this.initializeFileWatcher();
       vscode.workspace.onDidChangeConfiguration(e => {
              if (e.affectsConfiguration('create-snowflake-worksheets.savePath')) {
                this.initializeFileWatcher();
                this.refresh();
              }
       });
    }   

    private initializeFileWatcher(): void {
        const savePath = vscode.workspace.getConfiguration('create-snowflake-worksheets').get<string>('savePath');
        if (savePath) {
            // Dispose of existing file watcher (for example, if the save path has changed)
            if (this.fileWatcher) {
                this.fileWatcher.dispose();
            }
            this.fileWatcher = vscode.workspace.createFileSystemWatcher(new vscode.RelativePattern(savePath, '**/*'));
            this.fileWatcher.onDidChange(() => this.refresh());
            this.fileWatcher.onDidCreate(() => this.refresh());
            this.fileWatcher.onDidDelete(() => this.refresh());
        } else {
            vscode.window.showInformationMessage('No save path specified in the settings');
        }
    }

    refresh(): void {
        this._onDidChangeTreeData.fire(undefined);
    }

    getTreeItem(element: SqlFile | SqlDirectory): vscode.TreeItem {
        return element;
    }

    getChildren(element?: SqlFile | SqlDirectory): Thenable<(SqlFile | SqlDirectory)[]> {
        const savePath = vscode.workspace.getConfiguration('create-snowflake-worksheets').get<string>('savePath');
        if (!savePath) {
            vscode.window.showInformationMessage('No save path specified in the settings');
            return Promise.resolve([]);
        }

        return new Promise(resolve => {
            const directoryPath = element ? element.uri.fsPath : savePath;
            fs.readdir(directoryPath, { withFileTypes: true}, (err, dirents) => {
                if (err) {
                    vscode.window.showInformationMessage('Unable to read directory');
                    return resolve([]);
                }

                const directories: SqlDirectory[] = [];
                const files: SqlFile[] = [];

                dirents.forEach(dirent => {
                    const fullPath = path.join(directoryPath, dirent.name);
                    if (dirent.isDirectory()) {
                        directories.push(new SqlDirectory(vscode.Uri.file(fullPath), dirent.name));
                    } else if (dirent.isFile() && path.extname(dirent.name) === '.sql') {
                        files.push(new SqlFile(vscode.Uri.file(fullPath), dirent.name));
                    }
                });

                directories.sort((a, b) => a.label.localeCompare(b.label));
                files.sort((a, b) => a.label.localeCompare(b.label));

                resolve([...directories, ...files]);
            });
        });
    }
}

export class QueryExplorer {
    constructor(context: vscode.ExtensionContext) {
        const treeDataProvider = new QueryExplorerProvider();
        context.subscriptions.push(vscode.window.createTreeView('query-explorer', { treeDataProvider }));
        vscode.commands.registerCommand('create-snowflake-worksheets.openFile', (resource) => this.openResource(resource));
        vscode.commands.registerCommand('create-snowflake-worksheets.createQueryEntry', (resource) => this.createQueryEntry(resource));
        vscode.commands.registerCommand('create-snowflake-worksheets.deleteQueryEntry', (resource) => this.deleteQueryEntry(resource));
        vscode.commands.registerCommand('create-snowflake-worksheets.renameQueryEntry', (resource) => this.renameQueryEntry(resource));
        vscode.commands.registerCommand('create-snowflake-worksheets.duplicateQueryEntry', (resource) => this.duplicateQueryEntry(resource));
        vscode.commands.registerCommand('create-snowflake-worksheets.createQueryDirectory', (resource) => this.createQueryDirectory(resource));
        vscode.commands.registerCommand('create-snowflake-worksheets.deleteQueryDirectory', (resource) => this.deleteQueryDirectory(resource));
        vscode.commands.registerCommand('create-snowflake-worksheets.renameQueryDirectory', (resource) => this.renameQueryDirectory(resource));
    }

    private openResource(resource: vscode.Uri): void {
        vscode.window.showTextDocument(resource);
    }

    private async createQueryEntry(resource: SqlDirectory | undefined): Promise<void> {
        const savePath = resource ? resource.uri.fsPath : vscode.workspace.getConfiguration('create-snowflake-worksheets').get<string>('savePath');
        if (!savePath) {
            vscode.window.showInformationMessage('No save path specified in the settings');
            return;
        }
        createWorksheet(savePath);
    }

    private async renameQueryEntry(resource: SqlFile): Promise<void> {
        let newName = await vscode.window.showInputBox({ prompt: 'Enter new name', value: resource.label });

        if (newName) {
            if (path.extname(newName) === '') {
                newName = newName + '.sql';
            }
            else if (path.extname(newName) !== '.sql') {
                newName = newName.replace(/\.[^/.]+$/, '.sql');
            }
            const newPath = vscode.Uri.file(path.join(path.dirname(resource.uri.fsPath), newName));
            
            if (fs.existsSync(newPath.fsPath)) {
                vscode.window.showInformationMessage(`File ${newName} already exists.`);
                return;
            }
            await vscode.workspace.fs.rename(resource.uri, newPath);
        }
    }

    private async deleteQueryEntry(resource: SqlFile): Promise<void> {
        const confirm = await vscode.window.showInformationMessage(`Are you sure you want to delete ${resource.label}?`, {modal: true}, 'Yes', 'No');
        if (confirm === 'Yes') {
            await vscode.workspace.fs.delete(resource.uri);
        }
    }

    private async duplicateQueryEntry(resource: SqlFile): Promise<void> {
        const newName = resource.label.replace(/\.[^/.]+$/, '') + '_copy.sql';
        const newPath = vscode.Uri.file(path.join(path.dirname(resource.uri.fsPath), newName));
            
        if (fs.existsSync(newPath.fsPath)) {
                vscode.window.showInformationMessage(`File ${newName} already exists.`);
                return;
        }
        await vscode.workspace.fs.copy(resource.uri, newPath);
    }

    private async createQueryDirectory(resource: SqlDirectory | undefined): Promise<void> {
        const savePath = resource ? resource.uri.fsPath : vscode.workspace.getConfiguration('create-snowflake-worksheets').get<string>('savePath');
        if (!savePath) {
            vscode.window.showInformationMessage('No save path specified in the settings');
            return;
        }

        const directoryName = await vscode.window.showInputBox({ prompt: 'Enter directory name' });
        if (directoryName) {
            const newDirectoryPath = path.join(savePath, directoryName);
            if (fs.existsSync(newDirectoryPath)) {
                vscode.window.showInformationMessage(`Directory ${directoryName} already exists.`);
                return;
            }
            fs.mkdirSync(newDirectoryPath);
        }
    }

    private async deleteQueryDirectory(resource: SqlDirectory): Promise<void> {
        const confirm = await vscode.window.showInformationMessage(`Are you sure you want to delete ${resource.label}?`, {modal: true}, 'Yes', 'No');
        if (confirm === 'Yes') {
            await vscode.workspace.fs.delete(resource.uri, { recursive: true });
        }
    }

    private async renameQueryDirectory(resource: SqlDirectory): Promise<void> {
        let newName = await vscode.window.showInputBox({ prompt: 'Enter new name', value: resource.label });

        if (newName) {
            const newPath = vscode.Uri.file(path.join(path.dirname(resource.uri.fsPath), newName));
            
            if (fs.existsSync(newPath.fsPath)) {
                vscode.window.showInformationMessage(`Directory ${newName} already exists.`);
                return;
            }
            await vscode.workspace.fs.rename(resource.uri, newPath);
        }
    }
}