import { getRange } from './sheets/index';
import { getDayFormat, testTLA, projectIDs } from './sheets/util';
import { getProjectTasks, getProjectTime, TAGS } from './constants';
import { makeQueryString, makeHttpGetRequest } from './server/http';
import { TEAMWORK_KEY } from './key';
//The above file (key.js) needs to be added manually to /src folder.
//Do not under any circumstance check this file into version control.
//It is ignored in .gitignore

declare var global: any;

global.onOpen = () => {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Teamwork data')
    .addItem('Refresh Teamwork Data', 'refreshData')
    .addToUi();
};

global.refreshData = () => {
  Browser.msgBox('Teamwork data coming soon');
};

global.getInitialData = () => {
  const range = getRange('C2:F');
  const dataToProcess = range.map(r => ({
    tla: r[0].toString(),
    projects: projectIDs(r[1].toString()),
    fromDate: getDayFormat(r[2]),
    toDate: getDayFormat(r[3])
  }));
  Logger.log(JSON.stringify(dataToProcess, null, 4));
};

const getNumberValues = obj => {
  for (const v in obj) return parseInt(obj[v]);
};

const getTimeData = (id: number) => {
  const params = { taskTagIds: getNumberValues(TAGS) };
  return makeHttpGetRequest(getProjectTime(id), params, TEAMWORK_KEY)['time-entries'];
};

global.sampleTimeData = () => Logger.log(getTimeData(321525).map(t => JSON.stringify(t, null, 4)));

const getTaskData = (id: number) => {
  const params = { 'task-ids': getNumberValues(TAGS) };
  return makeHttpGetRequest(getProjectTasks(id), params, TEAMWORK_KEY)['todo-items'];
};

global.sampleTaskData = () => Logger.log(getTaskData(321525).map(t => JSON.stringify(t, null, 4)));

const processTimeInHrs = (hrs, mins, roundUpToMins = 15) =>
  (Math.ceil((hrs * 60 + mins) / roundUpToMins) * (hrs * 60 + mins)) / roundUpToMins / 60;
