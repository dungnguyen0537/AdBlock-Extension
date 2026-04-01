export function getRulesetSyncPayload(settings, rulesetByPlatform) {
  const enableRulesetIds = [];
  const disableRulesetIds = [];

  for (const [platform, rulesetId] of Object.entries(rulesetByPlatform)) {
    if (settings?.[platform]?.enabled && settings?.[platform]?.networkFiltersEnabled !== false) {
      enableRulesetIds.push(rulesetId);
      continue;
    }

    disableRulesetIds.push(rulesetId);
  }

  return {
    enableRulesetIds,
    disableRulesetIds
  };
}
