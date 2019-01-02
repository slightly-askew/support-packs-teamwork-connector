export const getRange = range => {
  const sheet = SpreadsheetApp.getActiveSheet();
  const data = sheet.getRange(range).getValues();
  return data;
};
