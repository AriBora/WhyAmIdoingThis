import { offerings, type OfferingCategory } from "./offerings";

export type Holding = {
  id: string;
  offeringId: string;
  category: OfferingCategory;
  name: string;
  subtitle: string;
  primary: string; // headline value: balance, coverage, etc.
  secondary?: string; // sub-line under primary
  status: "active" | "pending" | "paid_off";
  accent: string;
};

export type Transaction = {
  id: number;
  name: string;
  date: string;
  amount: number;
  category: string;
};

export type MockUser = {
  id: string;
  name: string;
  email: string;
  memberSince: string;
  persona: string;
  holdings: Holding[];
  transactions: Transaction[];
};

const alexHoldings: Holding[] = [
  {
    id: "acct_checking",
    offeringId: "current",
    category: "account",
    name: "Current",
    subtitle: "•••• 4210",
    primary: "$12,847.63",
    secondary: "Available balance",
    status: "active",
    accent: "from-blue-600 to-blue-900",
  },
  {
    id: "acct_savings",
    offeringId: "savings",
    category: "account",
    name: "Savings",
    subtitle: "•••• 8821 · 4.25% APY",
    primary: "$34,209.10",
    secondary: "Available balance",
    status: "active",
    accent: "from-sky-600 to-sky-900",
  },
  {
    id: "debit_everyday",
    offeringId: "dc_everyday",
    category: "debit_card",
    name: "Everyday Debit Card",
    subtitle: "•••• 4210",
    primary: "Active",
    secondary: "Linked to Everyday Checking",
    status: "active",
    accent: "from-blue-600 to-blue-900",
  },
  {
    id: "card_cash",
    offeringId: "cc_cash_rewards",
    category: "credit_card",
    name: "Cash Rewards",
    subtitle: "•••• 1129 · Due Aug 3",
    primary: "$842.19",
    secondary: "Current balance · $8,000 limit",
    status: "active",
    accent: "from-indigo-600 to-indigo-900",
  },
  {
    id: "card_travel",
    offeringId: "cc_travel",
    category: "credit_card",
    name: "Travel Elite",
    subtitle: "•••• 7742 · 24,830 pts",
    primary: "$1,204.55",
    secondary: "Current balance · $15,000 limit",
    status: "active",
    accent: "from-slate-700 to-slate-900",
  },
  {
    id: "loan_auto",
    offeringId: "ln_auto",
    category: "loan",
    name: "Auto Loan",
    subtitle: "2023 Honda Civic · 42 of 60 mo",
    primary: "$8,412.00",
    secondary: "Remaining balance · $312/mo",
    status: "active",
    accent: "from-amber-600 to-amber-800",
  },
  {
    id: "inv_ira",
    offeringId: "inv_retirement",
    category: "investment",
    name: "Roth IRA",
    subtitle: "Retirement · YTD +8.4%",
    primary: "$41,208.77",
    secondary: "Market value",
    status: "active",
    accent: "from-rose-600 to-rose-900",
  },
];

const jamieHoldings: Holding[] = [
  {
    id: "j_checking",
    offeringId: "dc_everyday",
    category: "account",
    name: "Current",
    subtitle: "•••• 3095",
    primary: "$2,143.08",
    secondary: "Available balance",
    status: "active",
    accent: "from-blue-600 to-blue-900",
  },
  {
    id: "j_debit",
    offeringId: "dc_everyday",
    category: "debit_card",
    name: "Everyday Debit Card",
    subtitle: "•••• 3095",
    primary: "Active",
    secondary: "Linked to Everyday Checking",
    status: "active",
    accent: "from-blue-600 to-blue-900",
  },
  {
    id: "j_card_student",
    offeringId: "cc_student",
    category: "credit_card",
    name: "Student Cash Back",
    subtitle: "•••• 4402 · Due Aug 7",
    primary: "$318.44",
    secondary: "Current balance · $1,500 limit",
    status: "active",
    accent: "from-emerald-600 to-emerald-900",
  },
];

const priyaHoldings: Holding[] = [
  {
    id: "p_checking",
    offeringId: "dc_everyday",
    category: "account",
    name: "Advantage Checking",
    subtitle: "•••• 7781",
    primary: "$28,510.22",
    secondary: "Available balance",
    status: "active",
    accent: "from-blue-600 to-blue-900",
  },
  {
    id: "p_debit",
    offeringId: "dc_advantage",
    category: "debit_card",
    name: "Advantage Platinum Debit",
    subtitle: "•••• 7781",
    primary: "Active",
    secondary: "Premium Relationship",
    status: "active",
    accent: "from-purple-600 to-purple-900",
  },
  {
    id: "p_inv_guided",
    offeringId: "inv_guided",
    category: "investment",
    name: "Guided Portfolio",
    subtitle: "Growth · YTD +11.2%",
    primary: "$96,410.55",
    secondary: "Market value",
    status: "active",
    accent: "from-violet-600 to-violet-900",
  },
  {
    id: "p_inv_self",
    offeringId: "inv_selfdirected",
    category: "investment",
    name: "Self-Directed Brokerage",
    subtitle: "12 positions",
    primary: "$18,204.10",
    secondary: "Market value",
    status: "active",
    accent: "from-cyan-600 to-blue-900",
  },
  {
    id: "p_ins_home",
    offeringId: "ins_home",
    category: "insurance",
    name: "Home Insurance",
    subtitle: "Policy · renews Mar 2027",
    primary: "$450,000",
    secondary: "Dwelling coverage",
    status: "active",
    accent: "from-fuchsia-600 to-fuchsia-900",
  },
  {
    id: "p_ins_auto",
    offeringId: "ins_auto",
    category: "insurance",
    name: "Auto Insurance",
    subtitle: "2024 Tesla Model 3",
    primary: "$142/mo",
    secondary: "Full coverage · $500 deductible",
    status: "active",
    accent: "from-lime-700 to-emerald-900",
  },
];

const samHoldings: Holding[] = [
  {
    id: "s_checking",
    offeringId: "dc_everyday",
    category: "account",
    name: "Current",
    subtitle: "•••• 1002",
    primary: "$318.55",
    secondary: "Available balance",
    status: "active",
    accent: "from-blue-600 to-blue-900",
  },
  {
    id: "s_debit",
    offeringId: "dc_everyday",
    category: "debit_card",
    name: "Everyday Debit Card",
    subtitle: "•••• 1002",
    primary: "Active",
    secondary: "Linked to Everyday Checking",
    status: "active",
    accent: "from-blue-600 to-blue-900",
  },
];

const alexTx: Transaction[] = [
  { id: 1, name: "Whole Foods Market", date: "Jul 18", amount: -84.32, category: "Groceries" },
  { id: 2, name: "Paycheck — Acme Corp", date: "Jul 15", amount: 3420.0, category: "Income" },
  { id: 3, name: "Con Edison", date: "Jul 14", amount: -112.5, category: "Utilities" },
  { id: 4, name: "Auto loan payment", date: "Jul 12", amount: -312.0, category: "Loan" },
  { id: 5, name: "Transfer to Sarah K.", date: "Jul 11", amount: -250.0, category: "Transfer" },
  { id: 6, name: "Dividend — VTI", date: "Jul 09", amount: 42.19, category: "Investing" },
];

const jamieTx: Transaction[] = [
  { id: 1, name: "Chipotle", date: "Jul 19", amount: -14.85, category: "Dining" },
  { id: 2, name: "Campus bookstore", date: "Jul 17", amount: -128.4, category: "Education" },
  { id: 3, name: "Venmo from Mom", date: "Jul 16", amount: 200.0, category: "Transfer" },
  { id: 4, name: "Spotify", date: "Jul 14", amount: -5.99, category: "Subscription" },
];

const priyaTx: Transaction[] = [
  { id: 1, name: "Payroll — Meridian LLC", date: "Jul 20", amount: 8210.0, category: "Income" },
  { id: 2, name: "Home insurance premium", date: "Jul 18", amount: -184.0, category: "Insurance" },
  { id: 3, name: "Guided portfolio contribution", date: "Jul 15", amount: -2000.0, category: "Investing" },
  { id: 4, name: "Whole Foods Market", date: "Jul 14", amount: -212.44, category: "Groceries" },
  { id: 5, name: "Delta Airlines", date: "Jul 12", amount: -612.3, category: "Travel" },
];

const samTx: Transaction[] = [
  { id: 1, name: "Opening deposit", date: "Jul 20", amount: 300.0, category: "Deposit" },
  { id: 2, name: "Starbucks", date: "Jul 20", amount: -6.25, category: "Dining" },
];

export const users: MockUser[] = [
  {
    id: "u1",
    name: "Alex Morgan",
    email: "user1@example.com",
    memberSince: "2019",
    persona: "Full portfolio · needs insurance",
    holdings: alexHoldings,
    transactions: alexTx,
  },
  {
    id: "u2",
    name: "Jamie Chen",
    email: "user2@example.com",
    memberSince: "2024",
    persona: "Student · checking + starter card",
    holdings: jamieHoldings,
    transactions: jamieTx,
  },
  {
    id: "u3",
    name: "Priya Patel",
    email: "user3@example.com",
    memberSince: "2016",
    persona: "Investor · no credit cards or loans",
    holdings: priyaHoldings,
    transactions: priyaTx,
  },
  {
    id: "u4",
    name: "Sam Rivera",
    email: "user4@example.com",
    memberSince: "2026",
    persona: "Brand new · just opened checking",
    holdings: samHoldings,
    transactions: samTx,
  },
];

const STORAGE_KEY = "nb_user_id";

export function getCurrentUser(): MockUser {
  if (typeof window !== "undefined") {
    const id = window.localStorage.getItem(STORAGE_KEY);
    const match = users.find((u) => u.id === id);
    if (match) return match;
  }
  return users[0];
}

export function setCurrentUser(id: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(STORAGE_KEY, id);
}

export function clearCurrentUser() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(STORAGE_KEY);
}

export function ownedCategories(u: MockUser = getCurrentUser()): Set<OfferingCategory> {
  return new Set(u.holdings.map((h) => h.category));
}

/** Suggested offerings the user doesn't yet have, one per missing category
 *  plus a couple of upsells within owned categories. */
export function suggestedOfferings(u: MockUser = getCurrentUser()) {
  const owned = ownedCategories(u);
  const missing = offerings.filter((o) => !owned.has(o.category));
  const ownedOfferingIds = new Set(u.holdings.map((h) => h.offeringId));
  const upsells = offerings.filter(
    (o) => owned.has(o.category) && !ownedOfferingIds.has(o.id)
  );
  return { missing, upsells };
}