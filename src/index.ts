import { getRange, refreshSheetData } from './sheets/index';
import { getDayFormat, testTLA, projectIDs } from './sheets/util';
import { getProjectTasks, getProjectTime, getTaskTime, TAGS, SUPPORT_ID } from './constants';
import { makeQueryString, makeHttpGetRequest } from './server/http';
import { taskEntry, timeEntry, supportPackInfo } from './types';

import { TEAMWORK_KEY } from './key';
//The above file (~/src/key.js) needs to be added manually.
//Do not under any circumstance check this file into version control.
//It is ignored in .gitignore by default

const getMinAndMax = (range: number[]): { min: number; max: number } => ({
  min: Math.min(...range),
  max: Math.max(...range)
});

const getInitialData = (): supportPackInfo[] => {
  const range = getRange('C2:F');
  const rangeObj = range.map(r => ({
    tla: r[0].toString(),
    projects: projectIDs(r[1].toString()),
    fromDate: getDayFormat(r[2]),
    toDate: getDayFormat(r[3])
  }));
  Logger.log(JSON.stringify(rangeObj, null, 4));
  return rangeObj;
};

const getTimeData = (id: number): timeEntry[] => {
  return makeHttpGetRequest(getTaskTime(id), { filter: 'all' }, TEAMWORK_KEY)['time-entries'];
};

const objectValues = (obj: {}): any[] => {
  let list = [];
  for (let o in obj) {
    list.push(obj[o]);
  }
  return list;
};

const getTaskData = (id: number, dates?: { min: number; max: number }): taskEntry[] => {
  const params = {
    'tag-ids': objectValues(TAGS).join()
  };
  if (dates) {
    params['completedAfterDate'] = dates.min;
    params['completedBeforeDate'] = dates.max;
  }
  if (dates) {
    params['filter'] = 'completed';
  }
  return makeHttpGetRequest(getProjectTasks(id), { ...params }, TEAMWORK_KEY)['todo-items'];
};

const processTimeInHrs = (hrs: number, mins: number, roundUpToMins = 15): number => {
  const totalMins: number = hrs * 60 + mins;
  const roundedTime: number = (Math.ceil(totalMins / roundUpToMins) * roundUpToMins) / 60;
  return parseFloat(roundedTime.toFixed(2));
};

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

const getProjectData = (ids: string[], dates?: { min: number; max: number }) => {
  const tasks = ids.map(id => getTaskData(parseInt(id))).reduce((a, i) => a.concat(i));
  if (dates) {
    ids
      .map(id => getTaskData(parseInt(id), dates))
      .reduce((a, i) => a.concat(i))
      .concat(tasks);
  }
  const timeData = tasks.map(t => getTimeData(t.id)).reduce((a, i) => a.concat(i), []);
  return {
    timeData: timeData,
    taskData: tasks
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
  const fromDates = sheetEntries.map(p => parseInt(p.fromDate));
  const toDates = sheetEntries.map(p => parseInt(p.toDate));
  const supportDateRange = getMinAndMax([...fromDates, ...toDates]);
  const supportData = getProjectData([`${SUPPORT_ID}`], { ...supportDateRange });
  const combinedData = sheetEntries.reduce((a, e, i) => {
    const getData = getProjectData(e.projects, { min: fromDates[i], max: toDates[i] });
    const customerProjectData = makeDataArray(getData, e.tla);
    const supportProjectData = makeDataArray(filterSupportData(supportData, e.tla), e.tla);
    Logger.log(`project data is ${JSON.stringify(customerProjectData, null, 4)}`);
    return a.concat(customerProjectData).concat(supportProjectData);
  }, []);
  const indexedData = combinedData.map((d, i) => [i, ...d]);
  refreshSheetData(indexedData);
};
