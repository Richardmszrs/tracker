import {
  clientCreate,
  clientDelete,
  clientList,
  clientUpdate,
} from "@/main/ipc/clients";
import {
  entryCreate,
  entryDelete,
  entryList,
  entryUpdate,
} from "@/main/ipc/entries";
import {
  projectCreate,
  projectDelete,
  projectList,
  projectUpdate,
} from "@/main/ipc/projects";
import { tagCreate, tagDelete, tagList } from "@/main/ipc/tags";
import { timerGetState, timerStart, timerStop } from "@/main/ipc/timer";
import { app } from "./app";
import { shell } from "./shell";
import { theme } from "./theme";
import { window } from "./window";

export const router = {
  theme,
  window,
  app,
  shell,
  projects: {
    create: projectCreate,
    list: projectList,
    update: projectUpdate,
    delete: projectDelete,
  },
  clients: {
    create: clientCreate,
    list: clientList,
    update: clientUpdate,
    delete: clientDelete,
  },
  tags: {
    create: tagCreate,
    list: tagList,
    delete: tagDelete,
  },
  entries: {
    create: entryCreate,
    list: entryList,
    update: entryUpdate,
    delete: entryDelete,
  },
  timer: {
    start: timerStart,
    stop: timerStop,
    getState: timerGetState,
  },
};
