import fs from "node:fs";
import path from "node:path";

export function loadCapabilities(root) {
  const file = path.join(root, "config", "capabilities.json");
  const registry = JSON.parse(fs.readFileSync(file, "utf8"));
  if (!registry.version || !Array.isArray(registry.capabilities)) {
    throw new Error(`Invalid capability registry: ${file}`);
  }
  return registry;
}

function defaults(request) {
  return {
    engine: request.engine || "v3",
    layout: request.layout,
    renderTarget: request.renderTarget || "svg",
    style: request.style || "professional-blue",
  };
}

export function resolveCapability(registry, request) {
  const normalized = defaults(request);
  const capability = registry.capabilities.find((entry) => (
    entry.engine === normalized.engine
    && entry.renderTarget === normalized.renderTarget
    && entry.layouts.includes(normalized.layout)
  ));
  const errors = [];

  if (!capability) {
    const alternatives = registry.capabilities
      .filter((entry) => entry.layouts.includes(normalized.layout))
      .map((entry) => `${entry.engine}/${entry.renderTarget}`);
    errors.push(
      `Layout "${normalized.layout}" is not supported by ${normalized.engine}/${normalized.renderTarget}`
      + (alternatives.length ? `; valid engines/targets: ${alternatives.join(", ")}` : ""),
    );
  } else if (!capability.styles.includes(normalized.style)) {
    errors.push(
      `Style "${normalized.style}" is not supported by ${capability.id.toUpperCase()}; valid styles: ${capability.styles.join(", ")}`,
    );
  }

  return {
    ok: errors.length === 0,
    ...normalized,
    capabilityId: capability?.id || null,
    renderer: capability?.renderer || null,
    experimental: capability?.experimental ?? null,
    validStyles: capability?.styles || [],
    errors,
  };
}

export function assertCapability(registry, request) {
  const result = resolveCapability(registry, request);
  if (!result.ok) {
    throw new Error(`Unsupported whiteboard capability: ${result.errors.join("; ")}`);
  }
  return result;
}
