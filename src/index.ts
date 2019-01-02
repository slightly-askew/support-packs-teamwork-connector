import { getRange } from './sheets/index';
import { getDayFormat, testTLA, projectIDs } from './sheets/util';

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

global.fetchSheetData = () => Logger.log(`${getRange('B2:E')}`);

global.getInitialData = () => {
  const range = getRange('B2:E');
  Logger.log(range);
  const dataToProcess = {
    tla: range[0].toString(),
    projects: projectIDs(range[1].toString()),
    fromDate: getDayFormat(range[2]),
    toDate: getDayFormat(range[3])
  };
  Logger.log(`${dataToProcess}`);
};
