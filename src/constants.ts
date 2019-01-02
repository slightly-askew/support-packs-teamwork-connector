export const SUPPORT_ID = 295192;

export const TAGS = {
  PRODUCTION_SUPPORT: 25896,
  MARKETING_SUPPORT: 24686,
  SUPPORT: 7298,
  SUPPORT_TICKETS: 25415,
  FREE_SUPPORT: 11514
};

export const TEAMWORK_TIME: string = 'https://pm.cbo.me/time_entries.json';
export const TEAMWORK_TASKS: string = 'https://pm.cbo.me/tasks.json';
export const TEAMWORK_PROJECTS: string = 'https://pm.cbo.me/projects.json';

export const getProjectTasks = (id: number): string =>
  `https://pm.cbo.me/projects/${id}/tasks.json`;

export const getProjectTime = (id: number): string => `https://pm.cbo.me/projects/${id}/tasks.json`;
