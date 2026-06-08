import { StyleSheet, Text, View } from 'react-native';
import { pickLocalized, useI18n } from '@/lib/i18n';
import { AIAnalysis, Localized } from '@/lib/types';

interface Props {
  analysis: AIAnalysis;
  // Extra context only present right after running a fresh analysis.
  advice?: Localized | null;
  careBasics?: Record<string, { en: string | null; bg: string | null }> | null;
}

const CONDITION_STYLE: Record<string, { bg: string; fg: string }> = {
  excellent: { bg: '#DCFCE7', fg: '#15803D' },
  good: { bg: '#DCFCE7', fg: '#15803D' },
  fair: { bg: '#FEF9C3', fg: '#A16207' },
  poor: { bg: '#FEE2E2', fg: '#B91C1C' },
  critical: { bg: '#FEE2E2', fg: '#B91C1C' },
};

const CARE_ICONS: Record<string, string> = {
  light: '☀️',
  watering: '💧',
  temperature: '🌡️',
  humidity: '🌬️',
  fertilizer: '🌿',
  soil: '🪨',
  toxicity: '🐾',
};

function severityColor(severity: string): string {
  if (severity === 'high') return '#EF4444';
  if (severity === 'medium') return '#F59E0B';
  return '#EAB308';
}

export function AIAnalysisCard({ analysis, advice, careBasics }: Props) {
  const { locale, m } = useI18n();
  const cond = analysis.overallCondition;
  const condStyle = cond ? CONDITION_STYLE[cond] : null;
  const plantName = analysis.identifiedCommonName ?? m.ai.unknownPlant;

  const issues = analysis.issues ?? [];
  const recommendations = analysis.careRecommendations ?? [];
  const basics = careBasics ?? null;
  const adviceText = pickLocalized(advice, locale);

  return (
    <View style={styles.card}>
      {/* Header band */}
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <View style={styles.titleCol}>
            <Text style={styles.leafIcon}>🌿 {plantName}</Text>
            {analysis.identifiedScientificName && (
              <Text style={styles.sciName}>{analysis.identifiedScientificName}</Text>
            )}
          </View>
          {cond && condStyle && (
            <View style={[styles.condPill, { backgroundColor: condStyle.bg }]}>
              <Text style={[styles.condText, { color: condStyle.fg }]}>
                {m.ai.condition[cond]}
              </Text>
            </View>
          )}
        </View>

        {adviceText && <Text style={styles.advice}>✨ {adviceText}</Text>}

        {basics && (
          <View style={styles.basicsList}>
            {Object.entries(CARE_ICONS).map(([key, icon]) => {
              const value = pickLocalized(basics[key], locale);
              if (!value) return null;
              return (
                <View key={key} style={styles.basicRow}>
                  <Text style={styles.basicIcon}>{icon}</Text>
                  {/* Full-width rows so longer care notes wrap and stay readable
                      on a phone instead of being clipped to "…". */}
                  <Text style={styles.basicValue}>{value}</Text>
                </View>
              );
            })}
          </View>
        )}
      </View>

      {analysis.wateringNeeded && (
        <View style={styles.waterBanner}>
          <Text style={styles.waterText}>💧 {m.ai.wateringNeeded}</Text>
        </View>
      )}

      <View style={styles.body}>
        {/* Issues */}
        {issues.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{m.ai.issues}</Text>
            {issues.map((issue, i) => {
              const name = pickLocalized(issue.name, locale);
              const desc = pickLocalized(issue.description, locale);
              return (
                <View key={i} style={styles.issueRow}>
                  <View
                    style={[styles.severityDot, { backgroundColor: severityColor(issue.severity) }]}
                  />
                  <Text style={styles.issueText}>
                    <Text style={styles.issueName}>{name} — </Text>
                    {desc}
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.noIssues}>✓ {m.ai.noIssues}</Text>
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{m.ai.careRecommendations}</Text>
            {recommendations.map((rec, i) => {
              const text = pickLocalized(rec, locale);
              if (!text) return null;
              return (
                <View key={i} style={styles.recRow}>
                  <Text style={styles.recBullet}>✓</Text>
                  <Text style={styles.recText}>{text}</Text>
                </View>
              );
            })}
          </View>
        )}

        {/* Meta */}
        <View style={styles.metaRow}>
          {analysis.healthScore != null && (
            <Text style={styles.meta}>
              {m.ai.healthScore}: <Text style={styles.metaStrong}>{analysis.healthScore}/100</Text>
            </Text>
          )}
          {analysis.confidence && (
            <Text style={styles.meta}>
              {m.ai.confidence.label}:{' '}
              <Text style={styles.metaStrong}>{m.ai.confidence[analysis.confidence]}</Text>
            </Text>
          )}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#ECEEF1',
    overflow: 'hidden',
  },
  header: {
    backgroundColor: '#ECFDF5',
    padding: 16,
    gap: 12,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 10,
  },
  titleCol: {
    flex: 1,
    gap: 2,
  },
  leafIcon: {
    fontSize: 16,
    fontWeight: '700',
    color: '#11181C',
  },
  sciName: {
    fontSize: 12,
    fontStyle: 'italic',
    color: '#9AA0A6',
  },
  condPill: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  condText: {
    fontSize: 12,
    fontWeight: '600',
  },
  advice: {
    fontSize: 14,
    color: '#374151',
    lineHeight: 20,
  },
  basicsList: {
    gap: 8,
  },
  basicRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    backgroundColor: 'rgba(255,255,255,0.7)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  basicIcon: {
    fontSize: 13,
    marginTop: 1,
  },
  basicValue: {
    flex: 1,
    fontSize: 13,
    fontWeight: '600',
    color: '#374151',
    lineHeight: 18,
  },
  waterBanner: {
    backgroundColor: '#EFF6FF',
    borderTopWidth: 1,
    borderTopColor: '#DBEAFE',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  waterText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1D4ED8',
  },
  body: {
    padding: 16,
    gap: 16,
  },
  section: {
    gap: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    color: '#9AA0A6',
  },
  issueRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  severityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  issueText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  issueName: {
    fontWeight: '600',
    color: '#1F2937',
  },
  noIssues: {
    fontSize: 14,
    color: '#16A34A',
    fontWeight: '600',
  },
  recRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  recBullet: {
    color: '#10B981',
    fontWeight: '800',
    fontSize: 14,
    marginTop: 1,
  },
  recText: {
    flex: 1,
    fontSize: 14,
    color: '#4B5563',
    lineHeight: 20,
  },
  metaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
    borderTopWidth: 1,
    borderTopColor: '#F1F2F4',
    paddingTop: 12,
  },
  meta: {
    fontSize: 13,
    color: '#9AA0A6',
  },
  metaStrong: {
    color: '#374151',
    fontWeight: '600',
  },
});
