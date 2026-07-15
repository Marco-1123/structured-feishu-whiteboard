const allowedScenes = new Set(["layered-architecture", "swimlane-process", "flywheel-loop", "decision-comparison", "evidence-argument", "operating-dashboard"]);
const allowedStyles = new Set(["linear-system", "professional-blue", "apple-report", "stripe-data", "vercel-precision", "feishu-status"]);

export function validateScenePlanV5(plan) {
  const issues = [];
  if (!plan || typeof plan !== "object") return ["scene plan must be an object"];
  const allowedKeys = new Set(["schemaVersion", "engine", "scene", "style", "title", "subtitle", "summary", "summarySourceFactIds", "confidence", "centerTitle", "lanes", "layers", "nodes", "edges", "sourceFactIds", "recommendation", "recommendationSourceFactIds", "optionNodeIds", "criterionNodeIds", "thesisNodeId", "evidenceNodeIds", "metricNodeIds", "supportNodeIds"]);
  for (const key of Object.keys(plan)) if (!allowedKeys.has(key)) issues.push(`unknown scene plan field: ${key}`);
  if (plan.schemaVersion !== "5.0-beta.1") issues.push("schemaVersion must be 5.0-beta.1");
  if (plan.engine !== "v5") issues.push("engine must be v5");
  if (!allowedScenes.has(plan.scene)) issues.push(`unsupported scene: ${plan.scene}`);
  if (!allowedStyles.has(plan.style)) issues.push(`unsupported style: ${plan.style}`);
  if (!String(plan.title || "").trim()) issues.push("title is required");
  if (String(plan.title || "").length > 80) issues.push("title exceeds 80 characters");
  if (String(plan.subtitle || "").length > 120) issues.push("subtitle exceeds 120 characters");
  if (!String(plan.summary || "").trim()) issues.push("summary is required");
  if (String(plan.summary || "").length > 180) issues.push("summary exceeds 180 characters");
  if (!plan.confidence || !["high", "medium", "low"].includes(plan.confidence.level)) issues.push("confidence.level is required");
  if (!Number.isFinite(plan.confidence?.score) || plan.confidence.score < 0 || plan.confidence.score > 100) issues.push("confidence.score must be 0-100");
  if (!Number.isFinite(plan.confidence?.margin) || plan.confidence.margin < 0 || plan.confidence.margin > 100) issues.push("confidence.margin must be 0-100");
  if (!Array.isArray(plan.confidence?.reasons)) issues.push("confidence.reasons must be an array");
  if (!Array.isArray(plan.summarySourceFactIds) || !plan.summarySourceFactIds.length) issues.push("summarySourceFactIds is required");
  if (!Array.isArray(plan.nodes) || plan.nodes.length < 4) issues.push("at least four scene nodes are required");
  if (!Array.isArray(plan.edges)) issues.push("edges must be an array");
  if (!Array.isArray(plan.sourceFactIds) || plan.sourceFactIds.length < 4) issues.push("sourceFactIds requires at least four facts");
  const nodeIds = new Set();
  for (const node of plan.nodes || []) {
    if (!node.id || nodeIds.has(node.id)) issues.push(`duplicate or missing node id: ${node.id || "<empty>"}`);
    nodeIds.add(node.id);
    if (!String(node.title || "").trim()) issues.push(`node ${node.id} has no title`);
    if (!Array.isArray(node.sourceFactIds) || !node.sourceFactIds.length) issues.push(`node ${node.id} has no sourceFactIds`);
  }
  for (const edge of plan.edges || []) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) issues.push(`edge ${edge.id || `${edge.from}->${edge.to}`} references a hidden node`);
  }
  if (plan.scene === "layered-architecture") {
    if (!Array.isArray(plan.layers) || plan.layers.length < 2) issues.push("layered-architecture requires at least two layers");
    for (const layer of plan.layers || []) {
      if (!layer.nodeIds?.length) issues.push(`layer ${layer.id} is empty`);
      for (const id of layer.nodeIds || []) if (!nodeIds.has(id)) issues.push(`layer ${layer.id} references hidden node ${id}`);
    }
  }
  if (plan.scene === "swimlane-process") {
    const laneIds = new Set((plan.lanes || []).map((lane) => lane.id));
    if (laneIds.size < 2) issues.push("swimlane-process requires at least two lanes");
    for (const node of plan.nodes || []) if (!laneIds.has(node.laneId)) issues.push(`node ${node.id} has no visible lane`);
  }
  if (plan.scene === "flywheel-loop") {
    if (plan.nodes.length < 4 || plan.nodes.length > 6) issues.push("flywheel-loop requires four to six stages");
    if ((plan.edges || []).length < plan.nodes.length) issues.push("flywheel-loop must contain an explicit closed edge chain");
  }
  if (plan.scene === "decision-comparison") {
    if ((plan.optionNodeIds || []).length < 2) issues.push("decision-comparison requires at least two options");
    if ((plan.criterionNodeIds || []).length < 2) issues.push("decision-comparison requires at least two criteria");
    for (const id of [...(plan.optionNodeIds || []), ...(plan.criterionNodeIds || [])]) if (!nodeIds.has(id)) issues.push(`decision-comparison references hidden node ${id}`);
  }
  if (plan.scene === "evidence-argument") {
    if (!nodeIds.has(plan.thesisNodeId)) issues.push("evidence-argument requires a visible thesis node");
    if ((plan.evidenceNodeIds || []).length < 3) issues.push("evidence-argument requires at least three evidence nodes");
    for (const id of plan.evidenceNodeIds || []) if (!nodeIds.has(id)) issues.push(`evidence-argument references hidden node ${id}`);
  }
  if (plan.scene === "operating-dashboard") {
    if ((plan.metricNodeIds || []).length < 3) issues.push("operating-dashboard requires at least three indicators");
    for (const id of [...(plan.metricNodeIds || []), ...(plan.supportNodeIds || [])]) if (!nodeIds.has(id)) issues.push(`operating-dashboard references hidden node ${id}`);
  }
  const carriers = new Set([
    ...(plan.summarySourceFactIds || []),
    ...(plan.nodes || []).flatMap((node) => node.sourceFactIds || []),
    ...(plan.layers || []).flatMap((layer) => layer.sourceFactIds || []),
    ...(plan.lanes || []).flatMap((lane) => lane.sourceFactIds || []),
    ...(plan.recommendationSourceFactIds || []),
  ]);
  for (const id of plan.sourceFactIds || []) if (!carriers.has(id)) issues.push(`source fact ${id} has no visible carrier`);
  return issues;
}
