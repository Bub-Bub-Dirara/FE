import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
} from "@react-pdf/renderer";

export interface MappingReportData {
  fileName: string;
  aiSummary: {
    riskLabel?: string;         // 위험도: B 같은 텍스트
    fileDisplayName?: string;   // 파일명: xx_계약서.pdf
    lawAnalysis?: string;       // "법령 관점 분석: ..."
    caseAnalysis?: string;      // "판례 관점 분석: ..."
    bullets: string[];          // 불릿 요약들
  };
  uploadedDoc: {
    fileName: string;
    description?: string;
  };
  lawGroups: {
    lawTitle: string; // 민간임대주택에 관한 특별법 시행령
    articles: {
      title: string;   // 제39조
      summary: string; // 조문 요약
    }[];
  }[];
  cases: {
    title: string;       // 임대차보증금반환[...] 사건명
    court?: string;      // 대법원, 부산고등법원 등
    decisionDate?: string; // 2025.04.15
    summary?: string;    // 판례 요약
  }[];
}

const styles = StyleSheet.create({
  page: {
    padding: 24,
    fontSize: 11,
    lineHeight: 1.4,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 12,
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 6,
  },
  labelRow: {
    flexDirection: "row",
    marginBottom: 4,
  },
  label: {
    fontWeight: "bold",
    marginRight: 4,
  },
  bulletList: {
    marginTop: 4,
    marginLeft: 10,
  },
  bulletItem: {
    flexDirection: "row",
    marginBottom: 2,
  },
  bulletDot: {
    width: 8,
  },
  bulletText: {
    flex: 1,
  },
  lawGroup: {
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 0.5,
  },
  lawGroupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 2,
  },
  lawGroupTitle: {
    fontWeight: "bold",
  },
  article: {
    marginLeft: 8,
    marginTop: 2,
  },
  articleTitle: {
    fontWeight: "bold",
  },
  caseItem: {
    marginBottom: 8,
    paddingBottom: 4,
    borderBottomWidth: 0.5,
  },
  caseTitle: {
    fontWeight: "bold",
    marginBottom: 2,
  },
  caseMeta: {
    fontSize: 10,
    marginBottom: 2,
  },
});

export function MappingReportPdf({ data }: { data: MappingReportData }) {
  const { aiSummary, uploadedDoc, lawGroups, cases } = data;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* 상단 제목 */}
        <View style={styles.section}>
          <Text style={styles.title}>법령·판례 조합 매핑 리포트</Text>
          <Text>파일명: {data.fileName}</Text>
        </View>

        {/* AI 분석 요약 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>AI 분석 요약</Text>

          {aiSummary.fileDisplayName && (
            <Text>· {aiSummary.fileDisplayName}</Text>
          )}

          <View style={styles.labelRow}>
            <Text style={styles.label}>위험도:</Text>
            <Text>{aiSummary.riskLabel ?? "-"}</Text>
          </View>

          {aiSummary.lawAnalysis && (
            <View style={{ marginBottom: 2 }}>
              <Text style={styles.label}>법령 관점 분석:</Text>
              <Text>{aiSummary.lawAnalysis}</Text>
            </View>
          )}

          {aiSummary.caseAnalysis && (
            <View>
              <Text style={styles.label}>판례 관점 분석:</Text>
              <Text>{aiSummary.caseAnalysis}</Text>
            </View>
          )}

          {aiSummary.bullets.length > 0 && (
            <View style={styles.bulletList}>
              {aiSummary.bullets.map((b, idx) => (
                <View key={idx} style={styles.bulletItem}>
                  <Text style={styles.bulletDot}>•</Text>
                  <Text style={styles.bulletText}>{b}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* 업로드 문서 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>업로드 문서</Text>
          <Text>{uploadedDoc.fileName}</Text>
          {uploadedDoc.description && <Text>{uploadedDoc.description}</Text>}
        </View>

        {/* 관련 법령 조항 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>관련 법령 조항</Text>
          {lawGroups.length === 0 && <Text>연동된 법령이 없습니다.</Text>}
          {lawGroups.map((group, idx) => (
            <View key={idx} style={styles.lawGroup}>
              <View style={styles.lawGroupHeader}>
                <Text style={styles.lawGroupTitle}>{group.lawTitle}</Text>
                {group.articles?.length ? (
                  <Text>{group.articles.length}개 조항</Text>
                ) : null}
              </View>
              {group.articles?.map((a, jdx) => (
                <View key={jdx} style={styles.article}>
                  <Text style={styles.articleTitle}>{a.title}</Text>
                  {a.summary && <Text>{a.summary}</Text>}
                </View>
              ))}
            </View>
          ))}
        </View>

        {/* 관련 판례 */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>관련 판례</Text>
          {cases.length === 0 && <Text>연동된 판례가 없습니다.</Text>}
          {cases.map((c, idx) => (
            <View key={idx} style={styles.caseItem}>
              <Text style={styles.caseTitle}>{c.title}</Text>
              {(c.court || c.decisionDate) && (
                <Text style={styles.caseMeta}>
                  {c.court ?? ""}{" "}
                  {c.decisionDate ? `· ${c.decisionDate}` : ""}
                </Text>
              )}
              {c.summary && <Text>{c.summary}</Text>}
            </View>
          ))}
        </View>
      </Page>
    </Document>
  );
}
