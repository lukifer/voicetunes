import * as fs from "fs";
import writtenNumber from "written-number";
import { NumberMap } from "../types";

const numberWords = (n: number, noAnd: boolean = true) => writtenNumber(n, {noAnd}).replace(/-/g, " ");

import config from "../config";
const { STARTING_YEAR } = config;

const currentYear = (new Date()).getFullYear();
const baseYears = [
  ...Array(currentYear - STARTING_YEAR + 1)
].map((_, n) => currentYear - n);

const years = baseYears.reduce((yrs, year) => {
  const century = Math.floor(year / 100);
  const subyear = year % 100;
  if(century === 20) {
    yrs[numberWords(year, true )] = year;
    yrs[numberWords(year, false)] = year;
  } else {
    if(subyear === 0) {
      yrs[`${numberWords(century)} hundred`] = year;
    }
  }
  if(subyear > 0 && subyear < 10) {
    yrs[`${numberWords(century)} oh ${numberWords(subyear)}`] = year;
  } else {
    yrs[`${numberWords(century)} ${numberWords(subyear)}`] = year;
  }
  return yrs;
}, {} as NumberMap);

fs.writeFileSync(
  `${__dirname}/years.json`,
  JSON.stringify(years, undefined, 2)
);
