import type { ChecklistItem, Finding, KeyTerm } from "./types";

const patterns: Array<{
  category: string;
  level: Finding["level"];
  title: string;
  expression: RegExp;
  detail: string;
}> = [
  {
    category: "Renewal",
    level: "attention",
    title: "Renewal language found",
    expression: /\b(auto(?:matic(?:ally)?)?[- ]renew(?:s|al|ed)?|renew(?:s|al|ed)? automatically|evergreen|successive terms?)\b/i,
    detail: "Check how the agreement renews, when notice is due, and whether renewal changes the price or terms.",
  },
  {
    category: "Termination",
    level: "attention",
    title: "Termination language found",
    expression: /\b(terminat(?:e|ion|ed)|cancel(?:lation)?|notice period|early termination|without cause)\b/i,
    detail: "Review who may end the agreement, the required notice, and any fees or continuing obligations.",
  },
  {
    category: "Liability",
    level: "review",
    title: "Liability or indemnity language found",
    expression: /\b(indemnif(?:y|ication)|hold harmless|limitation of liability|liable for|liability)\b/i,
    detail: "Consider what losses are covered, whether limits or exceptions apply, and whose responsibility is described.",
  },
  {
    category: "Fees & penalties",
    level: "attention",
    title: "Penalty or additional-fee language found",
    expression: /\b(penalt(?:y|ies)|late fee|liquidated damages|non[- ]refundable|forfeit(?:ure)?|fine)\b/i,
    detail: "Check what triggers the charge, how it is calculated, and whether the agreement explains any exceptions.",
  },
  {
    category: "Ambiguity",
    level: "informational",
    title: "Discretionary wording found",
    expression: /\b(sole discretion|reasonable efforts|as necessary|from time to time|materially|promptly)\b/i,
    detail: "This wording may leave room for interpretation. Check whether a specific standard or time frame is defined elsewhere.",
  },
  {
    category: "Payment",
    level: "informational",
    title: "Payment obligation found",
    expression: /\b(rent|monthly payment|installment|deposit|due date|payment shall|fee of)\b/i,
    detail: "Confirm the amount, due date, payment method, and any additional charges against the rest of the agreement.",
  },
];

const checklistPrompts = [
  "I understand every amount due and when it must be paid.",
  "I know what notice is required to end or renew this agreement.",
  "I have checked the responsibilities assigned to each party.",
  "I have asked about any wording that is unclear to me.",
];

function sentenceAround(text: string, index: number, length: number): string {
  const start = Math.max(text.lastIndexOf(".", index - 1), text.lastIndexOf("\n", index - 1)) + 1;
  const ends = [text.indexOf(".", index + length), text.indexOf("\n", index + length)].filter((n) => n >= 0);
  const end = ends.length ? Math.min(...ends) + 1 : text.length;
  return text.slice(start, end).trim().replace(/\s+/g, " ").slice(0, 480);
}

export function extractFindings(text: string): Finding[] {
  const findings: Finding[] = [];
  for (const rule of patterns) {
    const match = rule.expression.exec(text);
    if (!match || match.index === undefined) continue;
    const evidence = sentenceAround(text, match.index, match[0].length);
    if (!evidence) continue;
    findings.push({
      id: rule.category.toLowerCase().replace(/[^a-z]+/g, "-"),
      category: rule.category,
      level: rule.level,
      title: rule.title,
      detail: rule.detail,
      evidence,
    });
  }
  return findings;
}

export function extractKeyTerms(text: string): KeyTerm[] {
  const lines = text.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  const terms: KeyTerm[] = [];
  const money = /(?:[$€£]\s?\d[\d,.]*(?:\s?(?:per month|monthly|annually|per year|per annum))?|\b\d[\d,.]*\s?(?:USD|EUR|GBP|SEK|dollars?|euros?|pounds?)\b)/i.exec(text);
  if (money?.index !== undefined) {
    terms.push({ label: "Payment mention", value: money[0].trim(), evidence: sentenceAround(text, money.index, money[0].length) });
  }
  const duration = /\b(?:\d+|one|two|three|six|twelve)\s+(?:calendar\s+|business\s+)?(?:days?|weeks?|months?|years?)\b/i.exec(text);
  if (duration?.index !== undefined) {
    terms.push({ label: "Time period", value: duration[0], evidence: sentenceAround(text, duration.index, duration[0].length) });
  }
  const date = /\b(?:\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}(?:,\s*\d{4})?)\b/i.exec(text);
  if (date?.index !== undefined) {
    terms.push({ label: "Date mention", value: date[0], evidence: sentenceAround(text, date.index, date[0].length) });
  }
  const labels = ["effective date", "start date", "term", "agreement date", "landlord", "tenant", "employer", "employee", "client", "contractor", "service provider"];
  for (const label of labels) {
    const line = lines.find((candidate) => candidate.toLowerCase().startsWith(`${label}:`) || candidate.toLowerCase().startsWith(`${label} -`));
    if (!line) continue;
    const [key, ...rest] = line.split(/:|\s-\s/);
    const value = rest.join(":").trim();
    if (value) terms.push({ label: key.trim().replace(/\b\w/g, (character) => character.toUpperCase()), value: value.slice(0, 120), evidence: line.slice(0, 480) });
  }
  return terms.slice(0, 8);
}

export function makeChecklist(): ChecklistItem[] {
  return checklistPrompts.map((text, index) => ({ id: `item-${index + 1}`, text, checked: false }));
}

export function findEvidence(text: string, question: string): string[] {
  const terms = question.toLowerCase().match(/[a-z0-9]{3,}/g) ?? [];
  const uniqueTerms = [...new Set(terms)];
  if (uniqueTerms.length === 0) return [];
  return text.split(/(?<=[.!?])\s+|\n+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence && uniqueTerms.some((term) => sentence.toLowerCase().includes(term)))
    .slice(0, 4);
}