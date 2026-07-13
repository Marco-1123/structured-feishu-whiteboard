import fs from "node:fs";
import path from "node:path";

const catalogPath = process.argv[2] || "examples/evals/v44-internal/source-catalog.json";
const outputPath = process.argv[3] || "examples/evals/v44-internal/cross-agent-pack.json";
const catalog = JSON.parse(fs.readFileSync(catalogPath, "utf8"));

const pack = {
  version: "4.4.0-beta-internal",
  purpose: "跨 Agent 盲测输入。测试执行方不得读取本地 expected.json、report.json 或既有 SVG/PNG。",
  instructions: [
    "每个案例仅使用 case.material 作为输入材料。",
    "调用 structured-feishu-whiteboard V4.4 beta 的完整生产链路。",
    "保存 Agent 名称、模型、Skill 版本、生成耗时、飞书文档链接和画板预览图。",
    "不要把 source 元数据或 caseId 直接写进画板正文。",
  ],
  cases: catalog.cases.map((testCase) => ({
    caseId: testCase.id,
    source: testCase.source,
    stress: Boolean(testCase.stress),
    material: {
      title: testCase.title,
      sourceType: testCase.sourceType,
      facts: testCase.facts,
    },
  })),
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(pack, null, 2)}\n`);
console.log(`ok: wrote ${pack.cases.length} blind cross-Agent cases to ${outputPath}`);
