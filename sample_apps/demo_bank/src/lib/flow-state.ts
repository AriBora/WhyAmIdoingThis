// Simple in-memory state for multi-step flows. Prototype only.
export const transferState: { recipient: string; amount: string; note: string } = {
  recipient: "",
  amount: "",
  note: "",
};

export const loanState: {
  amount: string;
  purpose: string;
  purposeOther: string;
  employer: string;
  income: string;
  uploaded: boolean;
} = {
  amount: "",
  purpose: "",
  purposeOther: "",
  employer: "",
  income: "",
  uploaded: false,
};