/**
 * Configurable Risk Scoring Engine for Area-Based Health Clusters.
 * Evaluates anomalous concentration of symptoms without hardcoded rigid values.
 */

export const DEFAULT_RISK_CONFIG = {
  // Thresholds for unique affected users in a 7-day period
  thresholds: {
    watchUniqueUsers: 5,
    elevatedUniqueUsers: 15,
    criticalUniqueUsers: 25,
  },
  // Scoring component weights (must sum to 1.0)
  weights: {
    uniqueUsers: 0.4, // Weight of sheer volume of unique reporting patients
    symptomConcentration: 0.3, // Weight of patients presenting identical symptom category
    growthRate: 0.2, // Weight of week-over-week velocity / surge
    timeWindowMultiplier: 0.1, // Weight of urgency if window is acute (24h)
  },
  // Severity classification ranges
  severityRanges: {
    normal: { min: 0, max: 34 },
    watch: { min: 35, max: 59 },
    elevated: { min: 60, max: 79 },
    critical: { min: 80, max: 100 },
  },
};

/**
 * Calculates a composite health risk score (0-100) and severity classification.
 *
 * @param {object} clusterData Aggregated metrics from health-cluster.service
 * @param {object} customConfig Optional override of risk thresholds and weights
 * @returns {{ riskScore: number, severity: 'normal' | 'watch' | 'elevated' | 'critical', factors: object, summaryNote: string }}
 */
export function calculateClusterRisk(clusterData, customConfig = {}) {
  const config = {
    ...DEFAULT_RISK_CONFIG,
    ...customConfig,
    thresholds: { ...DEFAULT_RISK_CONFIG.thresholds, ...(customConfig.thresholds || {}) },
    weights: { ...DEFAULT_RISK_CONFIG.weights, ...(customConfig.weights || {}) },
  };

  const { uniqueUserCount = 0, growthRate = 0, primarySymptomCategories = [], timeWindow = '7d' } =
    clusterData;

  // 1. Unique Users Score Component (0 - 100)
  // Reaches 100 when count reaches or exceeds criticalUniqueUsers
  const { watchUniqueUsers, criticalUniqueUsers } = config.thresholds;
  let userScore = 0;
  if (uniqueUserCount <= 1) {
    userScore = 0;
  } else if (uniqueUserCount < watchUniqueUsers) {
    userScore = (uniqueUserCount / watchUniqueUsers) * 35;
  } else {
    userScore = Math.min(
      100,
      35 + ((uniqueUserCount - watchUniqueUsers) / (criticalUniqueUsers - watchUniqueUsers)) * 65
    );
  }

  // 2. Symptom Concentration Component (0 - 100)
  // If >60% of reports share the top symptom category, concentration is high
  const topSymptom = primarySymptomCategories[0];
  const topSymptomPercentage = topSymptom ? topSymptom.percentage : 0;
  const symptomScore = Math.min(100, Math.max(0, (topSymptomPercentage / 80) * 100));

  // 3. Growth Rate / Velocity Component (0 - 100)
  // Positive growth indicates an emerging spike
  let velocityScore = 0;
  if (growthRate > 0) {
    velocityScore = Math.min(100, growthRate * 0.8);
  } else if (growthRate < 0) {
    velocityScore = 10; // declining trend
  } else {
    velocityScore = 20; // stable
  }

  // 4. Time Window Urgency Multiplier
  let windowScore = 50;
  if (timeWindow === '24h') {
    windowScore = 100; // Acute cluster in 24h is more urgent
  } else if (timeWindow === '7d') {
    windowScore = 60;
  } else if (timeWindow === '30d') {
    windowScore = 30;
  }

  // Weighted Composite Calculation
  const compositeScore = Math.round(
    userScore * config.weights.uniqueUsers +
      symptomScore * config.weights.symptomConcentration +
      velocityScore * config.weights.growthRate +
      windowScore * config.weights.timeWindowMultiplier
  );

  const finalRiskScore = Math.min(100, Math.max(0, compositeScore));

  // Classification
  let severity = 'normal';
  if (finalRiskScore >= config.severityRanges.critical.min) {
    severity = 'critical';
  } else if (finalRiskScore >= config.severityRanges.elevated.min) {
    severity = 'elevated';
  } else if (finalRiskScore >= config.severityRanges.watch.min) {
    severity = 'watch';
  } else {
    severity = 'normal';
  }

  const primaryCategoryName = topSymptom?.category || 'reported symptoms';
  let summaryNote = '';
  if (severity === 'critical') {
    summaryNote = `Critical Health Cluster: ${uniqueUserCount} unique residents reporting ${primaryCategoryName} (+${growthRate}% trend) requiring urgent clinical investigation.`;
  } else if (severity === 'elevated') {
    summaryNote = `Elevated Health Alert: Unusually high cluster of ${primaryCategoryName} affecting ${uniqueUserCount} individuals.`;
  } else if (severity === 'watch') {
    summaryNote = `Watch Advisory: Rising health complaints involving ${primaryCategoryName} in this locality.`;
  } else {
    summaryNote = `Normal: No anomalous health spikes detected in this locality.`;
  }

  return {
    riskScore: finalRiskScore,
    severity,
    summaryNote,
    factors: {
      userScore: Math.round(userScore),
      symptomScore: Math.round(symptomScore),
      velocityScore: Math.round(velocityScore),
      windowScore: Math.round(windowScore),
      topSymptomCategory: primaryCategoryName,
      topSymptomPercentage,
    },
  };
}
