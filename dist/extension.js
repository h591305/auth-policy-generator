"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/extension.ts
var extension_exports = {};
__export(extension_exports, {
  activate: () => activate,
  deactivate: () => deactivate
});
module.exports = __toCommonJS(extension_exports);
var vscode = __toESM(require("vscode"));
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
function activate(context) {
  let disposable = vscode.commands.registerCommand(
    "auth-policy-generator.helloWorld",
    async () => {
      const wsName = await vscode.window.showInputBox({
        prompt: "Enter new workspace name",
        placeHolder: "MySpringWorkspace"
      });
      if (!wsName) return;
      const folderUris = await vscode.window.showOpenDialog({
        canSelectFolders: true,
        openLabel: "Select parent folder for workspace"
      });
      if (!folderUris || folderUris.length === 0) return;
      const parentFolder = folderUris[0].fsPath;
      const workspaceFolder = path.join(parentFolder, wsName);
      fs.mkdirSync(workspaceFolder, { recursive: true });
      const srcMainJava = path.join(workspaceFolder, "backend/src/main/java/com/example/demo");
      const srcMainResources = path.join(workspaceFolder, "src/main/resources");
      const frontend = path.join(workspaceFolder, "frontend/src/main/java/com/example/demo");
      fs.mkdirSync(srcMainJava, { recursive: true });
      fs.mkdirSync(srcMainResources, { recursive: true });
      fs.mkdirSync(frontend, { recursive: true });
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
      const wsFile = path.join(parentFolder, `${wsName}.code-workspace`);
      const wsContent = {
        folders: [{ path: wsName }],
        settings: {}
      };
      fs.writeFileSync(wsFile, JSON.stringify(wsContent, null, 2), "utf8");
      vscode.commands.executeCommand("vscode.openFolder", vscode.Uri.file(wsFile), true);
      vscode.window.showInformationMessage(`Workspace '${wsName}' created!`);
    }
  );
  context.subscriptions.push(disposable);
}
function deactivate() {
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  activate,
  deactivate
});
//# sourceMappingURL=extension.js.map
