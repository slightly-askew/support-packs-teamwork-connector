export const getRange = range => {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getRange(range).getValues();
  return data;
};

export const refreshSheetData = (data: any[]) => {
  const dataRowStart = 2;
  const dataLength = data.length;
  const ss = SpreadsheetApp.getActive();
  const sheet = ss.getSheetByName('data');
  const lastOldRow = sheet.getLastRow();
  sheet.deleteRows(dataRowStart, lastOldRow - dataRowStart);
  sheet.insertRows(dataRowStart, dataLength);
  const range = sheet.getRange(`A${dataRowStart}: I${dataLength + dataRowStart - 1}`);
  return range.setValues(data);
};
