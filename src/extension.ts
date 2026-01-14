import * as vscode from 'vscode';
import * as path from 'path';
import * as fs from 'fs';
import * as unzipper from 'unzipper';
import { Readable } from 'stream';
import { exec } from 'child_process';
import { generateSecurityCode, createLoginPage } from './generator';


export function activate(context: vscode.ExtensionContext) {
    let disposable = vscode.commands.registerCommand('mds.generateSecurityCode', async () => {
        const projectName = await vscode.window.showInputBox({ prompt: 'Enter project name' });
        if (!projectName){ 
          return vscode.window.showErrorMessage('Project name is required!');
        }

        
        const yamlFile = await vscode.window.showOpenDialog({
            canSelectFiles: true,
            canSelectFolders: false,
            canSelectMany: false,
            openLabel: 'Select File'
        });

        const folderUri = await vscode.window.showOpenDialog({
            canSelectFolders: true,
            openLabel: 'Select folder to create the project'
        });
        if (!folderUri || folderUri.length === 0) {
          return vscode.window.showErrorMessage('You must select a folder!');
          }

        const projectPath = path.join(folderUri[0].fsPath, projectName);
        const backendPath = path.join(projectPath, 'backend');
        const frontendPath = path.join(projectPath, 'frontend');

        if (fs.existsSync(projectPath)) {
            vscode.window.showErrorMessage('Folder already exists!');
            return;
        }

        vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: `Creating Spring Boot + React project...`,
            cancellable: false
        }, async (progress) => {
            try {
                // 1. Download Spring Boot starter
                const downloadUrl = `https://start.spring.io/starter.zip` +
                    `?type=gradle-project` +
                    `&language=java` +
                    `&baseDir=${projectName}` +
                    `&groupId=com.example` +
                    `&artifactId=${projectName}` +
                    `&name=${projectName}` +
                    `&packageName=com.example.${projectName.toLowerCase()}` +
                    `&dependencies=web,data-jpa,h2,security,oauth2-resource-server,oauth2-client`;

                await downloadAndExtract(downloadUrl, backendPath);

                // 2. Generate Spring Boot security code from YAML (if exists)
                
                const yamlPath = yamlFile[0].fsPath;

                if (yamlFile && yamlFile[0]) {
                    
                   const doc = fs.readFileSync(yamlPath, 'utf8');
                    await generateSecurityCode(doc, backendPath, projectName);
                    vscode.window.showInformationMessage('Spring Boot Security code generated from YAML!');
                } else {
                    vscode.window.showWarningMessage('No security.model.yaml found.');
                }

                // 3. Create React frontend
                await createReactFrontend(frontendPath);

                // 4. Open folder in VSCode
                vscode.commands.executeCommand('vscode.openFolder', vscode.Uri.file(projectPath), true);

                vscode.window.showInformationMessage(`Spring Boot project "${projectName}" created successfully!`);
            } catch (err: any) {
                vscode.window.showErrorMessage(`Error: ${err.message}`);
            }
        });
    });

    context.subscriptions.push(disposable);
}

async function downloadAndExtract(url: string, folderPath: string) {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`Failed to download project: ${res.status} ${res.statusText}`);
    }
    const buffer = await res.arrayBuffer();
    const stream = Readable.from(Buffer.from(buffer));

    return new Promise<void>((resolve, reject) => {
        stream
            .pipe(unzipper.Extract({ path: folderPath }))
            .on('close', () => resolve())
            .on('error', (err) => reject(err));
    });
}

async function createReactFrontend(frontendPath: string) {
  return new Promise<void>((resolve, reject) => {
    if (!fs.existsSync(frontendPath)) {
      fs.mkdirSync(frontendPath, { recursive: true });
    }

    // Step 1: Create React app with TypeScript template
    exec(`npx create-react-app . --template typescript`, { cwd: frontendPath }, (err) => {
      if (err) {
        reject(new Error(`React creation failed: ${err.message}`));
        return;
      }

      // Step 2: Install required dependencies (bootstrap + fontawesome)
      const deps = [
        "bootstrap",
        "@fortawesome/react-fontawesome",
        "@fortawesome/fontawesome-svg-core",
        "@fortawesome/free-brands-svg-icons",
        "@fortawesome/free-solid-svg-icons"
      ];

      exec(`npm install ${deps.join(" ")}`, { cwd: frontendPath }, async (err2) => {
        if (err2) {
          reject(new Error(`npm install failed: ${err2.message}`));
          return;
        }

        try {
          // Step 3: Create login page + dashboard
          await createLoginPage(frontendPath);
          resolve();
        } catch (e) {
          reject(e);
        }
      });
    });
  });
}

export function deactivate() {}
