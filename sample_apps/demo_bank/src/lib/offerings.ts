export type OfferingCategory = "account" | "credit_card" | "debit_card" | "loan" | "investment" | "insurance";

export type Offering = {
  id: string;
  category: OfferingCategory;
  title: string;
  tagline: string;
  description: string;
  cta: string;
  accent: string;
  highlights: string[];
  details: { label: string; value: string }[];
};

export const offerings: Offering[] = [
  {
    id: "cc_cash_rewards",
    category: "credit_card",
    title: "DemoBank Cash Rewards",
    tagline: "Earn 3% cash back where you spend most.",
    description:
      "Choose your 3% category each month — gas, dining, online shopping, travel, drug stores, or home improvement — plus 2% at grocery stores and 1% on everything else.",
    cta: "Apply now",
    accent: "from-indigo-600 to-indigo-900",
    highlights: [
      "$200 online cash rewards bonus after $1,000 in purchases",
      "No annual fee",
      "0% intro APR for 15 billing cycles on purchases",
    ],
    details: [
      { label: "Annual fee", value: "$0" },
      { label: "Intro APR", value: "0% for 15 billing cycles" },
      { label: "Regular APR", value: "18.24% – 28.24% Variable" },
      { label: "Rewards rate", value: "1% – 3% cash back" },
    ],
  },
  {
    id: "cc_travel",
    category: "credit_card",
    title: "DemoBank Travel Elite",
    tagline: "Unlimited 2x points on travel and dining.",
    description:
      "Rack up points on the trips you already take, redeem for statement credits toward travel, and enjoy no foreign transaction fees when you're abroad.",
    cta: "Learn more",
    accent: "from-slate-700 to-slate-900",
    highlights: [
      "60,000 online bonus points after $3,000 in purchases",
      "No foreign transaction fees",
      "Trip cancellation & lost-luggage protection",
    ],
    details: [
      { label: "Annual fee", value: "$95" },
      { label: "Regular APR", value: "20.24% – 27.24% Variable" },
      { label: "Rewards rate", value: "1.5x – 2x points" },
      { label: "Foreign tx fee", value: "None" },
    ],
  },
  {
    id: "cc_student",
    category: "credit_card",
    title: "Student Cash Back",
    tagline: "Build credit while earning on every purchase.",
    description:
      "Designed for college students. Earn 1.5% cash back on all purchases with tools that help you track and grow your credit history responsibly.",
    cta: "Apply now",
    accent: "from-emerald-600 to-emerald-900",
    highlights: [
      "No annual fee",
      "FICO score access, updated monthly",
      "$100 statement credit after $1,000 in purchases",
    ],
    details: [
      { label: "Annual fee", value: "$0" },
      { label: "Regular APR", value: "19.24% – 29.24% Variable" },
      { label: "Rewards rate", value: "1.5% cash back" },
    ],
  },
  {
    id: "current",
    category: "account",
    title: "DemoBank Everyday Checking",
    tagline: "Simple everyday banking with no surprises.",
    description:
      "A full-featured checking account with early direct deposit, mobile check deposit, Zelle®, and real-time spending alerts. Manage your money confidently from anywhere.",
    cta: "Open checking account",
    accent: "from-blue-600 to-blue-900",
    highlights: [
      "No monthly maintenance fee with qualifying direct deposit",
      "Early direct deposit up to 2 days sooner",
      "Mobile check deposit and bill pay",
      "Access to 16,000+ fee-free ATMs",
    ],
    details: [
      { label: "Monthly fee", value: "$0 with qualifying direct deposit" },
      { label: "Minimum opening deposit", value: "$25" },
      { label: "ATM network", value: "16,000+ nationwide" },
      { label: "Overdraft protection", value: "Available" },
    ],
  },
  {
    id: "savings",
    category: "account",
    title: "DemoBank High-Yield Savings",
    tagline: "Grow your savings with competitive interest.",
    description:
      "Earn a competitive APY while keeping your money accessible. Set savings goals, automate transfers, and watch your balance grow.",
    cta: "Open savings account",
    accent: "from-sky-600 to-sky-900",

    highlights: [
      "4.25% APY on eligible balances",
      "No monthly maintenance fee",
      "Automatic recurring transfers",
      "FDIC insured up to applicable limits",
    ],

    details: [
      { label: "APY", value: "Up to 4.25%" },
      { label: "Monthly fee", value: "$0" },
      { label: "Minimum opening deposit", value: "$25" },
      { label: "Withdrawals", value: "Unlimited online transfers" },
    ]
  },
  {
    id: "dc_everyday",
    category: "debit_card",
    cta: "Open account",
    accent: "from-blue-600 to-blue-900",
    title: "Everyday Debit Card",
    tagline: "Secure, contactless spending wherever you go.",
    description:
      "Included with every DemoBank Everyday Checking account. Enjoy tap-to-pay, instant transaction alerts, digital wallet support, and powerful card controls from the mobile app.",
    highlights: [
      "Contactless payments worldwide",
      "Apple Pay, Google Pay & Samsung Wallet",
      "Instant card freeze/unfreeze",
      "Zero liability fraud protection",
    ],
    details: [
      { label: "Annual fee", value: "$0" },
      { label: "ATM access", value: "16,000+ fee-free ATMs" },
      { label: "Digital wallet", value: "Supported" },
      { label: "Replacement card", value: "Free standard replacement" },
    ]
  },
  {
    id: "dc_advantage",
    category: "debit_card",
    cta: "See benefits",
    accent: "from-purple-600 to-purple-900",
    title: "Advantage Platinum Debit",
    tagline: "Premium banking with elevated everyday benefits.",

    description:
      "Designed for Advantage Relationship clients. Receive premium travel benefits, higher withdrawal limits, dedicated customer support, and worldwide ATM fee reimbursements.",

    highlights: [
      "Worldwide ATM fee reimbursements",
      "Higher daily withdrawal limits",
      "Priority customer support",
      "Travel and purchase protection benefits",
    ],

    details: [
      { label: "Annual fee", value: "$0 with Advantage Relationship" },
      { label: "Relationship requirement", value: "$20,000 combined balances" },
      { label: "ATM reimbursements", value: "Worldwide" },
      { label: "Support", value: "24/7 Priority" },
    ]
  },
  {
    id: "ln_personal",
    category: "loan",
    title: "Personal Loan",
    tagline: "Borrow $2k–$50k with fixed rates from 7.99% APR.",
    description:
      "A fixed-rate personal loan for consolidating debt, home improvements, or unexpected expenses. No collateral required, no prepayment penalty.",
    cta: "Check my rate",
    accent: "from-orange-500 to-red-700",
    highlights: [
      "Fixed rates from 7.99% – 24.99% APR",
      "Terms from 24 to 84 months",
      "No prepayment penalty",
    ],
    details: [
      { label: "Loan range", value: "$2,000 – $50,000" },
      { label: "APR range", value: "7.99% – 24.99%" },
      { label: "Term", value: "24 – 84 months" },
      { label: "Origination fee", value: "0% – 6%" },
    ],
  },
  {
    id: "ln_mortgage",
    category: "loan",
    title: "Home Mortgage",
    tagline: "30-year fixed rates starting at 6.25% APR.",
    description:
      "Get preapproved in minutes. Explore fixed and adjustable-rate mortgages, jumbo loans, and first-time homebuyer programs.",
    cta: "Get preapproved",
    accent: "from-teal-600 to-teal-900",
    highlights: [
      "Preapproval in as little as 10 minutes",
      "First-time buyer assistance programs",
      "Track your application from your phone",
    ],
    details: [
      { label: "30yr fixed APR", value: "from 6.25%" },
      { label: "15yr fixed APR", value: "from 5.50%" },
      { label: "Loan types", value: "Conventional, FHA, VA, Jumbo" },
    ],
  },
  {
    id: "ln_auto",
    category: "loan",
    title: "Auto Loan",
    tagline: "Financing for new, used, and refinance.",
    description:
      "Competitive rates for new and used vehicles, with no prepayment penalty and terms up to 75 months. Preapproval doesn't affect your credit score.",
    cta: "Apply now",
    accent: "from-amber-600 to-amber-800",
    highlights: [
      "New auto APR from 6.49%",
      "Preapproval with no impact to credit",
      "Terms up to 75 months",
    ],
    details: [
      { label: "New auto APR", value: "from 6.49%" },
      { label: "Used auto APR", value: "from 6.79%" },
      { label: "Term", value: "12 – 75 months" },
    ],
  },
  {
    id: "inv_selfdirected",
    category: "investment",
    title: "Self-Directed Investing",
    tagline: "$0 online stock and ETF trades.",
    description:
      "Build your own portfolio with $0 commission online stock and ETF trades, fractional shares, and powerful research tools.",
    cta: "Start investing",
    accent: "from-cyan-600 to-blue-900",
    highlights: [
      "$0 online stock & ETF trades",
      "Fractional shares from $1",
      "In-depth research and screeners",
    ],
    details: [
      { label: "Account minimum", value: "$0" },
      { label: "Stock/ETF commission", value: "$0" },
      { label: "Options", value: "$0.65 per contract" },
    ],
  },
  {
    id: "inv_guided",
    category: "investment",
    title: "Guided Portfolios",
    tagline: "Professionally managed portfolios.",
    description:
      "A digital advisor that builds and rebalances a diversified portfolio for you based on your goals, timeline, and risk tolerance.",
    cta: "Learn more",
    accent: "from-violet-600 to-violet-900",
    highlights: [
      "Automatic rebalancing",
      "Tax-smart withdrawal planning",
      "0.45% advisory fee",
    ],
    details: [
      { label: "Account minimum", value: "$1,000" },
      { label: "Advisory fee", value: "0.45% / year" },
    ],
  },
  {
    id: "inv_retirement",
    category: "investment",
    title: "Retirement (IRA)",
    tagline: "Traditional and Roth IRAs.",
    description:
      "Open a Traditional or Roth IRA with a wide range of investment options — stocks, ETFs, mutual funds, and bonds — to help build your retirement.",
    cta: "Open an IRA",
    accent: "from-rose-600 to-rose-900",
    highlights: [
      "Traditional, Roth, and Rollover IRAs",
      "Tax-advantaged growth",
      "Wide range of investment choices",
    ],
    details: [
      { label: "Account minimum", value: "$0" },
      { label: "2026 contribution limit", value: "$7,000 ($8,000 if 50+)" },
    ],
  },
  {
    id: "ins_life",
    category: "insurance",
    title: "Term Life Insurance",
    tagline: "Affordable coverage from $15/month.",
    description:
      "Term life coverage from trusted underwriters. Get a personalized quote in 60 seconds — no medical exam required for many applicants.",
    cta: "Get a quote",
    accent: "from-sky-600 to-sky-900",
    highlights: [
      "Coverage from $100k to $2M",
      "10, 20, or 30-year terms",
      "No medical exam for many applicants",
    ],
    details: [
      { label: "Coverage range", value: "$100,000 – $2,000,000" },
      { label: "Terms", value: "10 / 20 / 30 years" },
    ],
  },
  {
    id: "ins_auto",
    category: "insurance",
    title: "Auto Insurance",
    tagline: "Bundle with home and save up to 25%.",
    description:
      "Competitive auto insurance with 24/7 claims support. Bundle with a DemoBank home policy to unlock our best rates.",
    cta: "Get a quote",
    accent: "from-lime-700 to-emerald-900",
    highlights: [
      "Save up to 25% when you bundle",
      "24/7 claims support",
      "Accident forgiveness available",
    ],
    details: [
      { label: "Coverage", value: "Liability, collision, comprehensive" },
      { label: "Discounts", value: "Multi-policy, safe driver, good student" },
    ],
  },
  {
    id: "ins_home",
    category: "insurance",
    title: "Home Insurance",
    tagline: "Comprehensive home & belongings coverage.",
    description:
      "Protect your home and everything in it. Flexible deductibles, replacement-cost coverage, and optional add-ons for jewelry, electronics, and more.",
    cta: "Get a quote",
    accent: "from-fuchsia-600 to-fuchsia-900",
    highlights: [
      "Dwelling, personal property, and liability coverage",
      "Optional flood and earthquake add-ons",
      "24/7 claims support",
    ],
    details: [
      { label: "Coverage types", value: "Dwelling, property, liability" },
      { label: "Add-ons", value: "Flood, earthquake, valuables" },
    ],
  },
];

export function getOffering(id: string) {
  return offerings.find((o) => o.id === id);
}

/** Where an authenticated user should land after clicking "Apply". */
export function applyPathFor(category: OfferingCategory): string {
  switch (category) {
    case "account":
      return "/apply/account";
    case "loan":
      return "/loan";
    case "credit_card":
      return "/apply/card";
    case "debit_card":
      return "/apply/debit";
    case "investment":
      return "/apply/investment";
    case "insurance":
      return "/apply/insurance";
  }
}

export const categoryLabels: Record<OfferingCategory, string> = {
  credit_card: "Credit card",
  debit_card: "Debit card",
  account: "Account",
  loan: "Loan",
  investment: "Investment",
  insurance: "Insurance",
};