export const getRange = range => {
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName('Retainers');
  const data = sheet.getRange(range).getValues();
  return data;
};

export const refreshSheetData = (data: any[]) => {
  const headerRows = 1;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName('data');
  const lastOldRow = sheet.getMaxRows();
  if (lastOldRow > headerRows) {
    sheet.deleteRows(headerRows + 1, lastOldRow - headerRows);
  }
  sheet.insertRowsAfter(headerRows, data.length);
  const lastNewRow = sheet.getMaxRows();
  return sheet.getRange(headerRows + 1, 1, data.length, data[0].length).setValues(data);
};
