export interface supportPackInfo {
  tla: string;
  projects: string[];
  fromDate: string;
  toDate: string;
}

export interface processedRetainerPlans {
  sheetEntries: supportPackInfo[];
  fromDates: number[];
  toDates: number[];
  supportDateRange: { min: number; max: number };
}

export interface projectData {
  timeData: timeEntry[];
  taskData: taskEntry[];
}

export interface supportProjectData {
  sheetEntries: supportPackInfo[];
  fromDates: number[];
  toDates: number[];
  supportData: projectData;
}

export type customerData = projectData[];

export interface customerProjectData {
  supportData: projectData;
  customerData: customerData;
  sheetEntries: supportPackInfo[];
}

export interface blendedTaskObject {
  projectId: number;
  taskId: number;
  taskTitle: string;
  completed: boolean;
  timeEntries: timeEntry[];
}

export interface blendedTaskTlaObject {
  projectId: number;
  taskId: number;
  tla: string;
  taskTitle: string;
  completed: boolean;
  timeEntries: timeEntry[];
}

export interface timeSummary {
  billableHours: number;
  billableMinutes: number;
  nonBillableHours: number;
  nonBillableMinutes: number;
}

export interface calculatedTime {
  billableHrs: number;
  nonBillableHrs: number;
  totalHrs: number;
}

export interface taskSummary {
  projectId: number;
  taskId: number;
  taskTitle: string;
  tla: string;
  completed: boolean;
  billableHrs: number;
  nonBillableHrs: number;
  totalHrs: number;
}

export type sheetDataRow = (number | string | boolean)[];
//Index, ProjectId, TaskId, TLA, BillableTime, NonBillableTime, TotalTime, Completed, TaskTitle

export interface timeEntry {
  'project-id': string;
  isbillable: string;
  tasklistId: string;
  'todo-list-name': string;
  'todo-item-name': string;
  isbilled: string;
  'updated-date': string;
  'todo-list-id': string;
  tags: { name: string; id: string; color: string }[];
  canEdit: boolean;
  taskEstimatedTime: string;
  'company-name': string;
  id: string;
  invoiceNo: string;
  'person-last-name': string;
  parentTaskName: string;
  dateUserPerspective: string;
  minutes: string;
  'person-first-name': string;
  description: string;
  'ticket-id': string;
  createdAt: string;
  taskIsPrivate: string;
  parentTaskId: string;
  'company-id': string;
  'project-status': string;
  'person-id': string;
  'project-name': string;
  'task-tags': string[];
  taskIsSubTask: string;
  'todo-item-id': string;
  date: string;
  'has-start-time': string;
  hours: string;
}

export interface taskEntry {
  id: number;
  canComplete: boolean;
  'comments-count': number;
  description: string;
  'has-reminders': boolean;
  'has-unread-comments': boolean;
  private: number;
  content: string;
  order: number;
  'project-id': number;
  'project-name': string;
  'todo-list-id': number;
  'todo-list-name': string;
  'tasklist-private': boolean;
  'tasklist-isTemplate': boolean;
  status: string;
  'company-name': string;
  'company-id': number;
  'creator-id': number;
  'creator-firstname': string;
  'creator-lastname': string;
  completed: boolean;
  'start-date': string;
  'due-date-base': string;
  'due-date': string;
  'created-on': string;
  'last-changed-on': string;
  position: number;
  'estimated-minutes': number;
  priority: string;
  progress: number;
  'harvest-enabled': boolean;
  parentTaskId: string;
  lockdownId: string;
  'tasklist-lockdownId': string;
  'has-dependencies': number;
  'has-predecessors': number;
  hasTickets: boolean;
  tags: {
    id: number;
    name: 'API';
    color: '#2f8de4';
  }[];
  timeIsLogged: string;
  'attachments-count': number;
  'responsible-party-ids': string;
  'responsible-party-id': string;
  'responsible-party-names': string;
  'responsible-party-type': string;
  'responsible-party-firstname': string;
  'responsible-party-lastname': string;
  'responsible-party-summary': string;
  predecessors: any[];
  canEdit: boolean;
  viewEstimatedTime: boolean;
  'creator-avatar-url': string;
  canLogTime: true;
  userFollowingComments: boolean;
  userFollowingChanges: boolean;
  DLM: number;
}
