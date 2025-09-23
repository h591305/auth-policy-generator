import * as vscode from "vscode";
import * as fs from "fs";
import * as path from "path";

export function activate(context: vscode.ExtensionContext) {
  let disposable = vscode.commands.registerCommand(
    "auth-policy-generator.helloWorld",
    async () => {
      // Ask for workspace name
      const wsName = await vscode.window.showInputBox({
        prompt: "Enter new workspace name",
        placeHolder: "MySpringWorkspace"
      });
      if (!wsName) return;

      // Ask for parent folder
      const folderUris = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        openLabel: "Select parent folder for workspace"
      });
      if (!folderUris || folderUris.length === 0) return;

      const parentFolder = folderUris[0].fsPath;
      const workspaceFolder = path.join(parentFolder, wsName);

      // Create workspace folder and subfolders
      fs.mkdirSync(workspaceFolder, { recursive: true });
      const srcMainJava = path.join(workspaceFolder, "backend/src/main/java/com/example/demo");
      const srcMainResources = path.join(workspaceFolder, "src/main/resources");
	  const frontend= path.join(workspaceFolder, "frontend/src/main/java/com/example/demo");
      fs.mkdirSync(srcMainJava, { recursive: true });
      fs.mkdirSync(srcMainResources, { recursive: true });
	  fs.mkdirSync(frontend, {recursive: true});

      // Write a minimal Application.java
      const appJava = `package com.example.demo;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class Application {
    public static void main(String[] args) {
        SpringApplication.run(Application.class, args);
    }
}
`;
      fs.writeFileSync(path.join(srcMainJava, "Application.java"), appJava, "utf8");

      // Create workspace file
      const wsFile = path.join(parentFolder, `${wsName}.code-workspace`);
      const wsContent = {
        folders: [{ path: wsName }],
        settings: {}
      };
      fs.writeFileSync(wsFile, JSON.stringify(wsContent, null, 2), "utf8");

      // Open the workspace
      vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(wsFile), true);
      vscode.window.showInformationMessage(`Workspace '${wsName}' created!`);
    }
  );

  context.subscriptions.push(disposable);
}

export function deactivate() {}
