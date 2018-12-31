import { SheetService } from './sheet.service';

declare var global: any;

global.createNewFile = (): void => {
  const ss = SheetService.createInitialFile('New file');
  ss.getRange('A2').setValue('Happy gas!');
};

global.onOpen = () => {
  var ui = SpreadsheetApp.getUi();
  ui.createMenu('Teamwork data')
    .addItem('Refresh Teamwork Data', 'refreshData')
    .addToUi();
};

global.refreshData = () => {
  Browser.msgBox('Teamwork data coming soon');
};
