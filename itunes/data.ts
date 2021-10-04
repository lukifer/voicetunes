import {
  EntityFilter,
  iTunesSubstitutions,
} from "./types";

import config from "../config";
const {
  FILTER_DENY: filter_deny,
  FILTER_ONLY: filter_only,
  SUBSTITUTIONS: substitutions,
} = config;

const customFilters = {
  filter_deny,
  filter_only,
  substitutions,
}

const filterKeys = ["albums", "artists", "genres", "playlists", "tracks"];
const readFilters = (filterType: string, empty: [] | {}) => {
  return filterKeys.reduce((acc, k) => ({ [k]: empty, ...acc }), customFilters[filterType]);
};

export const substitutionsJson = (): iTunesSubstitutions => readFilters("substitutions", {});
export const filterDenyJson    = (): EntityFilter        => readFilters("filter_deny",   []);
export const filterOnlyJson    = (): EntityFilter        => readFilters("filter_only",   []);

export default {
  filterDenyJson,
  filterOnlyJson,
  substitutionsJson,
}
