import { TEAMWORK_KEY } from '../key';

export const makeQueryString = (url, params = {}) => {
  const paramString = Object.keys(params)
    .map(key => `${encodeURIComponent(key)}=${params[key]}`)
    .join('&');
  return url + (url.indexOf('?') >= 0 ? '&' : '?') + paramString;
};

export const makeHttpGetRequest = (apiUrl, params, accessToken) => {
  const url = makeQueryString(apiUrl, params);
  const response = UrlFetchApp.fetch(url, {
    headers: {
      Authorization: `${TEAMWORK_KEY}`
    },
    muteHttpExceptions: true
  });
  return JSON.parse(response.toString());
};
