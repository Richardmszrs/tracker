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
import { exportEntries } from "@/main/ipc/export";
import { settingsGet, settingsUpdate } from "@/main/ipc/settings";
import { idleDiscardTime } from "@/main/ipc/idle";
import {
  authSignIn,
  authSignUp,
  authSignOut,
  authGetUser,
} from "@/main/ipc/auth";
import {
  syncGetStatus,
  syncTrigger,
  syncUpdateFrequency,
  syncUpdateOnFocus,
  syncGetSettings,
} from "@/main/ipc/sync";
import {
  invoiceCreate,
  invoiceDelete,
  invoiceGet,
  invoiceGetNextNumber,
  invoiceGetUnbilledEntries,
  invoiceList,
  invoiceUpdate,
} from "@/main/ipc/invoices";
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
    export: exportEntries,
  },
  settings: {
    get: settingsGet,
    update: settingsUpdate,
  },
  idle: {
    discardTime: idleDiscardTime,
  },
  timer: {
    start: timerStart,
    stop: timerStop,
    getState: timerGetState,
  },
  auth: {
    signIn: authSignIn,
    signUp: authSignUp,
    signOut: authSignOut,
    getUser: authGetUser,
  },
  sync: {
    getStatus: syncGetStatus,
    trigger: syncTrigger,
    updateFrequency: syncUpdateFrequency,
    updateOnFocus: syncUpdateOnFocus,
    getSettings: syncGetSettings,
  },
  invoices: {
    create: invoiceCreate,
    list: invoiceList,
    get: invoiceGet,
    update: invoiceUpdate,
    delete: invoiceDelete,
    getNextNumber: invoiceGetNextNumber,
    getUnbilledEntries: invoiceGetUnbilledEntries,
  },
};
