import { getRange, refreshSheetData } from './sheets/index';
import { getDayFormat, testTLA, projectIDs, pipe } from './sheets/util';
import { getProjectTasks, getProjectTime, getTaskTime, TAGS, SUPPORT_ID } from './constants';
import { makeQueryString, makeHttpGetRequest } from './server/http';
import * as types from './types';

import { TEAMWORK_KEY } from './key';
//The above file (~/src/key.js) needs to be added manually.
//Do not under any circumstance check this file into version control.
//It is ignored in .gitignore by default

const getMinAndMax = (range: number[]): { min: number; max: number } => ({
  min: Math.min(...range),
  max: Math.max(...range)
});

const getInitialData = (): types.supportPackInfo[] => {
  const range = getRange('C2:F');
  const rangeObj = range.map(r => ({
    tla: r[0].toString(),
    projects: projectIDs(r[1].toString()),
    fromDate: getDayFormat(r[2]),
    toDate: getDayFormat(r[3])
  }));
  return rangeObj;
};

//works
const getTimeData = (id: number): types.timeEntry[] => {
  const data = makeHttpGetRequest(getTaskTime(id), { filter: 'all' }, TEAMWORK_KEY)['time-entries'];
  Logger.log(`returned an array of length ${data.length} for id ${id}`);
  return data;
};

const objectValues = (obj: {}): any[] => {
  let list = [];
  for (let o in obj) {
    list.push(obj[o]);
  }
  return list;
};

const getTaskData = (id: number, dates?: { min: number; max: number }): types.taskEntry[] => {
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

const sumTimeEntries = (entries: types.timeEntry[]): types.timeSummary => {
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

const sumTimeInHrs = (timeEntries: types.timeEntry[]): types.calculatedTime => {
  const { billableHours, billableMinutes, nonBillableHours, nonBillableMinutes } = sumTimeEntries(
    timeEntries
  );
  const billableHrs = processTimeInHrs(billableHours, billableMinutes, 15);
  const nonBillableHrs = processTimeInHrs(nonBillableHours, nonBillableMinutes, 5);
  return {
    billableHrs: billableHrs,
    nonBillableHrs: nonBillableHrs,
    totalHrs: billableHrs + nonBillableHrs
  };
};

const getProjectData = (ids: string[], dates?: { min: number; max: number }): types.projectData => {
  let tasks = ids.map(id => getTaskData(parseInt(id))).reduce((a, i) => a.concat(i), []);
  if (dates) {
    const completedTasks = ids
      .map(id => getTaskData(parseInt(id), dates))
      .reduce((a, i) => a.concat(i), []);
    tasks = tasks.concat(completedTasks);
  }
  const timeData = tasks.map(t => {
    const tD = getTimeData(t.id);
    return tD;
  });
  const flatTimeData = timeData.reduce((a, i) => a.concat(i), []);
  return { timeData: flatTimeData, taskData: tasks };
};

declare var global: any;

global.onOpen = () => {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Teamwork data')
    .addItem('Refresh Teamwork Data', 'refreshData')
    .addToUi();
};

const fetchAndProcessRetainerPlans = (): types.processedRetainerPlans => {
  const sheetEntries = getInitialData();
  const fromDates = sheetEntries.map(p => parseInt(p.fromDate));
  const toDates = sheetEntries.map(p => parseInt(p.toDate));
  const supportDateRange = getMinAndMax([...fromDates, ...toDates]);
  return {
    sheetEntries: sheetEntries,
    fromDates: fromDates,
    toDates: toDates,
    supportDateRange: supportDateRange
  };
};

const fetchAllDataFromSupportProjects = ({
  sheetEntries,
  fromDates,
  toDates,
  supportDateRange
}: types.processedRetainerPlans): types.supportProjectData => {
  const supportData = getProjectData([`${SUPPORT_ID}`], { ...supportDateRange });
  return {
    sheetEntries: sheetEntries,
    fromDates: fromDates,
    toDates: toDates,
    supportData: supportData
  };
};

const fetchDataInCustomerProjects = ({
  sheetEntries,
  fromDates,
  toDates,
  supportData
}: types.supportProjectData): types.customerProjectData => ({
  customerData: sheetEntries.map((e, i) =>
    getProjectData(e.projects, { min: fromDates[i], max: toDates[i] })
  ),
  supportData: supportData,
  sheetEntries: sheetEntries
});

const blendTasksAndTime = ({
  timeData,
  taskData
}: types.projectData): types.blendedTaskObject[] => {
  Logger.log(`I have ${timeData.length} entries to sort for project ${timeData[0].id}`);
  const blendedObjects = taskData.map(t => {
    const blendedObject = {
      projectId: t['project-id'],
      taskTitle: t['content'],
      taskId: t.id,
      completed: t.completed,
      timeEntries: timeData.filter(m => {
        return t.id == parseFloat(m['parentTaskId']);
      })
    };
    Logger.log(
      `fetched ${blendedObject.timeEntries.length} time entries for task ${blendedObject.taskId}`
    );
    return blendedObject;
  });
  return blendedObjects;
};

const makeTaskObjects = ({
  customerData,
  supportData,
  sheetEntries
}: types.customerProjectData): {
  customerData: types.blendedTaskObject[][];
  supportData: types.blendedTaskObject[];
  sheetEntries: types.supportPackInfo[];
} => {
  const cD = customerData.map(t => blendTasksAndTime(t));
  const sD = blendTasksAndTime(supportData);
  const taskObjects = {
    sheetEntries: sheetEntries,
    customerData: cD,
    supportData: sD
  };
  Logger.log(
    `${taskObjects.customerData.length} customer projects and ${
      taskObjects.supportData.length
    } support tasks`
  );
  return taskObjects;
};

const filterSupportDataByTla = (
  data: types.blendedTaskObject[],
  tla: string
): types.blendedTaskObject[] => {
  const test = new RegExp(`^${tla}`);
  const matches = data.filter(d => d.taskTitle.match(test));
  Logger.log(`matched ${matches.length} support projects to ${tla}`);
  return matches;
};

const filterSupportDataIntoCustomerData = ({
  sheetEntries,
  customerData,
  supportData
}: {
  sheetEntries: types.supportPackInfo[];
  customerData: types.blendedTaskObject[][];
  supportData: types.blendedTaskObject[];
}): { sheetEntries: types.supportPackInfo[]; customerData: types.blendedTaskObject[][] } => {
  const filteredData = sheetEntries.map((e, i) =>
    customerData[i].concat(filterSupportDataByTla(supportData, e.tla))
  );
  const data = {
    sheetEntries: sheetEntries,
    customerData: filteredData
  };
  return data;
};

const appendTlaToTasks = ({
  customerData,
  sheetEntries
}: {
  customerData: types.blendedTaskObject[][];
  sheetEntries: types.supportPackInfo[];
}): types.blendedTaskTlaObject[][] =>
  sheetEntries.map((e, i) => customerData[i].map(d => ({ ...d, tla: e.tla })));

const flattenCustomerData = <T>(data: T[][]): T[] => data.reduce((a, i) => a.concat(i), []);

const sortTimeEntry = ({
  timeEntries,
  ...taskInfo
}: types.blendedTaskTlaObject): types.taskSummary => ({
  ...taskInfo,
  ...sumTimeInHrs(timeEntries)
});

const sortTimeEntries = (data: types.blendedTaskTlaObject[]): types.taskSummary[] => {
  const sort = data.map(d => sortTimeEntry(d));
  return sort;
};

const makeRowArray = (taskSummaries: types.taskSummary[]): types.sheetDataRow[] => {
  const tasks = taskSummaries.map((t, i) => [
    i + 1,
    t.projectId,
    t.taskId,
    t.tla,
    t.billableHrs,
    t.nonBillableHrs,
    t.totalHrs,
    t.completed,
    t.taskTitle
  ]);
  return tasks;
};

const buildRetainerData = (): types.sheetDataRow[] =>
  pipe(
    fetchAllDataFromSupportProjects,
    fetchDataInCustomerProjects,
    makeTaskObjects,
    filterSupportDataIntoCustomerData,
    appendTlaToTasks,
    flattenCustomerData,
    sortTimeEntries,
    makeRowArray
  )(fetchAndProcessRetainerPlans());

global.refreshData = () => {
  refreshSheetData(buildRetainerData());
};
/*
const BROKEN_concatenateSheetArrays = (
  
  global.refreshDataSheet = () => {
  const sheetEntries = getInitialData();
  const fromDates = sheetEntries.map(p => parseInt(p.fromDate));
  const toDates = sheetEntries.map(p => parseInt(p.toDate));
  const supportDateRange = getMinAndMax([...fromDates, ...toDates]);
  const supportData = getProjectData([`${SUPPORT_ID}`], { ...supportDateRange });
  const combinedData = sheetEntries.reduce((a, e, i) => {
    Logger.log(`${e.tla} -> from ${fromDates[i]} to ${toDates[i]}`);
    const projectData = getProjectData(e.projects, { min: fromDates[i], max: toDates[i] });
    const customerProjectData = makeTaskArray(projectData, e.tla);
    const supportProjectData = makeTaskArray(filterSupportData(supportData, e.tla), e.tla);
    Logger.log(`project data is ${JSON.stringify(customerProjectData, null, 4)}`);
    return a.concat(customerProjectData).concat(supportProjectData);
  }, []);
  Logger.log(`combined data is ${combinedData}`);
  const indexedData = combinedData.map((d, i) => [i, ...d]);
  refreshSheetData(indexedData);
});*/

/*
const makeTaskArray = (
  {
    timeData,
    taskData
  }: {
    timeData: types.timeEntry[];
    taskData: types.taskEntry[];
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
};*/
