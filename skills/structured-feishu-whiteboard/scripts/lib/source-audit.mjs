function normalizedText(value) {
  return String(value || "")
    .replace(/```[\s\S]*?```/g, (block) => block.replace(/```[^\n]*\n?|```/g, ""))
    .replace(/https?:\/\/\S+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function numericSignals(value) {
  const text = normalizedText(value)
    .replace(/,/g, "")
    .replace(/小时|hr|hrs/gi, "h")
    .replace(/分钟|min/gi, "m")
    .replace(/秒/gi, "s")
    .replace(/\s+/g, "");
  const signals = new Set();
  const pattern = /(?:[<>≤≥+~-]\s*)?\d+(?:\.\d+)?(?:\s*[-~至]\s*\d+(?:\.\d+)?)?\s*(?:%|人|次|项|类|个|级|万|亿|h|m|s|day|天|周|月|年)?/gi;
  for (const match of text.matchAll(pattern)) {
    const signal = match[0].replace(/\s+/g, "").toLowerCase();
    if (!signal || /^\d{1,2}$/.test(signal)) continue;
    if (/^(?:19|20)\d{2}年?$/.test(signal)) continue;
    signals.add(signal);
  }
  return [...signals];
}

function minimumFacts(characterCount) {
  if (characterCount < 280) return 2;
  if (characterCount < 700) return 5;
  if (characterCount < 1400) return 8;
  if (characterCount < 2800) return 12;
  if (characterCount < 5600) return 16;
  return 20;
}

export function analyzeSource(sourceText) {
  const normalized = normalizedText(sourceText);
  const paragraphs = String(sourceText || "").split(/\n\s*\n|(?=^#{1,6}\s+)/m).map((part) => normalizedText(part)).filter((part) => part.length >= 8);
  const sentences = normalized.split(/[。！？!?；;]+/).map((part) => part.trim()).filter((part) => part.length >= 6);
  return {
    characterCount: normalized.replace(/\s/g, "").length,
    paragraphCount: paragraphs.length,
    sentenceCount: sentences.length,
    numericSignals: numericSignals(normalized),
  };
}

export function auditSourceExtraction({ sourceText, inventory }) {
  const source = analyzeSource(sourceText);
  const facts = Array.isArray(inventory?.facts) ? inventory.facts : [];
  const factText = facts.map((fact) => `${fact.text || ""} ${fact.value ?? ""}`).join(" ");
  const capturedNumbers = new Set(numericSignals(factText));
  const sourceNumbers = source.numericSignals;
  const recalledNumbers = sourceNumbers.filter((signal) => capturedNumbers.has(signal));
  const requiredFacts = minimumFacts(source.characterCount);
  const requiredTypes = requiredFacts >= 8 ? 3 : requiredFacts >= 5 ? 2 : 1;
  const typeCount = new Set(facts.map((fact) => fact.type)).size;
  const importantCount = facts.filter((fact) => ["critical", "high"].includes(fact.importance)).length;
  const requiredImportant = Math.min(8, Math.max(2, Math.ceil(requiredFacts * 0.5)));
  const requiredNumericRecall = Math.min(3, sourceNumbers.length);
  const normalizedSource = normalizedText(sourceText);
  const quotedFacts = facts.filter((fact) => String(fact.sourceQuote || "").trim());
  const validQuotedFacts = quotedFacts.filter((fact) => normalizedSource.includes(normalizedText(fact.sourceQuote)));
  const importantFacts = facts.filter((fact) => ["critical", "high"].includes(fact.importance));
  const requiredQuotedImportant = Math.min(requiredImportant, importantFacts.length);
  const quotedImportant = importantFacts.filter((fact) => String(fact.sourceQuote || "").trim() && normalizedSource.includes(normalizedText(fact.sourceQuote))).length;
  const issues = [];

  if (!source.characterCount) issues.push("source snapshot is empty");
  if (facts.length < requiredFacts) issues.push(`source extraction is too sparse: ${facts.length} facts for ${source.characterCount} source characters; require at least ${requiredFacts}`);
  if (typeCount < requiredTypes) issues.push(`source extraction lacks semantic variety: ${typeCount} fact types; require at least ${requiredTypes}`);
  if (importantCount < requiredImportant) issues.push(`source extraction under-identifies important information: ${importantCount} critical/high facts; require at least ${requiredImportant}`);
  if (validQuotedFacts.length < facts.length) issues.push(`source traceability is incomplete: ${validQuotedFacts.length}/${facts.length} facts have a sourceQuote found in the raw source`);
  if (quotedImportant < requiredQuotedImportant) issues.push(`important source traceability is incomplete: ${quotedImportant}/${importantFacts.length} critical/high facts have a valid sourceQuote; require at least ${requiredQuotedImportant}`);
  if (recalledNumbers.length < requiredNumericRecall) issues.push(`numeric evidence recall is too low: ${recalledNumbers.length}/${sourceNumbers.length} source signals captured; require at least ${requiredNumericRecall}`);

  return {
    ok: issues.length === 0,
    issues,
    source,
    inventory: {
      factCount: facts.length,
      factTypeCount: typeCount,
      importantFactCount: importantCount,
      quotedFactCount: quotedFacts.length,
      validQuotedFactCount: validQuotedFacts.length,
      validQuotedImportantFactCount: quotedImportant,
      capturedNumericSignals: [...capturedNumbers],
    },
    thresholds: { requiredFacts, requiredTypes, requiredImportant, requiredQuotedImportant, requiredNumericRecall },
    recalledNumericSignals: recalledNumbers,
  };
}
