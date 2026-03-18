package com.jeolgamai.backend.domain.optimization.service;

import com.jeolgamai.backend.domain.optimization.dto.OptimizationModels;
import org.apache.pdfbox.pdmodel.PDDocument;
import org.apache.pdfbox.pdmodel.PDPage;
import org.apache.pdfbox.pdmodel.PDPageContentStream;
import org.apache.pdfbox.pdmodel.common.PDRectangle;
import org.apache.pdfbox.pdmodel.font.PDFont;
import org.apache.pdfbox.pdmodel.font.PDType0Font;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;

@Service
public class OptimizationReportPdfService {

    // ─── Layout ──────────────────────────────────────────────────────────────
    private static final float PAGE_WIDTH   = PDRectangle.A4.getWidth();   // 595.28
    private static final float PAGE_HEIGHT  = PDRectangle.A4.getHeight();  // 841.89
    private static final float MARGIN       = 40f;
    private static final float CONTENT_W    = PAGE_WIDTH - MARGIN * 2f;
    private static final float FOOTER_H     = 28f;
    private static final String FONT_PATH   = "fonts/NotoSansKR-VariableFont_wght.ttf";

    // ─── Typography ───────────────────────────────────────────────────────────
    private static final float FS_DISPLAY   = 26f;
    private static final float FS_H1        = 15f;
    private static final float FS_H2        = 12f;
    private static final float FS_BODY      = 10f;
    private static final float FS_SMALL     = 8.5f;
    private static final float LH_BODY      = 15f;
    private static final float LH_SMALL     = 12.5f;

    // ─── Palette ─────────────────────────────────────────────────────────────
    private static final Color PAGE_BG       = new Color(246, 248, 252);
    private static final Color HERO_BG       = new Color(11, 14, 20);       // #0B0E14
    private static final Color HERO_CARD_BG  = new Color(22, 27, 34);       // #161B22
    private static final Color HERO_BORDER   = new Color(40, 50, 70);
    private static final Color PRIMARY       = new Color(28, 89, 242);      // #1c59f2
    private static final Color PRIMARY_LIGHT = new Color(219, 234, 254);
    private static final Color PRIMARY_DIM   = new Color(96, 145, 248);
    private static final Color TEXT_DARK     = new Color(15, 23, 42);
    private static final Color TEXT_MID      = new Color(71, 85, 105);
    private static final Color TEXT_MUTED    = new Color(148, 163, 184);
    private static final Color WHITE         = Color.WHITE;
    private static final Color BORDER_COLOR  = new Color(226, 232, 240);
    private static final Color CARD_BG       = Color.WHITE;
    private static final Color CARD_SOFT     = new Color(248, 250, 252);
    private static final Color EMERALD       = new Color(5, 150, 105);
    private static final Color EMERALD_SOFT  = new Color(209, 250, 229);
    private static final Color ROSE          = new Color(225, 29, 72);
    private static final Color ROSE_SOFT     = new Color(255, 228, 230);
    private static final Color AMBER         = new Color(202, 138, 4);
    private static final Color AMBER_SOFT    = new Color(254, 243, 199);
    private static final Color CODE_BG       = new Color(15, 23, 42);
    private static final Color CODE_HEADER   = new Color(28, 36, 54);
    private static final Color CODE_TEXT     = new Color(203, 213, 225);

    // ─── Entry Point ─────────────────────────────────────────────────────────

    public byte[] renderIntegratedReport(
            OptimizationModels.ProjectSummary project,
            OptimizationModels.AnalysisSnapshot analysis,
            OptimizationModels.ReportArtifact report
    ) {
        try (PDDocument doc = new PDDocument();
             InputStream fontStream = new ClassPathResource(FONT_PATH).getInputStream()) {

            PDType0Font font = PDType0Font.load(doc, fontStream, true);
            Canvas cv = new Canvas(doc, font);

            // ── Page 1 ──
            drawHero(cv, project, analysis, report);
            drawMetricGrid(cv, analysis, report);
            drawExecutiveSummary(cv, report);
            drawRecommendationHighlights(cv, report);

            // ── Page 2 ──
            cv.newPage();
            drawCostDrivers(cv, report);
            drawExecutionPlan(cv, report);
            drawWarnings(cv, report);

            cv.finish();

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            doc.save(out);
            return out.toByteArray();

        } catch (IOException e) {
            throw new IllegalStateException("PDF 생성에 실패했습니다.", e);
        }
    }

    // ─── Sections ────────────────────────────────────────────────────────────

    /** Full-width dark hero banner */
    private void drawHero(
            Canvas cv,
            OptimizationModels.ProjectSummary project,
            OptimizationModels.AnalysisSnapshot analysis,
            OptimizationModels.ReportArtifact report
    ) throws IOException {

        final float HERO_H       = 192f;
        final float ACCENT_H     = 4f;
        final float SCORE_W      = 160f;
        final float SCORE_H      = 110f;
        final float SCORE_PAD    = 20f;
        final float TEXT_X       = MARGIN + 28f;
        final float TOP          = cv.cursorY();

        // Background
        cv.rect(MARGIN, TOP, CONTENT_W, HERO_H, HERO_BG, null, 0);

        // Top accent bar
        cv.rect(MARGIN, TOP, CONTENT_W, ACCENT_H, PRIMARY, null, 0);

        // Score card (right side, vertically centered in hero)
        float scoreX   = MARGIN + CONTENT_W - SCORE_W - SCORE_PAD;
        float scoreTop = TOP - (HERO_H - SCORE_H) / 2f;
        cv.rect(scoreX, scoreTop, SCORE_W, SCORE_H, HERO_CARD_BG, HERO_BORDER, 1f);
        // Score card content
        cv.text("ANALYSIS SCORE",        scoreX + 16f, scoreTop - 20f,  FS_SMALL, TEXT_MUTED);
        cv.text(analysis.score().totalScore() + "점",
                                         scoreX + 16f, scoreTop - 48f,  22f,      WHITE);
        cv.text(analysis.score().grade(), scoreX + 16f, scoreTop - 64f, FS_SMALL, PRIMARY_DIM);
        cv.hline(scoreX + 16f, scoreTop - 76f, SCORE_W - 32f, HERO_BORDER, 0.5f);
        cv.text("예상 월 절감",           scoreX + 16f, scoreTop - 90f,  FS_SMALL, TEXT_MUTED);
        cv.text(formatKrw(report.payload().monthlySaving()),
                                         scoreX + 16f, scoreTop - 104f, FS_SMALL, EMERALD);

        // Left text block — vertically centered
        float textAreaTop = TOP - 32f;
        cv.text("INTEGRATED COST REPORT", TEXT_X, textAreaTop,          FS_SMALL, PRIMARY_DIM);
        cv.text(project.name(),            TEXT_X, textAreaTop - 32f,   FS_DISPLAY, WHITE);
        cv.text("경영 요약과 실행 리스크를 한 번에 보는 비용 최적화 리포트",
                                           TEXT_X, textAreaTop - 58f,   FS_BODY,  TEXT_MUTED);

        // Meta row — bottom of hero
        float metaY = TOP - HERO_H + 32f;
        float chipX = TEXT_X;
        chipX = cv.chip(chipX, metaY, "리포트 " + report.id(),           HERO_CARD_BG, HERO_BORDER, TEXT_MUTED) + 10f;
        chipX = cv.chip(chipX, metaY, "리전 " + analysis.awsRegion(),    HERO_CARD_BG, HERO_BORDER, TEXT_MUTED) + 10f;
        cv.chip(chipX, metaY, "생성 " + report.createdAt(),              HERO_CARD_BG, HERO_BORDER, TEXT_MUTED);

        cv.moveTo(TOP - HERO_H - 24f);
    }

    /** 2×2 metric cards + source-coverage strip */
    private void drawMetricGrid(
            Canvas cv,
            OptimizationModels.AnalysisSnapshot analysis,
            OptimizationModels.ReportArtifact report
    ) throws IOException {

        final float GAP  = 12f;
        final float CW   = (CONTENT_W - GAP) / 2f;
        final float CH   = 76f;

        float top = cv.cursorY();

        metricCard(cv, MARGIN,        top,     CW, CH,
                "총 월 비용",   formatKrw(report.payload().totalMonthlyCost()), "현재 추정 기준",
                CARD_BG,    BORDER_COLOR, TEXT_DARK);
        metricCard(cv, MARGIN + CW + GAP, top, CW, CH,
                "낭비 비용",   formatKrw(report.payload().wasteCost()),         "제거 가능 비용",
                ROSE_SOFT,  blend(ROSE, WHITE, 0.6f), ROSE);

        top -= CH + GAP;

        metricCard(cv, MARGIN,        top,     CW, CH,
                "예상 월 절감", formatKrw(report.payload().monthlySaving()),    "우선 적용 항목",
                EMERALD_SOFT, blend(EMERALD, WHITE, 0.6f), EMERALD);
        metricCard(cv, MARGIN + CW + GAP, top, CW, CH,
                "예상 연 절감", formatKrw(report.payload().annualSaving()),     "12개월 환산",
                PRIMARY_LIGHT, blend(PRIMARY, WHITE, 0.5f), PRIMARY);

        top -= CH + GAP;

        // Source coverage strip
        final float STRIP_H = 48f;
        cv.rect(MARGIN, top, CONTENT_W, STRIP_H, CARD_BG, BORDER_COLOR, 0.75f);
        cv.text("SOURCE COVERAGE", MARGIN + 18f, top - 16f, FS_SMALL, TEXT_MUTED);

        float cx = MARGIN + 18f;
        boolean aws = analysis.sourceCoverage().aws();
        boolean k8s = analysis.sourceCoverage().k8s();
        boolean prom = analysis.sourceCoverage().prometheus();
        cx = cv.chip(cx, top - 32f, aws  ? "✓  AWS"        : "–  AWS",        aws  ? EMERALD_SOFT : CARD_SOFT, aws  ? blend(EMERALD, WHITE, 0.5f) : BORDER_COLOR, aws  ? EMERALD : TEXT_MUTED) + 10f;
        cx = cv.chip(cx, top - 32f, k8s  ? "✓  Kubernetes" : "–  Kubernetes", k8s  ? EMERALD_SOFT : CARD_SOFT, k8s  ? blend(EMERALD, WHITE, 0.5f) : BORDER_COLOR, k8s  ? EMERALD : TEXT_MUTED) + 10f;
        cv.chip(cx, top - 32f, prom ? "✓  Prometheus"  : "–  Prometheus", prom ? EMERALD_SOFT : CARD_SOFT, prom ? blend(EMERALD, WHITE, 0.5f) : BORDER_COLOR, prom ? EMERALD : TEXT_MUTED);

        cv.moveTo(top - STRIP_H - 28f);
    }

    private void drawExecutiveSummary(Canvas cv, OptimizationModels.ReportArtifact report) throws IOException {
        String summary = orFallback(report.payload().executiveSummary(), "분석 요약이 아직 생성되지 않았습니다.");

        float textH  = cv.measureWrapped(summary, CONTENT_W - 56f, FS_BODY, LH_BODY, 0);
        float boxH   = Math.max(100f, textH + 52f);

        cv.sectionHeader("경영 요약", "지금 왜 움직여야 하는지 한눈에 읽히게 정리합니다.");
        cv.ensureSpace(boxH + 12f);

        float top = cv.cursorY();
        cv.rect(MARGIN, top, CONTENT_W, boxH, CARD_BG, BORDER_COLOR, 0.75f);
        cv.rect(MARGIN, top, 4f, boxH, PRIMARY, null, 0);               // left accent
        cv.text("EXECUTIVE SUMMARY", MARGIN + 20f, top - 18f, FS_SMALL, PRIMARY);
        cv.wrappedText(summary, MARGIN + 20f, top - 36f, CONTENT_W - 56f, FS_BODY, LH_BODY, TEXT_DARK, 0);

        cv.moveTo(top - boxH - 20f);
    }

    private void drawRecommendationHighlights(Canvas cv, OptimizationModels.ReportArtifact report) throws IOException {
        cv.sectionHeader("핵심 권고", "절감 효과와 리스크를 함께 보여주는 상위 권고 카드입니다.");

        if (report.payload().topRecommendations().isEmpty()) {
            emptyCard(cv, "표시할 핵심 권고가 없습니다.");
            return;
        }

        for (OptimizationModels.ReportRecommendationHighlight rec : report.payload().topRecommendations()) {
            String rationale = orFallback(rec.rationale(), "상세 근거가 없습니다.");
            float rationaleH = cv.measureWrapped(rationale, CONTENT_W - 52f, FS_BODY, LH_BODY, 0);
            float boxH       = Math.max(110f, 80f + rationaleH + 16f);

            cv.ensureSpace(boxH + 12f);

            float top    = cv.cursorY();
            Color accent = riskColor(rec.riskLevel());
            cv.rect(MARGIN, top, CONTENT_W, boxH, CARD_BG, BORDER_COLOR, 0.75f);
            cv.rect(MARGIN, top, 5f, boxH, accent, null, 0);

            float cx = MARGIN + 20f;
            cv.text(rec.title(), cx, top - 20f, FS_H2, TEXT_DARK);

            float chipY = top - 38f;
            float nextX = cx;
            nextX = cv.chip(nextX, chipY, rec.targetResource(),                                         CARD_SOFT,                  BORDER_COLOR,                  TEXT_MID)    + 8f;
            nextX = cv.chip(nextX, chipY, "리스크 " + rec.riskLevel().toUpperCase(),                   blend(accent, WHITE, 0.82f), blend(accent, WHITE, 0.5f),    accent)      + 8f;
            cv.chip(nextX, chipY, "월 절감 " + formatKrw(rec.monthlySaving()),                          EMERALD_SOFT,               blend(EMERALD, WHITE, 0.5f),    EMERALD);

            cv.wrappedText(rationale, cx, top - 58f, CONTENT_W - 52f, FS_BODY, LH_BODY, TEXT_MID, 0);

            cv.moveTo(top - boxH - 10f);
        }
    }

    private void drawCostDrivers(Canvas cv, OptimizationModels.ReportArtifact report) throws IOException {
        cv.sectionHeader("비용 드라이버", "어디에서 가장 큰 비용이 발생하는지 상대 비중으로 표시합니다.");

        if (report.payload().topCostItems().isEmpty()) {
            emptyCard(cv, "비용 드라이버 데이터가 없습니다.");
            return;
        }

        final float ROW_H   = 48f;
        final float LABEL_W = 200f;
        final float BAR_X   = MARGIN + LABEL_W + 16f;
        final float BAR_W   = CONTENT_W - LABEL_W - 120f;
        final float COST_X  = MARGIN + CONTENT_W - 96f;

        float boxH = 32f + report.payload().topCostItems().size() * ROW_H;
        cv.ensureSpace(boxH + 12f);

        float top = cv.cursorY();
        cv.rect(MARGIN, top, CONTENT_W, boxH, CARD_BG, BORDER_COLOR, 0.75f);
        cv.text("TOP COST ITEMS", MARGIN + 18f, top - 18f, FS_SMALL, PRIMARY);

        // column headers
        cv.text("서비스 / 유형",  MARGIN + 18f,  top - 34f, FS_SMALL, TEXT_MUTED);
        cv.text("상대 비중",       BAR_X,         top - 34f, FS_SMALL, TEXT_MUTED);
        cv.text("월 비용",         COST_X,        top - 34f, FS_SMALL, TEXT_MUTED);

        long maxCost = report.payload().topCostItems().stream()
                .mapToLong(OptimizationModels.ReportCostHighlight::monthlyCost)
                .max().orElse(1L);

        float rowTop = top - 48f;
        for (OptimizationModels.ReportCostHighlight item : report.payload().topCostItems()) {
            float ratio  = maxCost <= 0 ? 0f : Math.min(1f, Math.max(0.04f, (float) item.monthlyCost() / maxCost));

            cv.hline(MARGIN + 18f, rowTop + 4f, CONTENT_W - 36f, BORDER_COLOR, 0.5f);

            cv.text(item.service(),   MARGIN + 18f, rowTop - 6f,  FS_BODY,  TEXT_DARK);
            cv.text(item.usageType() + "  ·  " + item.resourceCount() + " resources",
                    MARGIN + 18f, rowTop - 19f, FS_SMALL, TEXT_MUTED);

            // bar track
            cv.rect(BAR_X, rowTop - 2f,         BAR_W,         10f, CARD_SOFT,    BORDER_COLOR, 0.5f);
            cv.rect(BAR_X, rowTop - 2f,         BAR_W * ratio, 10f, PRIMARY,      null,         0);

            cv.text(formatKrw(item.monthlyCost()), COST_X, rowTop - 6f, FS_BODY, TEXT_DARK);

            rowTop -= ROW_H;
        }

        cv.moveTo(top - boxH - 24f);
    }

    private void drawExecutionPlan(Canvas cv, OptimizationModels.ReportArtifact report) throws IOException {
        cv.sectionHeader("실행 계획", "실행 명령과 롤백 경로까지 포함한 운영용 단계별 체크리스트입니다.");

        if (report.payload().executionPlan().isEmpty()) {
            emptyCard(cv, "실행 계획이 없습니다.");
            return;
        }

        final float NUM_W    = 44f;
        final float CODE_W   = CONTENT_W - NUM_W - 16f;
        final float CONTENT_X = MARGIN + NUM_W + 16f;

        int idx = 1;
        for (OptimizationModels.ReportExecutionStep step : report.payload().executionPlan()) {
            String cmd       = orFallback(step.commandSnippet(), "-");
            String rollback  = orFallback(step.rollbackSnippet(), "-");
            String rationale = orFallback(step.rationale(), "실행 배경 설명이 없습니다.");

            float cmdH       = cv.codeBlockHeight(cmd, CODE_W);
            float rollbackH  = cv.codeBlockHeight(rollback, CODE_W);
            float rationaleH = cv.measureWrapped(rationale, CODE_W, FS_BODY, LH_BODY, 0);
            float boxH       = 52f + 20f + cmdH + 10f + 20f + rollbackH + 10f + 20f + rationaleH + 16f;

            cv.ensureSpace(boxH + 14f);

            float top    = cv.cursorY();
            Color accent = riskColor(step.riskLevel());

            cv.rect(MARGIN, top, CONTENT_W, boxH, CARD_BG, BORDER_COLOR, 0.75f);

            // step number column
            cv.rect(MARGIN, top, NUM_W, boxH, blend(PRIMARY, WHITE, 0.88f), null, 0);
            float numFontSize = 15f;
            String numStr = String.format("%02d", idx);
            float numW = cv.textWidth(numStr, numFontSize);
            cv.text(numStr, MARGIN + (NUM_W - numW) / 2f, top - 20f, numFontSize, PRIMARY);

            // title + chips
            cv.text(step.title(), CONTENT_X, top - 18f, FS_H2, TEXT_DARK);

            float chipY  = top - 34f;
            float nextX  = CONTENT_X;
            nextX = cv.chip(nextX, chipY, step.targetResource(),                                    CARD_SOFT,                  BORDER_COLOR,                  TEXT_MID)    + 8f;
            nextX = cv.chip(nextX, chipY, "리스크 " + step.riskLevel().toUpperCase(),              blend(accent, WHITE, 0.82f), blend(accent, WHITE, 0.5f),    accent)      + 8f;
            cv.chip(nextX, chipY, "월 절감 " + formatKrw(step.monthlySaving()),                     EMERALD_SOFT,               blend(EMERALD, WHITE, 0.5f),    EMERALD);

            float bodyY = top - 56f;

            // command block
            cv.labeledCode(CONTENT_X, bodyY, CODE_W, "적용 명령", cmd, PRIMARY);
            bodyY -= cmdH + 10f;

            // rollback block
            cv.labeledCode(CONTENT_X, bodyY, CODE_W, "롤백 명령", rollback, ROSE);
            bodyY -= rollbackH + 10f;

            // rationale
            cv.text("실행 배경", CONTENT_X, bodyY, FS_SMALL, TEXT_MUTED);
            cv.wrappedText(rationale, CONTENT_X, bodyY - 14f, CODE_W, FS_BODY, LH_BODY, TEXT_DARK, 0);

            cv.moveTo(top - boxH - 12f);
            idx++;
        }
    }

    private void drawWarnings(Canvas cv, OptimizationModels.ReportArtifact report) throws IOException {
        if (report.payload().warnings().isEmpty()) return;

        float textH = 0f;
        for (String w : report.payload().warnings()) {
            textH += cv.measureWrapped("• " + w, CONTENT_W - 44f, FS_BODY, LH_BODY, 0) + 4f;
        }
        float boxH = Math.max(80f, 40f + textH);

        cv.ensureSpace(boxH + 12f);

        float top = cv.cursorY();
        cv.rect(MARGIN, top, CONTENT_W, boxH, AMBER_SOFT, blend(AMBER, WHITE, 0.5f), 0.75f);
        cv.rect(MARGIN, top, 4f, boxH, AMBER, null, 0);
        cv.text("⚠  주의 사항", MARGIN + 18f, top - 18f, FS_H2, AMBER);

        float ty = top - 36f;
        for (String w : report.payload().warnings()) {
            ty = cv.wrappedText("• " + w, MARGIN + 18f, ty, CONTENT_W - 44f, FS_BODY, LH_BODY, TEXT_DARK, 0) - 4f;
        }

        cv.moveTo(top - boxH - 8f);
    }

    // ─── Helpers ─────────────────────────────────────────────────────────────

    private void metricCard(
            Canvas cv, float x, float top, float w, float h,
            String label, String value, String helper,
            Color bg, Color border, Color accent
    ) throws IOException {
        cv.rect(x, top, w, h, bg, border, 0.75f);
        cv.text(label,  x + 18f, top - 16f, FS_SMALL, TEXT_MUTED);
        cv.text(value,  x + 18f, top - 40f, 18f,      accent);
        cv.text(helper, x + 18f, top - 57f, FS_SMALL, TEXT_MUTED);
    }

    private void emptyCard(Canvas cv, String msg) throws IOException {
        cv.ensureSpace(72f);
        float top = cv.cursorY();
        cv.rect(MARGIN, top, CONTENT_W, 72f, CARD_SOFT, BORDER_COLOR, 0.75f);
        cv.text(msg, MARGIN + 18f, top - 30f, FS_BODY, TEXT_MUTED);
        cv.moveTo(top - 84f);
    }

    private static String formatKrw(long value) {
        return String.format("%,d원", value);
    }

    private static String orFallback(String v, String fallback) {
        return (v == null || v.isBlank()) ? fallback : v;
    }

    private static Color riskColor(String level) {
        return switch (level == null ? "" : level.trim().toLowerCase()) {
            case "high"   -> ROSE;
            case "medium" -> AMBER;
            case "low"    -> EMERALD;
            default       -> PRIMARY;
        };
    }

    /** Mix `a` toward `b` by `t` (0=a, 1=b) */
    private static Color blend(Color a, Color b, float t) {
        float s = 1f - t;
        return new Color(
                clamp(Math.round(a.getRed()   * s + b.getRed()   * t)),
                clamp(Math.round(a.getGreen() * s + b.getGreen() * t)),
                clamp(Math.round(a.getBlue()  * s + b.getBlue()  * t))
        );
    }

    private static int clamp(long v) { return (int) Math.max(0, Math.min(255, v)); }

    // ─── Canvas ──────────────────────────────────────────────────────────────

    private static final class Canvas {
        private final PDDocument doc;
        private final PDFont     font;
        private PDPage           page;
        private PDPageContentStream cs;
        private int              pageNum = 0;
        private float            curY;

        Canvas(PDDocument doc, PDFont font) throws IOException {
            this.doc  = doc;
            this.font = font;
            openPage();
        }

        float cursorY() { return curY; }
        void  moveTo(float y) { curY = y; }

        void newPage()  throws IOException { openPage(); }
        void finish()   throws IOException { closePage(); }

        void ensureSpace(float needed) throws IOException {
            if (curY - needed < MARGIN + FOOTER_H) openPage();
        }

        // ── drawing primitives ───────────────────────────────────────────────

        /**
         * Draw a filled/stroked rectangle.
         * @param topY the TOP edge Y coordinate (PDFBox origin = bottom-left, so we subtract height internally)
         */
        void rect(float x, float topY, float w, float h, Color fill, Color stroke, float strokeW) throws IOException {
            float bottom = topY - h;
            if (fill != null) {
                cs.setNonStrokingColor(fill);
                cs.addRect(x, bottom, w, h);
                cs.fill();
            }
            if (stroke != null && strokeW > 0) {
                cs.setStrokingColor(stroke);
                cs.setLineWidth(strokeW);
                cs.addRect(x, bottom, w, h);
                cs.stroke();
            }
        }

        void hline(float x, float y, float w, Color color, float lw) throws IOException {
            cs.setStrokingColor(color);
            cs.setLineWidth(lw);
            cs.moveTo(x, y);
            cs.lineTo(x + w, y);
            cs.stroke();
        }

        void text(String t, float x, float baselineY, float size, Color color) throws IOException {
            if (t == null || t.isBlank()) return;
            cs.beginText();
            cs.setNonStrokingColor(color);
            cs.setFont(font, size);
            cs.newLineAtOffset(x, baselineY);
            cs.showText(t);
            cs.endText();
        }

        /** Returns the next Y (baseline after the last line). */
        float wrappedText(String text, float x, float topBaselineY, float w,
                          float size, float lh, Color color, int maxLines) throws IOException {
            List<String> lines = wrap(text, w, size, false);
            if (maxLines > 0 && lines.size() > maxLines) {
                lines = new ArrayList<>(lines.subList(0, maxLines));
                String last = lines.get(lines.size() - 1);
                lines.set(lines.size() - 1, last.length() > 1 ? last.substring(0, last.length() - 1) + "…" : "…");
            }
            float y = topBaselineY;
            for (String line : lines) {
                text(line, x, y, size, color);
                y -= lh;
            }
            return y;
        }

        float measureWrapped(String text, float w, float size, float lh, int maxLines) throws IOException {
            List<String> lines = wrap(text, w, size, false);
            if (maxLines > 0 && lines.size() > maxLines) lines = lines.subList(0, maxLines);
            return Math.max(lh, lines.size() * lh);
        }

        float textWidth(String t, float size) throws IOException {
            return (font.getStringWidth(t) / 1000f) * size;
        }

        /**
         * Draw a pill/chip badge. Returns the right edge X so caller can chain.
         */
        float chip(float x, float baselineY, String text, Color bg, Color border, Color textColor) throws IOException {
            float tw  = textWidth(text, FS_SMALL);
            float cw  = tw + 18f;
            float ch  = 18f;
            float top = baselineY + ch - 4f;
            rect(x, top, cw, ch, bg, border, 0.5f);
            text(text, x + 9f, baselineY, FS_SMALL, textColor);
            return x + cw;
        }

        void sectionHeader(String title, String subtitle) throws IOException {
            ensureSpace(48f);
            // left accent bar
            rect(MARGIN, curY + 2f, 3f, FS_H1 + 4f, PRIMARY, null, 0);
            text(title,    MARGIN + 12f, curY,        FS_H1,   TEXT_DARK);
            text(subtitle, MARGIN + 12f, curY - 17f, FS_SMALL, TEXT_MUTED);
            hline(MARGIN, curY - 27f, CONTENT_W, BORDER_COLOR, 0.75f);
            curY -= 40f;
        }

        // ── code blocks ──────────────────────────────────────────────────────

        float codeBlockHeight(String code, float w) throws IOException {
            float linesH = measureWrapped(code, w - 28f, FS_SMALL, LH_SMALL, 0, true);
            return 22f + linesH + 14f;   // header + content + bottom pad
        }

        /** Draws a labeled code block. Label appears as a small text above the block. */
        void labeledCode(float x, float topY, float w, String label, String code, Color accentColor) throws IOException {
            // label
            text(label, x, topY, FS_SMALL, TEXT_MUTED);
            float blockTop = topY - 14f;
            float h = codeBlockHeight(code, w);
            // bg
            rect(x, blockTop, w, h, CODE_BG, accentColor, 0.75f);
            // header strip
            rect(x, blockTop, w, 22f, CODE_HEADER, null, 0);
            // left accent line
            rect(x, blockTop, 4f, h, accentColor, null, 0);
            // header label
            text(label, x + 10f, blockTop - 14f, FS_SMALL, blend(accentColor, WHITE, 0.3f));
            // code text
            wrappedText(code, x + 12f, blockTop - 26f, w - 28f, FS_SMALL, LH_SMALL, CODE_TEXT, 0, true);
        }

        private float measureWrapped(String text, float w, float size, float lh, int maxLines, boolean wordBreak) throws IOException {
            List<String> lines = wrap(text, w, size, wordBreak);
            if (maxLines > 0 && lines.size() > maxLines) lines = lines.subList(0, maxLines);
            return Math.max(lh, lines.size() * lh);
        }

        private float wrappedText(String text, float x, float topY, float w,
                                   float size, float lh, Color color, int maxLines, boolean wordBreak) throws IOException {
            List<String> lines = wrap(text, w, size, wordBreak);
            if (maxLines > 0 && lines.size() > maxLines) lines = lines.subList(0, maxLines);
            float y = topY;
            for (String line : lines) {
                text(line, x, y, size, color);
                y -= lh;
            }
            return y;
        }

        // ── text wrapping ────────────────────────────────────────────────────

        private List<String> wrap(String text, float maxW, float size, boolean wordBreak) throws IOException {
            String normalized = text == null ? "" : text.replace("\r", "");
            if (normalized.isBlank()) return List.of(" ");

            List<String> result = new ArrayList<>();
            for (String para : normalized.split("\n", -1)) {
                if (para.isBlank()) { result.add(" "); continue; }
                wrapParagraph(para, maxW, size, wordBreak, result);
            }
            return result.isEmpty() ? List.of(" ") : result;
        }

        private void wrapParagraph(String para, float maxW, float size, boolean wordBreak, List<String> out) throws IOException {
            if (wordBreak) {
                StringBuilder cur = new StringBuilder();
                for (String token : para.split(" ", -1)) {
                    String candidate = cur.isEmpty() ? token : cur + " " + token;
                    if (tw(candidate, size) <= maxW) {
                        cur = new StringBuilder(candidate);
                    } else {
                        if (!cur.isEmpty()) { out.add(cur.toString()); cur = new StringBuilder(); }
                        if (tw(token, size) <= maxW) {
                            cur.append(token);
                        } else {
                            wrapParagraph(token, maxW, size, false, out);
                        }
                    }
                }
                if (!cur.isEmpty()) out.add(cur.toString());
            } else {
                StringBuilder cur = new StringBuilder();
                for (int i = 0; i < para.length(); i++) {
                    char ch = para.charAt(i);
                    cur.append(ch);
                    if (tw(cur.toString(), size) > maxW) {
                        cur.deleteCharAt(cur.length() - 1);
                        if (!cur.isEmpty()) { out.add(cur.toString()); cur = new StringBuilder(); }
                        cur.append(ch);
                    }
                }
                if (!cur.isEmpty()) out.add(cur.toString());
            }
        }

        private float tw(String t, float size) throws IOException {
            return (font.getStringWidth(t) / 1000f) * size;
        }

        // ── page management ──────────────────────────────────────────────────

        private void openPage() throws IOException {
            closePage();
            page = new PDPage(PDRectangle.A4);
            doc.addPage(page);
            cs = new PDPageContentStream(doc, page);
            pageNum++;
            curY = PAGE_HEIGHT - MARGIN;
            // page background
            rect(0, PAGE_HEIGHT, PAGE_WIDTH, PAGE_HEIGHT, PAGE_BG, null, 0);
        }

        private void closePage() throws IOException {
            if (cs == null) return;
            drawFooter();
            cs.close();
            cs = null;
        }

        private void drawFooter() throws IOException {
            float y = FOOTER_H - 6f;
            hline(MARGIN, FOOTER_H + 8f, CONTENT_W, BORDER_COLOR, 0.5f);
            text("JeolgamAI  ·  Integrated Cost Report", MARGIN, y, FS_SMALL, TEXT_MUTED);
            String pg = "Page " + pageNum;
            float pgW = (font.getStringWidth(pg) / 1000f) * FS_SMALL;
            text(pg, PAGE_WIDTH - MARGIN - pgW, y, FS_SMALL, TEXT_MUTED);
        }
    }
}
