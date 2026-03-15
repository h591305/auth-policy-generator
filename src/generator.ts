import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { IdempotencyParameterMismatch } from '@aws-sdk/client-s3';


export async function generateSecurityCode(yamlText: string, backendPath: string, projectName: string) {


  const model = yaml.load(yamlText) as any;
  if (!model.entities) {
    throw new Error('Invalid model: entities required');
  }

  // Step 1: Detect the actual Java package folder
  const javaSrcPath = path.join(backendPath, projectName, 'src', 'main', 'java');
  const comFolder = path.join(javaSrcPath, 'com');
  const exampleFolder = path.join(comFolder, 'example');

  if (!fs.existsSync(exampleFolder)) {
    throw new Error('Unexpected Spring Boot structure: com/example folder missing');
  }

  // The last folder under com/example is the artifactId folder
  const artifactFolders = fs.readdirSync(exampleFolder).filter(f =>
    fs.statSync(path.join(exampleFolder, f)).isDirectory()
  );
  if (artifactFolders.length === 0) {
    throw new Error('No artifact folder found under com/example');
  }

  const artifactFolder = artifactFolders[0]; // e.g., "demoapp"
  const baseJavaPath = path.join(exampleFolder, artifactFolder);

  // Compute Java package string
  const pkg = baseJavaPath
    .replace(/^.*src[\/\\]main[\/\\]java[\/\\]/, '')
    .split(path.sep)
    .join('.');

  // Prepare folders
  const controllerPath = path.join(baseJavaPath, 'controller');
  const dtoPath = path.join(baseJavaPath, 'dto');
  const entitiesPath = path.join(baseJavaPath, 'entities');
  const securityPath = path.join(baseJavaPath, 'security');
  const resourcesPath = path.join(baseJavaPath, '..', '..', '..', '..', 'resources');

  [controllerPath, dtoPath, entitiesPath, securityPath, resourcesPath].forEach(p =>
    fs.mkdirSync(p, { recursive: true })
  );

  // Generate entities, controllers, DTOs
  for (const entityName of Object.keys(model.entities)) {
  
    const entityObj = Object.assign({}, ...model.entities[entityName]);

  

    fs.writeFileSync(
      path.join(controllerPath, `${entityName}Controller.java`),
      generateController(entityName, pkg)
    );
    fs.writeFileSync(
      path.join(dtoPath, `${entityName}DTO.java`),
      generateDTO(entityName, entityObj, pkg)
    );
    fs.writeFileSync(
      path.join(entitiesPath, `${entityName}.java`),
      generateEntity(entityName, entityObj, pkg)
    );


  }

  // Generate security classes
   fs.writeFileSync(path.join(securityPath, 'SecurityConfig.java'), generateSecurityConfig(pkg));
   fs.writeFileSync(path.join(securityPath, 'WebConfig.java'), generateWebConfig(pkg));


    //Configure application.proporties
   const database =  model.oauth2; 
    fs.appendFileSync(path.join(resourcesPath, 'application.properties'), configureDatabase(pkg, database));

}


function generateController(entityName: string, pkg: string) {
  const lower = entityName.toLowerCase();
  return `
package ${pkg}.controller;

import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/${lower}s")
public class ${entityName}Controller {

}
`.trim();
}

function generateDTO(entityName: string, entity: Object, pkg: string): string {
  
    const vars = Object.entries(entity).map(([fieldName, fieldType]) => {

    fieldType = fieldType.charAt(0).toUpperCase() + fieldType.slice(1);
   return `private ${fieldType} ${fieldName};`;
}). join('\n');

  const methods = Object.entries(entity).map(([fieldName, fieldType]) => {
  
    fieldType = fieldType.charAt(0).toUpperCase() + fieldType.slice(1);
   return `public ${fieldType} get${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}(){ return ${fieldName}; }
     public void set${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}(${fieldType} ${fieldName}) { this.${fieldName} =  ${fieldName}; }`;
}).join("\n");
  
  
  return `
package ${pkg}.dto;

public class ${entityName}DTO {
   
  ${vars}

  ${methods}
}
`.trim();
}


function generateEntity(entityName: string, entity: Object,  pkg: string): string {

  const vars = Object.entries(entity).map(([fieldName, fieldType]) => {

    fieldType = fieldType.charAt(0).toUpperCase() + fieldType.slice(1);
   return `private ${fieldType} ${fieldName};`;
}). join('\n');

  const methods = Object.entries(entity).map(([fieldName, fieldType]) => {
  
    fieldType = fieldType.charAt(0).toUpperCase() + fieldType.slice(1);
   return `public ${fieldType} get${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}(){ return ${fieldName}; }
     public void set${fieldName.charAt(0).toUpperCase() + fieldName.slice(1)}(${fieldType} ${fieldName}) { this.${fieldName} =  ${fieldName}; }`;
}).join("\n\n");
  
  
  return `
package ${pkg}.entities;

import jakarta.persistence.*;

@Entity
public class ${entityName} {

  @Id
  @GeneratedValue
  ${vars}


  ${methods}
}
`.trim();
}

function generateSecurityConfig(pkg: string) {


  return `
package ${pkg}.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.web.SecurityFilterChain;

@Configuration
@EnableWebSecurity
public class SecurityConfig {

   @Bean
    public SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
        http.authorizeHttpRequests(auth -> auth.anyRequest().authenticated())
            .oauth2Login(oauth2 -> oauth2.defaultSuccessUrl("/api/**", true));
        return http.build();
    }
}
`.trim();
}

function generateWebConfig(pkg: string) {
  return `
package ${pkg}.security;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig {

    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/**")
                        .allowedOrigins("http://localhost:3000")
                        .allowedMethods("GET", "POST", "PUT", "DELETE")
                        .allowedHeaders("*")
                        .allowCredentials(true);
            }
        };
    }
}
`.trim();
}

 function configureDatabase(pkg: string, database: Object) {

  const oauthConfig = Object.entries(database).map(([providerKey , providerVal]) => {

    const {name, ...rest} = providerVal;

    return Object.entries(rest)
                        .map(([key,val]) => `spring.security.oauth2.client.registration.${name.toLowerCase()}.${key}=${val}`)
                        .join('\n');

  })
  .join('\n\n'); 

    return `
!H2 Database Setup
spring.datasource.url=jdbc:h2:mem:testdb
spring.datasource.driverClassName=org.h2.Driver
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true
 

${oauthConfig}

`;


}




// --- React Login Page Generator ---
export async function createLoginPage(frontendPath: string) {
    const srcPath = path.join(frontendPath, "src");
    const comPath = path.join(srcPath, "components");

    fs.mkdirSync(srcPath, { recursive: true });
    fs.mkdirSync(comPath, { recursive: true});

    const loginCode = `
import React, { useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faFacebookF, faGoogle, faTwitter, faGithub } from "@fortawesome/free-brands-svg-icons";


export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = (e: { preventDefault: () => void; }) => {
    e.preventDefault();
  };

  const gitHubLogin = () => {
    window.location.href="http://localhost8080/auth/github"

  };

  return (
    <div className="d-flex justify-content-center align-items-center vh-100 bg-light">
      <div className="card shadow p-4" style={{ width: "350px" }}>
        <h3 className="text-center mb-4">Login</h3>

        <form onSubmit={handleSubmit}>
          {/* Email input */}
          <div className="mb-3">
            <label htmlFor="email" className="form-label">
              Email address
            </label>
            <input
              type="email"
              className="form-control"
              id="email"
              placeholder="Enter email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          {/* Password input */}
          <div className="mb-3">
            <label htmlFor="password" className="form-label">
              Password
            </label>
            <input
              type="password"
              className="form-control"
              id="password"
              placeholder="Enter password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          {/* Remember me + forgot password */}
          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="form-check">
              <input
                className="form-check-input"
                type="checkbox"
                id="rememberMe"
              />
              <label className="form-check-label" htmlFor="rememberMe">
                Remember me
              </label>
            </div>
            <a href="#!">Forgot password?</a>
          </div>

          {/* Submit button */}
          <button type="submit" className="btn btn-primary w-100 mb-3">
            Sign in
          </button>

          {/* Register / social login */}
          <div className="text-center">
            <p>
              Not a member? <a href="#!">Register</a>
            </p>
            <p>or sign in with:</p>
            <div className="d-flex justify-content-center gap-2">
              <button type="button" className="btn btn-outline-primary btn-sm">
                <FontAwesomeIcon icon={faFacebookF} />
              </button>
              <button type="button" className="btn btn-outline-danger btn-sm" onClick={gitHubLogin}>
                <FontAwesomeIcon icon={faGoogle} />
              </button>
              <button type="button" className="btn btn-outline-info btn-sm">
                <FontAwesomeIcon icon={faTwitter} />
              </button>
              <button type="button" className="btn btn-outline-dark btn-sm">
                <FontAwesomeIcon icon={faGithub} />
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}

`;

    fs.writeFileSync(path.join(comPath, "Login.tsx"), loginCode.trim());

   const dashboardCode = `
   import React from "react";

const Dashboard = () => {
    
    return (
        <h2>Hello from dashboard!</h2>
    );
};

export default Dashboard;
`;

fs.writeFileSync(path.join(comPath, "Component.tsx"), dashboardCode.trim());

    // Override App.tsx so it renders Login
    const appPath = path.join(srcPath, "App.tsx");
    if (fs.existsSync(appPath)) {
        fs.writeFileSync(
            appPath,
            `
import React from "react";
import {BrowserRouter as Router, Route, Routes} from 'react-router-dom'
import Login from "./components/Login";
import Dashboard from "./components/Dashboard"

function App() {
return(
  <Router>
    <Routes>
      <Route path="/" element={<Login/>}/>
      <Route path="/dashboard" element={<Dashboard/>}/>
    </Routes>
  </Router>
)  
}

export default App;
`.trim()
        );
    }
}


