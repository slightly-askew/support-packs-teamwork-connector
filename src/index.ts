import { getRange, refreshSheetData } from './sheets/index';
import { getDayFormat, testTLA, projectIDs } from './sheets/util';
import { getProjectTasks, getProjectTime, TAGS, SUPPORT_ID } from './constants';
import { makeQueryString, makeHttpGetRequest } from './server/http';
import { taskEntry, timeEntry, supportPackInfo } from './types';

import { TEAMWORK_KEY } from './key';
//The above file (key.js) needs to be added manually to /src folder.
//Do not under any circumstance check this file into version control.
//It is ignored in .gitignore

const getInitialData = (): supportPackInfo[] => {
  const range = getRange('C2:F');
  return range.map(r => ({
    tla: r[0].toString(),
    projects: projectIDs(r[1].toString()),
    fromDate: getDayFormat(r[2]),
    toDate: getDayFormat(r[3])
  }));
};

const getNumberValues = obj => {
  for (const v in obj) return parseInt(obj[v]);
};

const getTimeData = (id: number): timeEntry[] => {
  return makeHttpGetRequest(getProjectTime(id), { filter: 'all' }, TEAMWORK_KEY)['time-entries'];
};

const getTaskData = (id: number): taskEntry[] => {
  const params = { 'task-ids': getNumberValues(TAGS) };
  return makeHttpGetRequest(getProjectTasks(id), { filter: 'all', ...params }, TEAMWORK_KEY)[
    'todo-items'
  ];
};

const processTimeInHrs = (hrs: number, mins: number, roundUpToMins = 15): number =>
  (Math.ceil((hrs * 60 + mins) / roundUpToMins) * (hrs * 60 + mins)) / roundUpToMins / 60;

const sumTimeEntries = (entries: timeEntry[]) => {
  const acc = {
    billableHours: 0,
    billableMinutes: 0,
    nonBillableHours: 0,
    nonBillableMinutes: 0
  };
  return entries.reduce((a, e) => {
    if (e.isbillable === '1') {
      const { billableHours, billableMinutes, ...rest } = a;
      return {
        ...rest,
        billableHours: billableHours + parseFloat(e.hours),
        billableMinutes: billableMinutes + parseFloat(e.minutes)
      };
    } else {
      const { nonBillableHours, nonBillableMinutes, ...rest } = a;
      return {
        ...rest,
        nonBillableHours: nonBillableHours + parseFloat(e.hours),
        nonBillableMinutes: nonBillableMinutes + parseFloat(e.minutes)
      };
    }
  }, acc);
};

const filterSupportData = (
  { taskData, timeData }: { taskData: taskEntry[]; timeData: timeEntry[] },
  tla: string
) => {
  const test = new RegExp(`^${tla}`);
  return { taskData: taskData.filter(d => d['content'].match(test)), timeData: timeData };
};

const makeDataArray = (
  {
    timeData,
    taskData
  }: {
    timeData: timeEntry[];
    taskData: taskEntry[];
  },
  TLA: string
): any[][] => {
  const taskTimeEntries = taskData.map(k => ({
    projectId: k['project-id'],
    taskId: k.id,
    completed: k.completed,
    entries: timeData.filter(m => k.id === parseFloat(m.parentTaskId))
  }));
  return taskTimeEntries
    .filter(e => e.entries.length > 0)
    .map((e, i) => {
      const {
        billableHours,
        billableMinutes,
        nonBillableHours,
        nonBillableMinutes
      } = sumTimeEntries(e.entries);
      const billable = processTimeInHrs(billableHours, billableMinutes);
      const nonBillable = processTimeInHrs(nonBillableHours, nonBillableMinutes, 5);
      return [
        e.projectId,
        e.taskId,
        TLA,
        billable,
        nonBillable,
        billable + nonBillable,
        e.completed
      ];
    });
};

const getProjectData = (ids: string[]) => {
  const timeData = ids.map(id => getTimeData(parseInt(id))).reduce((a, i) => a.concat(i), []);
  const taskData = ids.map(id => getTaskData(parseInt(id))).reduce((a, i) => a.concat(i), []);
  return {
    timeData: timeData,
    taskData: taskData
  };
};

declare var global: any;

global.onOpen = () => {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Teamwork data')
    .addItem('Refresh Teamwork Data', 'hydrateDataSheet')
    .addToUi();
};

global.hydrateDataSheet = () => {
  const sheetEntries = getInitialData();
  const supportData = getProjectData([`${SUPPORT_ID}`]);
  const combinedData = sheetEntries.reduce((a, e) => {
    const getData = getProjectData(e.projects);
    const customerProjectData = makeDataArray(getData, e.tla);
    const supportProjectData = makeDataArray(filterSupportData(supportData, e.tla), e.tla);
    Logger.log(`project data is ${JSON.stringify(customerProjectData, null, 4)}`);
    return a.concat(customerProjectData).concat(supportProjectData);
  }, []);
  const indexedData = combinedData.map((d, i) => [i, ...d]);
  refreshSheetData(indexedData);
};
