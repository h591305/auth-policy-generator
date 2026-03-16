# Authentication Policy Generator

This repository contains a model-driven authentication policy generator developed as part of a master's thesis research project. The system demonstrates how authentication configuration can be defined at the modelling level and automatically transformed into executable application code.

The generator produces a full-stack web application where authentication mechanisms are configured based on a model specification.

---

# System Overview

The system consists of three main components:

- **Model specification (YAML)** – Defines domain entities and authentication configuration
- **VS Code Extension** – Parses the model and performs model-to-text transformations
- **Generated Application** – A full-stack application consisting of a Spring Boot backend and a React frontend

The generator demonstrates a model-driven security approach where security configuration is moved from manual implementation to the modelling level.

---

# Architecture

The architecture follows a model-driven workflow:

1. The user defines the application structure and authentication configuration in a YAML-based model.
2. The VS Code extension parses and validates the model.
3. The generator performs model-to-text transformations.
4. A complete web application is generated with authentication mechanisms automatically configured.

The generated application includes:

- **Backend** – Spring Boot application with Spring Security and OAuth2 configuration
- **Frontend** – React application with a login interface
- **Security configuration** – Automatically generated authentication policies

---

# File structure
```
auth-policy-generator/
├── src/
│   ├── extension.ts
│   ├── generator.ts
│   └── utils/
├── dist/
├── package.json
├── tsconfig.json
└── README.md
```

# Requirements

To run the generator you need:

- Node.js
- Visual Studio Code
- Java 17 or later
- Gradle

---


# Installation

```bash
npm install
```

# Build the extension
```bash
npm run compile
```

# Run the extension

1. Open the project and press F5 to launch an Extension Development Host
2. Then open the Command Palette and run: **Generate security code from YAML**
3. Provide the YAML model found in the repository
4. Run the generator
