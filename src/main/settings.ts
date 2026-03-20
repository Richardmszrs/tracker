import Store from "electron-store";

export interface AppSettings {
  idleThresholdMinutes: number;
  defaultBillable: boolean;
  weekStartsOn: 0 | 1;
  currencySymbol: string;
  theme: "light" | "dark" | "system";
  onboardingComplete: boolean;
}

const defaults: AppSettings = {
  idleThresholdMinutes: 5,
  defaultBillable: true,
  weekStartsOn: 1,
  currencySymbol: "$",
  theme: "system",
  onboardingComplete: false,
};

export const settingsStore = new Store<AppSettings>({
  name: "settings",
  defaults,
});
