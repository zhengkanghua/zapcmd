export type DropdownVariant = "default" | "ghost";

export interface DropdownOption {
  value: string;
  label: string;
  description?: string;
  meta?: string;
}
