/** Landing copy — conversion framework, concrete product language */

export const trustBadges = [
  { label: "Live debates" },
  { label: "Trade mid-match" },
  { label: "Clear finish" },
];

export const problems = [
  {
    key: "boring",
    title: "Markets feel dead",
    body: "You stare at a yes/no chart with no story. There is nothing to watch, so you leave.",
    fix: "With MultiMarkets: every market is a live character match.",
  },
  {
    key: "timing",
    title: "You bet in the dark",
    body: "News and vibes move the price. You never see the argument that actually changes minds.",
    fix: "With MultiMarkets: trade while the debate is still unfolding.",
  },
  {
    key: "generic",
    title: "AI chat is not a market",
    body: "A chatbot can roleplay. It cannot host a fair match, a clear question, and a real payout path.",
    fix: "With MultiMarkets: match, market, and result in one room.",
  },
];

export const solutions = [
  {
    key: "match",
    metric: "2 characters",
    title: "Live match",
    description:
      "Pick two voices and a topic. They take turns, stay on the question, and you see every line.",
    icon: "solar:users-group-rounded-linear",
  },
  {
    key: "trade",
    metric: "Yes or No",
    title: "Trade the room",
    description:
      "The match is the market. Buy yes or no as the conversation swings, not after it freezes.",
    icon: "solar:chart-2-linear",
  },
  {
    key: "settle",
    metric: "Clear close",
    title: "A real finish",
    description:
      "When the match ends, the result settles from the full debate. No vague “AI vibes.”",
    icon: "solar:shield-check-linear",
  },
];

export const differentiators = [
  {
    key: "vs-books",
    title: "Not just another order book",
    body: "Polymarket-style charts show price. MultiMarkets shows the fight that moves the price.",
  },
  {
    key: "vs-chat",
    title: "Not a chatbot playground",
    body: "You get a referee, two locked characters, a binary question, and a market on the outcome.",
  },
  {
    key: "vs-watch",
    title: "Built to watch and trade",
    body: "Follow every turn live, then move on the question while the match is still open.",
  },
];

export const steps = [
  {
    n: "01",
    t: "Connect",
    d: "Link your wallet when you want to trade. Watching is free.",
  },
  {
    n: "02",
    t: "Pick two characters",
    d: "Choose voices that clash. That tension is the product.",
  },
  {
    n: "03",
    t: "Set the bet",
    d: "Write a yes/no question people can argue and trade.",
  },
  {
    n: "04",
    t: "Watch and trade",
    d: "Follow the match live. Move as the story shifts.",
  },
];

/** Kept for feature-card bento compatibility */
export const features = solutions.map((s) => ({
  key: s.key,
  title: s.title,
  description: s.description,
  icon: s.icon,
  metric: s.metric,
}));

export const metrics = [
  { label: "Format", value: "Live match" },
  { label: "Market", value: "Yes / No" },
  { label: "Action", value: "Trade mid-debate" },
  { label: "Network", value: "HashKey" },
];

export const faqs = [
  {
    q: "Do I need a wallet to watch?",
    a: "No. You can open a room and follow the debate without connecting. Connect when you want to trade.",
  },
  {
    q: "What am I betting on?",
    a: "A clear yes/no question about the match. The debate is the evidence. The market is the bet.",
  },
  {
    q: "Who is in each match?",
    a: "Two characters you pick (or create). A referee keeps turns fair and on topic.",
  },
  {
    q: "How does a match end?",
    a: "After the turn limit or when the room closes. The result settles from the full conversation.",
  },
  {
    q: "What network is this on?",
    a: "HashKey. Connect on the test network when you’re ready to trade.",
  },
];

export const navLinks = [
  { name: "Problem", href: "#problem" },
  { name: "How it works", href: "#how" },
  { name: "Arenas", href: "/rooms" },
  { name: "Markets", href: "/markets" },
];
