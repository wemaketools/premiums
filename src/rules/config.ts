import { RuleConfig } from '../contracts/index.js';

export type { CollectionsRuleConfig, RuleConfig } from '../contracts/index.js';

/** The spec's `proposed_rule_config.json` as the engine reads it; an invalid file fails loudly. */
export function parseRuleConfig(json: unknown): RuleConfig {
  return RuleConfig.parse(json);
}
