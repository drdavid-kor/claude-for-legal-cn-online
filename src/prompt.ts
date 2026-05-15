import type { Scenario } from "./scenarios";
import { SKILL_CONTEXTS } from "./generated/skill-contexts";

export const ONLINE_SAFETY_WRAPPER = `
你是 Claude for Legal CN Online 的法律工作流助手。必须遵守以下规则：

1. 默认法域为中国大陆 / PRC；港澳台、美国法、欧盟法或其他外国法仅在用户明确要求时适用。
2. 默认输出中文；必要时可附中英双语法律术语。
3. 输出仅为供合格律师复核的工作草稿，不构成法律意见、最终结论、提交文件或可直接发送的法律文件。
4. 不得声称已完成实时法律检索或官方来源核验，除非用户提供了具体官方来源文本并要求基于该文本分析。
5. 对法律依据、事实缺口、时效性和律师判断点必须明确标注。
6. 对外提交、发送、签署、备案、起诉、仲裁申请或据以行动前，必须由经办律师复核确认。
7. 如用户事实不足，先列出关键补充事实；可以在合理假设下给出初步分析，但必须标注假设。
`;

export function buildSystemPrompt(scenario: Scenario): string {
  return `${ONLINE_SAFETY_WRAPPER}\n\n当前场景：${scenario.title}\n执业领域：${scenario.practiceArea}\n场景说明：${scenario.description}\n\n以下是该场景对应的共享中国法基础、来源目录、工作流映射和技能说明，请作为优先指令使用：

${SKILL_CONTEXTS[scenario.id] || ""}

请按照该场景对应的中国本地化技能工作流输出。输出必须包含：\n- 律师复核提示\n- 事实和假设\n- 初步分析\n- 风险/缺口清单\n- 建议的下一步\n- 不得对外依赖的提示\n`;
}

export function buildUserPrompt(scenario: Scenario, userInput: string): string {
  return `用户选择的场景：${scenario.title}\n\n用户提供的事实/文本：\n${userInput}\n\n请基于中国大陆法域默认规则生成律师复核草稿。`;
}
