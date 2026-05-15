export const DEFAULT_JURISDICTION = "中国大陆 / PRC";

export type Scenario = {
  id: string;
  title: string;
  practiceArea: string;
  description: string;
  examplePrompt: string;
  skillPath: string;
  referencePaths: string[];
};

export const SHARED_REFERENCE_PATHS = [
  "references/china-legal-foundation.md",
  "references/china-source-catalog.md",
  "references/china-plugin-workflow-map.md"
] as const;

export const SCENARIOS: Scenario[] = [
  {
    id: "commercial_saas_data_export",
    title: "商事合同审查",
    practiceArea: "商事合同",
    description: "SaaS/采购合同，重点关注数据出境与责任限制。",
    examplePrompt: "请审查一份供应商 SaaS 合同：系统会处理中国境内用户个人信息，并向境外总部同步。重点关注数据出境、责任限制、违约金、争议解决和公章/授权。",
    skillPath: "commercial-legal/skills/review/SKILL.md",
    referencePaths: [...SHARED_REFERENCE_PATHS]
  },
  {
    id: "privacy_rights_request",
    title: "PIPL 个人信息权益请求",
    practiceArea: "数据合规与隐私",
    description: "处理查阅、复制、更正、删除、解释说明、撤回同意和账号注销请求。",
    examplePrompt: "用户要求复制、更正并删除其个人信息，同时撤回营销同意。请生成处理清单、风险点、回复草稿和律师复核要点。",
    skillPath: "privacy-legal/skills/dsar-response/SKILL.md",
    referencePaths: [...SHARED_REFERENCE_PATHS]
  },
  {
    id: "corporate_equity_diligence",
    title: "股权转让/并购尽调初筛",
    practiceArea: "公司与并购",
    description: "境内有限责任公司股权转让，关注注册资本、章程限制、市场监管登记和数据/劳动/税务风险。",
    examplePrompt: "请为一家境内有限责任公司股权转让项目做尽调初筛，重点关注注册资本实缴、章程限制、市场监管变更登记、主要合同、劳动用工、税务和数据合规。",
    skillPath: "corporate-legal/skills/diligence-issue-extraction/SKILL.md",
    referencePaths: [...SHARED_REFERENCE_PATHS]
  },
  {
    id: "employment_termination",
    title: "劳动合同解除风险评估",
    practiceArea: "劳动人事",
    description: "评估中国劳动合同解除的法定事由、程序、经济补偿/赔偿金和劳动仲裁风险。",
    examplePrompt: "公司拟解除一名上海员工的劳动合同，理由是绩效不达标。请列出事实核查清单、程序要求、补偿风险和劳动仲裁风险。",
    skillPath: "employment-legal/skills/termination-review/SKILL.md",
    referencePaths: [...SHARED_REFERENCE_PATHS]
  },
  {
    id: "litigation_evidence_preservation",
    title: "民商事诉讼证据目录与保全思路",
    practiceArea: "争议解决",
    description: "围绕诉讼时效、管辖、证据目录、财产保全、证据保全和执行线索搭建初步方案。",
    examplePrompt: "买卖合同纠纷拟在上海起诉。请整理证据目录、诉讼时效、管辖、财产保全、证据保全和执行财产线索的初步方案。",
    skillPath: "litigation-legal/skills/chronology/SKILL.md",
    referencePaths: [...SHARED_REFERENCE_PATHS]
  },
  {
    id: "ip_platform_complaint",
    title: "商标平台投诉/行政执法路径",
    practiceArea: "知识产权",
    description: "针对电商平台商标侵权链接，评估平台投诉、行政执法、证据固定和民事路径。",
    examplePrompt: "准备针对电商平台上的商标侵权链接发起投诉，并评估是否同步行政执法。请输出证据清单、投诉要点、风险和律师复核点。",
    skillPath: "ip-legal/skills/infringement-triage/SKILL.md",
    referencePaths: [...SHARED_REFERENCE_PATHS]
  },
  {
    id: "ai_product_launch",
    title: "生成式 AI 产品上线合规初筛",
    practiceArea: "人工智能治理",
    description: "面向公众的生成式 AI 产品上线，关注备案、安全评估、内容安全、训练数据和个人信息。",
    examplePrompt: "拟上线面向公众的生成式 AI 问答产品，并使用用户输入持续优化模型。请做中国法合规初筛，关注备案、安全评估、内容安全、训练数据来源、个人信息和重要数据。",
    skillPath: "ai-governance-legal/skills/use-case-triage/SKILL.md",
    referencePaths: [...SHARED_REFERENCE_PATHS]
  },
  {
    id: "regulatory_gap_analysis",
    title: "监管新规与内部制度差距分析",
    practiceArea: "监管合规",
    description: "将用户粘贴的新规或征求意见稿与内部制度做差距分析和整改清单。",
    examplePrompt: "请基于我粘贴的新规文本和现行内部制度，生成合规差距、影响等级、整改动作、负责人建议和律师复核要点。",
    skillPath: "regulatory-legal/skills/policy-diff/SKILL.md",
    referencePaths: [...SHARED_REFERENCE_PATHS]
  }
];

export function getScenario(id: string): Scenario | undefined {
  return SCENARIOS.find((scenario) => scenario.id === id);
}
