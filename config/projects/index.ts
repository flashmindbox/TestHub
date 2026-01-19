import { ProjectConfig } from '../../src/types';
import { studytabProject } from './studytab.project';

// Registry of all projects
const projects: Record<string, ProjectConfig> = {
  studytab: studytabProject,
};

/**
 * Get project configuration by name
 */
export function getProject(name: string): ProjectConfig {
  const project = projects[name];
  if (!project) {
    throw new Error(`Project "${name}" not found. Available projects: ${Object.keys(projects).join(', ')}`);
  }
  return project;
}

/**
 * Get all registered projects
 */
export function getAllProjects(): ProjectConfig[] {
  return Object.values(projects);
}

/**
 * Get project names
 */
export function getProjectNames(): string[] {
  return Object.keys(projects);
}

/**
 * Check if a project exists
 */
export function hasProject(name: string): boolean {
  return name in projects;
}

/**
 * Get environment-specific config for a project
 */
export function getProjectEnv(projectName: string, env: string = 'local') {
  const project = getProject(projectName);
  const envConfig = project.environments[env];

  if (!envConfig) {
    throw new Error(`Environment "${env}" not found for project "${projectName}"`);
  }

  return {
    ...project,
    currentEnv: env,
    baseUrl: envConfig.baseUrl,
    apiUrl: envConfig.apiUrl,
    readOnly: envConfig.readOnly || false,
  };
}

export { studytabProject };
