export const getDayFormat = (date: any): string => {
  const test = /-|:|T/g;
  return date
    .toISOString()
    .substring(0, 19)
    .replace(test, '');
};

//test for matching the tla
export const testTLA = (tla: string): RegExp => new RegExp(`/[${tla}]\s/`);

//separate project IDs and return an array
export const projectIDs = (entries: string): string[] => entries.split(/\s/);

export const pipe = (...fns: any): any => x => fns.reduce((v, f) => f(v), x);
