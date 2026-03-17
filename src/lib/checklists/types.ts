export interface SOPOption {
  id: string;
  title: string;
  content: any;
}

export interface PreviewItem {
  text: string;
  required: boolean;
}

export const RECURRENCE_OPTIONS = [
  { value: "none", label: "No recurrence" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "quarterly", label: "Quarterly" },
  { value: "annual", label: "Annual" },
];
