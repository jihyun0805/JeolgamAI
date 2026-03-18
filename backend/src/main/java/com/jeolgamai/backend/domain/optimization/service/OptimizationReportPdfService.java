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

/**
 * PDF 레이아웃 좌표 규칙
 *  - PDFBox 원점: 페이지 좌측 하단 (Y=0)
 *  - cursorY: 다음 요소를 그릴 "상단 Y" 위치 (페이지 위에서 아래로 감소)
 *  - rect(x, topY, w, h) → addRect(x, topY-h, w, h)  ← topY가 사각형의 상단
 *  - text baseline 은 topY 아래로 fontSize*0.3 정도 여백이 있어야 글씨가 잘림 없이 출력됨
 */
@Service
public class OptimizationReportPdfService {

    // ── Page geometry ──────────────────────────────────────────────────────
    private static final float PW   = PDRectangle.A4.getWidth();    // 595.28
    private static final float PH   = PDRectangle.A4.getHeight();   // 841.89
    private static final float M    = 44f;                           // margin
    private static final float CW   = PW - M * 2f;                  // 507.28
    private static final float SAFE = M + 28f;                      // footer safe zone

    // ── Font sizes ────────────────────────────────────────────────────────
    private static final float F_DISPLAY = 28f;
    private static final float F_H1      = 15f;
    private static final float F_H2      = 11.5f;
    private static final float F_BODY    = 9.5f;
    private static final float F_SMALL   = 8f;
    private static final float LH_BODY   = 14.5f;
    private static final float LH_CODE   = 12f;

    // ── Palette ───────────────────────────────────────────────────────────
    private static final Color C_BG         = new Color(246, 248, 252);  // page bg
    private static final Color C_HERO       = new Color(10, 13, 20);     // hero bg
    private static final Color C_HERO_CARD  = new Color(20, 26, 40);     // score card bg
    private static final Color C_HERO_LINE  = new Color(38, 50, 78);     // hero divider
    private static final Color C_PRIMARY    = new Color(28, 89, 242);    // #1c59f2
    private static final Color C_PRI_LIGHT  = new Color(219, 234, 254);
    private static final Color C_PRI_DIM    = new Color(147, 197, 253);
    private static final Color C_WHITE      = Color.WHITE;
    private static final Color C_CARD       = Color.WHITE;
    private static final Color C_CARD_SOFT  = new Color(248, 250, 252);
    private static final Color C_BORDER     = new Color(226, 232, 240);
    private static final Color C_TEXT       = new Color(15, 23, 42);
    private static final Color C_MID        = new Color(71, 85, 105);
    private static final Color C_MUTED      = new Color(148, 163, 184);
    private static final Color C_EMERALD    = new Color(5, 150, 105);
    private static final Color C_EME_SOFT   = new Color(209, 250, 229);
    private static final Color C_ROSE       = new Color(225, 29, 72);
    private static final Color C_ROSE_SOFT  = new Color(255, 228, 230);
    private static final Color C_AMBER      = new Color(202, 138, 4);
    private static final Color C_AMB_SOFT   = new Color(254, 243, 199);
    private static final Color C_CODE_BG    = new Color(15, 23, 42);
    private static final Color C_CODE_HEAD  = new Color(25, 34, 56);
    private static final Color C_CODE_TEXT  = new Color(203, 213, 225);

    private static final String FONT_PATH = "fonts/NotoSansKR-VariableFont_wght.ttf";

    // ── Public API ────────────────────────────────────────────────────────

    public byte[] renderIntegratedReport(
            OptimizationModels.ProjectSummary project,
            OptimizationModels.AnalysisSnapshot analysis,
            OptimizationModels.ReportArtifact report
    ) {
        try (PDDocument doc = new PDDocument();
             InputStream fs = new ClassPathResource(FONT_PATH).getInputStream()) {

            PDType0Font font = PDType0Font.load(doc, fs, true);
            Pen pen = new Pen(doc, font);

            page1(pen, project, analysis, report);
            pen.newPage();
            page2(pen, report);

            pen.close();

            ByteArrayOutputStream buf = new ByteArrayOutputStream();
            doc.save(buf);
            return buf.toByteArray();

        } catch (IOException e) {
            throw new IllegalStateException("PDF 생성에 실패했습니다.", e);
        }
    }

    // ── Page builders ─────────────────────────────────────────────────────

    private void page1(
            Pen pen,
            OptimizationModels.ProjectSummary project,
            OptimizationModels.AnalysisSnapshot analysis,
            OptimizationModels.ReportArtifact report
    ) throws IOException {
        heroBlock(pen, project, analysis, report);
        metricsRow(pen, report);
        coverageStrip(pen, analysis);
        executiveSummary(pen, report);
        recommendationHighlights(pen, report);
    }

    private void page2(Pen pen, OptimizationModels.ReportArtifact report) throws IOException {
        costDrivers(pen, report);
        executionPlan(pen, report);
        warnings(pen, report);
    }

    // ── Section: Hero ─────────────────────────────────────────────────────

    private void heroBlock(
            Pen pen,
            OptimizationModels.ProjectSummary project,
            OptimizationModels.AnalysisSnapshot analysis,
            OptimizationModels.ReportArtifact report
    ) throws IOException {
        final float H       = 220f;
        final float PAD     = 28f;
        final float SC_W    = 158f;
        final float SC_H    = 116f;
        final float TOP     = pen.top();                          // current cursor Y

        // ── dark background ──────────────────────────────────────────────
        pen.fillRect(M, TOP, CW, H, C_HERO);

        // ── top accent bar (4pt) ─────────────────────────────────────────
        pen.fillRect(M, TOP, CW, 4f, C_PRIMARY);

        // ── score card (right, vertically centered) ───────────────────────
        float scX   = M + CW - SC_W - PAD;
        float scTop = TOP - (H - SC_H) / 2f;                    // vertically center
        pen.fillRect(scX, scTop, SC_W, SC_H, C_HERO_CARD);
        pen.strokeRect(scX, scTop, SC_W, SC_H, C_HERO_LINE, 1f);

        pen.text("ANALYSIS SCORE",                  scX + 16f, scTop - 18f, F_SMALL,   C_MUTED);
        pen.text(analysis.score().totalScore() + "점", scX + 16f, scTop - 46f, 24f,    C_WHITE);
        pen.text(analysis.score().grade(),           scX + 16f, scTop - 62f, F_SMALL,  C_PRI_DIM);
        pen.hline(scX + 16f, scTop - 74f, SC_W - 32f, C_HERO_LINE, 0.75f);
        pen.text("예상 월 절감",                     scX + 16f, scTop - 88f, F_SMALL,  C_MUTED);
        pen.text(krw(report.payload().monthlySaving()), scX + 16f, scTop - 102f, F_SMALL, C_EMERALD);

        // ── left: text block ─────────────────────────────────────────────
        float tx = M + PAD;
        pen.text("INTEGRATED COST REPORT",   tx, TOP - 22f,   F_SMALL,   C_PRI_DIM);
        pen.text(project.name(),             tx, TOP - 56f,   F_DISPLAY, C_WHITE);
        pen.text("경영 요약과 실행 리스크를 한눈에 보는 비용 최적화 리포트",
                                             tx, TOP - 80f,   F_BODY,    C_MUTED);

        // ── bottom meta chips ─────────────────────────────────────────────
        float metaY = TOP - H + 30f;                            // 30pt above hero bottom
        float cx = tx;
        cx = pen.chip(cx, metaY, "리포트 " + report.id(),           C_HERO_CARD, C_HERO_LINE, C_MUTED) + 8f;
        cx = pen.chip(cx, metaY, "리전 " + analysis.awsRegion(),    C_HERO_CARD, C_HERO_LINE, C_MUTED) + 8f;
        pen.chip(cx, metaY, "생성 " + report.createdAt(),            C_HERO_CARD, C_HERO_LINE, C_MUTED);

        pen.advance(H + 20f);
    }

    // ── Section: 4-metric row ─────────────────────────────────────────────

    private void metricsRow(Pen pen, OptimizationModels.ReportArtifact report) throws IOException {
        final float G  = 10f;
        final float CW4 = (CW - G * 3f) / 4f;
        final float CH = 72f;

        float top = pen.top();
        float x = M;

        metricCard(pen, x, top, CW4, CH, "총 월 비용",
                krw(report.payload().totalMonthlyCost()), "현재 추정 기준",
                C_CARD, C_BORDER, C_TEXT);
        x += CW4 + G;
        metricCard(pen, x, top, CW4, CH, "낭비 비용",
                krw(report.payload().wasteCost()), "비용 제거 여지",
                C_ROSE_SOFT, mix(C_ROSE, C_WHITE, 0.55f), C_ROSE);
        x += CW4 + G;
        metricCard(pen, x, top, CW4, CH, "예상 월 절감",
                krw(report.payload().monthlySaving()), "우선 적용 항목",
                C_EME_SOFT, mix(C_EMERALD, C_WHITE, 0.55f), C_EMERALD);
        x += CW4 + G;
        metricCard(pen, x, top, CW4, CH, "예상 연 절감",
                krw(report.payload().annualSaving()), "12개월 환산",
                C_PRI_LIGHT, mix(C_PRIMARY, C_WHITE, 0.45f), C_PRIMARY);

        pen.advance(CH + 14f);
    }

    // ── Section: source coverage strip ───────────────────────────────────

    private void coverageStrip(Pen pen, OptimizationModels.AnalysisSnapshot analysis) throws IOException {
        final float H = 50f;
        float top = pen.top();

        pen.fillRect(M, top, CW, H, C_CARD);
        pen.strokeRect(M, top, CW, H, C_BORDER, 0.75f);

        pen.text("SOURCE COVERAGE", M + 18f, top - 15f, F_SMALL, C_MUTED);

        boolean aws  = analysis.sourceCoverage().aws();
        boolean k8s  = analysis.sourceCoverage().k8s();
        boolean prom = analysis.sourceCoverage().prometheus();

        float cx = M + 18f;
        cx = pen.chip(cx, top - 34f,
                aws  ? "✓  AWS"        : "–  AWS",
                aws  ? C_EME_SOFT : C_CARD_SOFT,
                aws  ? mix(C_EMERALD, C_WHITE, 0.5f) : C_BORDER,
                aws  ? C_EMERALD : C_MUTED) + 10f;
        cx = pen.chip(cx, top - 34f,
                k8s  ? "✓  Kubernetes" : "–  Kubernetes",
                k8s  ? C_EME_SOFT : C_CARD_SOFT,
                k8s  ? mix(C_EMERALD, C_WHITE, 0.5f) : C_BORDER,
                k8s  ? C_EMERALD : C_MUTED) + 10f;
        pen.chip(cx, top - 34f,
                prom ? "✓  Prometheus" : "–  Prometheus",
                prom ? C_EME_SOFT : C_CARD_SOFT,
                prom ? mix(C_EMERALD, C_WHITE, 0.5f) : C_BORDER,
                prom ? C_EMERALD : C_MUTED);

        pen.advance(H + 24f);
    }

    // ── Section: Executive Summary ────────────────────────────────────────

    private void executiveSummary(Pen pen, OptimizationModels.ReportArtifact report) throws IOException {
        sectionTitle(pen, "경영 요약", "지금 왜 움직여야 하는지 한눈에 읽히게 정리합니다.");

        String text = fallback(report.payload().executiveSummary(), "분석 요약이 아직 생성되지 않았습니다.");
        final float IPAD = 22f;                                  // inner horizontal pad
        float textH  = pen.wrapHeight(text, CW - IPAD * 2f, F_BODY, LH_BODY, 0);
        float cardH  = Math.max(88f, 32f + textH + 20f);

        pen.ensureSpace(cardH + 12f);
        float top = pen.top();

        pen.fillRect(M, top, CW, cardH, C_CARD);
        pen.strokeRect(M, top, CW, cardH, C_BORDER, 0.75f);
        pen.fillRect(M, top, 5f, cardH, C_PRIMARY);              // left accent

        pen.text("EXECUTIVE SUMMARY", M + IPAD, top - 18f, F_SMALL, C_PRIMARY);
        pen.wrappedText(text, M + IPAD, top - 34f, CW - IPAD * 2f, F_BODY, LH_BODY, C_TEXT, 0);

        pen.advance(cardH + 14f);
    }

    // ── Section: Recommendation Highlights ────────────────────────────────

    private void recommendationHighlights(Pen pen, OptimizationModels.ReportArtifact report) throws IOException {
        sectionTitle(pen, "핵심 권고", "절감 효과와 리스크를 함께 보여주는 상위 권고 카드입니다.");

        if (report.payload().topRecommendations().isEmpty()) {
            emptyCard(pen, "표시할 핵심 권고가 없습니다.");
            return;
        }

        for (OptimizationModels.ReportRecommendationHighlight rec : report.payload().topRecommendations()) {
            String rationale = fallback(rec.rationale(), "상세 근거가 없습니다.");
            float ratH  = pen.wrapHeight(rationale, CW - 48f, F_BODY, LH_BODY, 0);
            float cardH = 26f + 22f + 14f + ratH + 20f;        // title + chips + gap + text + pad

            pen.ensureSpace(cardH + 10f);
            float top = pen.top();

            Color accent = riskColor(rec.riskLevel());
            pen.fillRect(M, top, CW, cardH, C_CARD);
            pen.strokeRect(M, top, CW, cardH, C_BORDER, 0.75f);
            pen.fillRect(M, top, 5f, cardH, accent);

            float cx = M + 20f;

            // title
            pen.text(rec.title(), cx, top - 18f, F_H2, C_TEXT);

            // chips row
            float chipY = top - 36f;
            float nx = cx;
            nx = pen.chip(nx, chipY, rec.targetResource(),                                   C_CARD_SOFT,              C_BORDER,                       C_MID)     + 7f;
            nx = pen.chip(nx, chipY, "리스크 " + rec.riskLevel().toUpperCase(),              mix(accent, C_WHITE, 0.82f), mix(accent, C_WHITE, 0.5f),   accent)    + 7f;
            pen.chip(nx, chipY, "월 절감 " + krw(rec.monthlySaving()),                        C_EME_SOFT,               mix(C_EMERALD, C_WHITE, 0.5f),  C_EMERALD);

            // rationale
            pen.wrappedText(rationale, cx, top - 56f, CW - 48f, F_BODY, LH_BODY, C_MID, 0);

            pen.advance(cardH + 10f);
        }
    }

    // ── Section: Cost Drivers ─────────────────────────────────────────────

    private void costDrivers(Pen pen, OptimizationModels.ReportArtifact report) throws IOException {
        sectionTitle(pen, "비용 드라이버", "어디에서 가장 큰 비용이 발생하는지 상대 비중으로 표시합니다.");

        if (report.payload().topCostItems().isEmpty()) {
            emptyCard(pen, "비용 드라이버 데이터가 없습니다.");
            return;
        }

        final float ROW_H   = 46f;
        final float SVCW    = 190f;                              // service name column width
        final float BAR_X   = M + SVCW + 14f;
        final float BAR_W   = CW - SVCW - 110f;
        final float AMT_X   = M + CW - 92f;

        int rows = report.payload().topCostItems().size();
        float cardH = 34f + rows * ROW_H + 8f;

        pen.ensureSpace(cardH + 12f);
        float top = pen.top();

        pen.fillRect(M, top, CW, cardH, C_CARD);
        pen.strokeRect(M, top, CW, cardH, C_BORDER, 0.75f);
        pen.fillRect(M, top, 5f, cardH, C_PRIMARY);

        // header row
        pen.text("서비스",   M + 20f, top - 18f, F_SMALL, C_MUTED);
        pen.text("상대 비중", BAR_X,   top - 18f, F_SMALL, C_MUTED);
        pen.text("월 비용",  AMT_X,   top - 18f, F_SMALL, C_MUTED);
        pen.hline(M + 5f, top - 28f, CW - 5f, C_BORDER, 0.75f);

        long maxCost = report.payload().topCostItems().stream()
                .mapToLong(OptimizationModels.ReportCostHighlight::monthlyCost)
                .max().orElse(1L);

        float rowTop = top - 34f;
        for (OptimizationModels.ReportCostHighlight item : report.payload().topCostItems()) {
            float ratio = maxCost <= 0 ? 0f : Math.min(1f, Math.max(0.04f, (float) item.monthlyCost() / maxCost));

            pen.text(item.service(),
                    M + 20f, rowTop - 6f, F_BODY, C_TEXT);
            pen.text(item.usageType() + "  ·  " + item.resourceCount() + " res",
                    M + 20f, rowTop - 19f, F_SMALL, C_MUTED);

            // bar
            pen.fillRect(BAR_X, rowTop - 4f, BAR_W,          9f, C_CARD_SOFT);
            pen.strokeRect(BAR_X, rowTop - 4f, BAR_W,         9f, C_BORDER, 0.5f);
            pen.fillRect(BAR_X, rowTop - 4f, BAR_W * ratio,  9f, C_PRIMARY);

            pen.text(krw(item.monthlyCost()), AMT_X, rowTop - 6f, F_BODY, C_TEXT);

            if (rowTop > top - 34f - (rows - 1) * ROW_H) {   // not last row
                pen.hline(M + 5f, rowTop - ROW_H + 2f, CW - 5f, C_BORDER, 0.4f);
            }
            rowTop -= ROW_H;
        }

        pen.advance(cardH + 24f);
    }

    // ── Section: Execution Plan ───────────────────────────────────────────

    private void executionPlan(Pen pen, OptimizationModels.ReportArtifact report) throws IOException {
        sectionTitle(pen, "실행 계획", "실행 명령과 롤백 경로까지 포함한 운영용 단계별 체크리스트입니다.");

        if (report.payload().executionPlan().isEmpty()) {
            emptyCard(pen, "실행 계획이 없습니다.");
            return;
        }

        final float NUM_W  = 48f;
        final float BODY_X = M + NUM_W + 14f;
        final float BODY_W = CW - NUM_W - 14f;

        int idx = 1;
        for (OptimizationModels.ReportExecutionStep step : report.payload().executionPlan()) {
            String cmd       = fallback(step.commandSnippet(), "-");
            String rollback  = fallback(step.rollbackSnippet(), "-");
            String rationale = fallback(step.rationale(), "실행 배경 설명이 없습니다.");

            // Heights (each code block = 14pt label + block height)
            float cmdH      = pen.codeBlockH(cmd, BODY_W);
            float rollbackH = pen.codeBlockH(rollback, BODY_W);
            float rationaleH = pen.wrapHeight(rationale, BODY_W, F_BODY, LH_BODY, 0);

            //  [title]            20pt
            //  [chips]            18pt
            //  gap                16pt
            //  label + code       14 + cmdH
            //  gap                12pt
            //  label + rollback   14 + rollbackH
            //  gap                12pt
            //  label + rationale  14 + rationaleH
            //  bottom pad         16pt
            float cardH = 20f + 18f + 16f
                    + 14f + cmdH + 12f
                    + 14f + rollbackH + 12f
                    + 14f + rationaleH + 16f;

            pen.ensureSpace(cardH + 12f);
            float top = pen.top();

            Color accent = riskColor(step.riskLevel());

            pen.fillRect(M, top, CW, cardH, C_CARD);
            pen.strokeRect(M, top, CW, cardH, C_BORDER, 0.75f);

            // Number column
            pen.fillRect(M, top, NUM_W, cardH, mix(C_PRIMARY, C_WHITE, 0.88f));
            String numStr = String.format("%02d", idx);
            float numW = pen.textW(numStr, 16f);
            pen.text(numStr, M + (NUM_W - numW) / 2f, top - 22f, 16f, C_PRIMARY);

            // Title + chips
            pen.text(step.title(), BODY_X, top - 18f, F_H2, C_TEXT);

            float chipY = top - 34f;
            float nx    = BODY_X;
            nx = pen.chip(nx, chipY, step.targetResource(),                                  C_CARD_SOFT,                C_BORDER,                       C_MID)     + 7f;
            nx = pen.chip(nx, chipY, "리스크 " + step.riskLevel().toUpperCase(),             mix(accent, C_WHITE, 0.82f), mix(accent, C_WHITE, 0.5f),    accent)    + 7f;
            pen.chip(nx, chipY, "월 절감 " + krw(step.monthlySaving()),                       C_EME_SOFT,                 mix(C_EMERALD, C_WHITE, 0.5f), C_EMERALD);

            // Body content — track Y from top downward
            float bodyY = top - 54f;                             // start of body section

            // Command
            pen.text("적용 명령", BODY_X, bodyY, F_SMALL, C_MUTED);
            bodyY -= 14f;
            pen.codeBlock(BODY_X, bodyY, BODY_W, "bash", cmd, C_PRIMARY);
            bodyY -= cmdH + 12f;

            // Rollback
            pen.text("롤백 명령", BODY_X, bodyY, F_SMALL, C_MUTED);
            bodyY -= 14f;
            pen.codeBlock(BODY_X, bodyY, BODY_W, "rollback", rollback, C_ROSE);
            bodyY -= rollbackH + 12f;

            // Rationale
            pen.text("실행 배경", BODY_X, bodyY, F_SMALL, C_MUTED);
            bodyY -= 14f;
            pen.wrappedText(rationale, BODY_X, bodyY, BODY_W, F_BODY, LH_BODY, C_TEXT, 0);

            pen.advance(cardH + 12f);
            idx++;
        }
    }

    // ── Section: Warnings ─────────────────────────────────────────────────

    private void warnings(Pen pen, OptimizationModels.ReportArtifact report) throws IOException {
        if (report.payload().warnings().isEmpty()) return;

        float textH = 0f;
        for (String w : report.payload().warnings()) {
            textH += pen.wrapHeight("• " + w, CW - 40f, F_BODY, LH_BODY, 0) + 4f;
        }
        float cardH = Math.max(72f, 36f + textH + 16f);

        pen.ensureSpace(cardH + 12f);
        float top = pen.top();

        pen.fillRect(M, top, CW, cardH, C_AMB_SOFT);
        pen.strokeRect(M, top, CW, cardH, mix(C_AMBER, C_WHITE, 0.45f), 0.75f);
        pen.fillRect(M, top, 5f, cardH, C_AMBER);

        pen.text("주의 사항", M + 20f, top - 17f, F_H2, C_AMBER);
        pen.hline(M + 5f, top - 28f, CW - 5f, mix(C_AMBER, C_WHITE, 0.6f), 0.5f);

        float ty = top - 36f;
        for (String w : report.payload().warnings()) {
            ty = pen.wrappedText("• " + w, M + 20f, ty, CW - 40f, F_BODY, LH_BODY, C_TEXT, 0) - 4f;
        }

        pen.advance(cardH + 8f);
    }

    // ── Reusable element builders ─────────────────────────────────────────

    private void sectionTitle(Pen pen, String title, String subtitle) throws IOException {
        pen.ensureSpace(50f);
        float top = pen.top();

        pen.fillRect(M, top + 2f, 4f, F_H1 + 8f, C_PRIMARY);
        pen.text(title,    M + 14f, top,        F_H1,    C_TEXT);
        pen.text(subtitle, M + 14f, top - 17f, F_SMALL, C_MUTED);
        pen.hline(M, top - 28f, CW, C_BORDER, 0.75f);

        pen.advance(42f);
    }

    private void metricCard(
            Pen pen, float x, float top, float w, float h,
            String label, String value, String helper,
            Color bg, Color border, Color accent
    ) throws IOException {
        pen.fillRect(x, top, w, h, bg);
        pen.strokeRect(x, top, w, h, border, 0.75f);
        pen.fillRect(x, top, 4f, h, accent);
        pen.text(label,  x + 16f, top - 14f, F_SMALL, C_MUTED);
        pen.text(value,  x + 16f, top - 38f, 17f,     accent);
        pen.text(helper, x + 16f, top - 54f, F_SMALL, C_MUTED);
    }

    private void emptyCard(Pen pen, String msg) throws IOException {
        pen.ensureSpace(68f);
        float top = pen.top();
        pen.fillRect(M, top, CW, 68f, C_CARD_SOFT);
        pen.strokeRect(M, top, CW, 68f, C_BORDER, 0.75f);
        pen.text(msg, M + 18f, top - 28f, F_BODY, C_MUTED);
        pen.advance(80f);
    }

    // ── Util ──────────────────────────────────────────────────────────────

    private static String krw(long v) {
        return String.format("%,d원", v);
    }

    private static String fallback(String v, String def) {
        return (v == null || v.isBlank()) ? def : v;
    }

    private static Color riskColor(String level) {
        return switch (level == null ? "" : level.trim().toLowerCase()) {
            case "high"   -> C_ROSE;
            case "medium" -> C_AMBER;
            case "low"    -> C_EMERALD;
            default       -> C_PRIMARY;
        };
    }

    /** mix: 0=a, 1=b */
    private static Color mix(Color a, Color b, float t) {
        float s = 1f - t;
        return new Color(
                clamp(Math.round(a.getRed()   * s + b.getRed()   * t)),
                clamp(Math.round(a.getGreen() * s + b.getGreen() * t)),
                clamp(Math.round(a.getBlue()  * s + b.getBlue()  * t))
        );
    }

    private static int clamp(long v) { return (int) Math.max(0, Math.min(255, v)); }

    // ── Pen (drawing context) ─────────────────────────────────────────────

    private static final class Pen {
        private final PDDocument doc;
        private final PDFont     font;
        private PDPage           page;
        private PDPageContentStream cs;
        private int              pageNum;
        private float            cursorY;

        Pen(PDDocument doc, PDFont font) throws IOException {
            this.doc  = doc;
            this.font = font;
            openPage();
        }

        /** Current top cursor Y. */
        float top() { return cursorY; }

        /** Move cursor down by delta. */
        void advance(float delta) { cursorY -= delta; }

        void newPage()  throws IOException { openPage(); }
        void close()    throws IOException { closePage(); }

        void ensureSpace(float need) throws IOException {
            if (cursorY - need < SAFE) openPage();
        }

        // ── primitives ───────────────────────────────────────────────────

        /**
         * Fill a rectangle. topY = the top edge of the rectangle.
         * PDFBox addRect(x, y, w, h) uses bottom-left, so y = topY - h.
         */
        void fillRect(float x, float topY, float w, float h, Color fill) throws IOException {
            cs.setNonStrokingColor(fill);
            cs.addRect(x, topY - h, w, h);
            cs.fill();
        }

        void strokeRect(float x, float topY, float w, float h, Color stroke, float lw) throws IOException {
            cs.setStrokingColor(stroke);
            cs.setLineWidth(lw);
            cs.addRect(x, topY - h, w, h);
            cs.stroke();
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

        /**
         * Draw wrapped text.
         * @param topBaselineY  baseline of the first line
         * @return  Y position after the last line (= next available baseline)
         */
        float wrappedText(String text, float x, float topBaselineY, float maxW,
                          float size, float lh, Color color, int maxLines) throws IOException {
            List<String> lines = wrap(text, maxW, size, false);
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

        /**
         * Measure the pixel height of wrapped text (number_of_lines * lineHeight).
         */
        float wrapHeight(String text, float maxW, float size, float lh, int maxLines) throws IOException {
            List<String> lines = wrap(text, maxW, size, false);
            if (maxLines > 0 && lines.size() > maxLines) lines = lines.subList(0, maxLines);
            return Math.max(lh, lines.size() * lh);
        }

        float textW(String t, float size) throws IOException {
            return (font.getStringWidth(t) / 1000f) * size;
        }

        /**
         * Draw a pill badge. Returns the right-edge X of the drawn chip.
         *
         * Coordinate anatomy:
         *   chipTop = baselineY + chipH - 3    (rect top edge)
         *   chipBottom = chipTop - chipH       (= baselineY - 3)
         *   text baseline = baselineY          (sits comfortably inside chip)
         */
        float chip(float x, float baselineY, String text, Color bg, Color border, Color textColor) throws IOException {
            final float chipH = 17f;
            float tw  = textW(text, F_SMALL);
            float cw  = tw + 16f;
            float chipTop = baselineY + chipH - 3f;
            fillRect(x, chipTop, cw, chipH, bg);
            strokeRect(x, chipTop, cw, chipH, border, 0.5f);
            text(text, x + 8f, baselineY, F_SMALL, textColor);
            return x + cw;
        }

        // ── code block ───────────────────────────────────────────────────

        /**
         * Calculates the total height of a code block (header + code lines + padding).
         */
        float codeBlockH(String code, float blockW) throws IOException {
            float linesH = wrapHeight(code, blockW - 26f, F_SMALL, LH_CODE, 0, true);
            return 22f + linesH + 12f;              // 22pt header + lines + 12pt bottom pad
        }

        /**
         * Draw a code block. topY = top edge of the block.
         * Caller is responsible for updating their Y cursor by codeBlockH().
         */
        void codeBlock(float x, float topY, float w, String lang, String code, Color accent) throws IOException {
            float h = codeBlockH(code, w);
            fillRect(x, topY, w, h, C_CODE_BG);
            strokeRect(x, topY, w, h, accent, 0.75f);
            fillRect(x, topY, w, 22f, C_CODE_HEAD);            // header strip
            fillRect(x, topY, 4f, h, accent);                   // left accent
            text(lang, x + 10f, topY - 14f, F_SMALL, mix(accent, C_WHITE, 0.3f));
            wrappedText(code, x + 12f, topY - 28f, w - 26f, F_SMALL, LH_CODE, C_CODE_TEXT, 0, true);
        }

        private float wrapHeight(String text, float maxW, float size, float lh, int maxLines, boolean wordBreak) throws IOException {
            List<String> lines = wrap(text, maxW, size, wordBreak);
            if (maxLines > 0 && lines.size() > maxLines) lines = lines.subList(0, maxLines);
            return Math.max(lh, lines.size() * lh);
        }

        private float wrappedText(String text, float x, float topY, float maxW,
                                   float size, float lh, Color color, int maxLines, boolean wordBreak) throws IOException {
            List<String> lines = wrap(text, maxW, size, wordBreak);
            if (maxLines > 0 && lines.size() > maxLines) lines = lines.subList(0, maxLines);
            float y = topY;
            for (String line : lines) {
                text(line, x, y, size, color);
                y -= lh;
            }
            return y;
        }

        // ── text wrapping ─────────────────────────────────────────────────

        private List<String> wrap(String text, float maxW, float size, boolean wordBreak) throws IOException {
            if (text == null || text.isBlank()) return List.of(" ");
            List<String> result = new ArrayList<>();
            for (String para : text.replace("\r", "").split("\n", -1)) {
                if (para.isBlank()) { result.add(" "); continue; }
                wrapPara(para, maxW, size, wordBreak, result);
            }
            return result.isEmpty() ? List.of(" ") : result;
        }

        private void wrapPara(String para, float maxW, float size, boolean wordBreak, List<String> out) throws IOException {
            if (wordBreak) {
                StringBuilder cur = new StringBuilder();
                for (String tok : para.split(" ", -1)) {
                    String candidate = cur.isEmpty() ? tok : cur + " " + tok;
                    if (tw(candidate, size) <= maxW) {
                        cur = new StringBuilder(candidate);
                    } else {
                        if (!cur.isEmpty()) { out.add(cur.toString()); cur = new StringBuilder(); }
                        if (tw(tok, size) <= maxW) cur.append(tok);
                        else wrapPara(tok, maxW, size, false, out);
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

        // ── page lifecycle ────────────────────────────────────────────────

        private void openPage() throws IOException {
            closePage();
            page = new PDPage(PDRectangle.A4);
            doc.addPage(page);
            cs = new PDPageContentStream(doc, page);
            pageNum++;
            cursorY = PH - M;
            fillRect(0, PH, PW, PH, C_BG);
        }

        private void closePage() throws IOException {
            if (cs == null) return;
            drawFooter();
            cs.close();
            cs = null;
        }

        private void drawFooter() throws IOException {
            float y = 22f;
            hline(M, y + 10f, CW, C_BORDER, 0.5f);
            text("JeolgamAI  ·  Integrated Cost Report", M, y, F_SMALL, C_MUTED);
            String pg = "Page " + pageNum;
            float pgW = (font.getStringWidth(pg) / 1000f) * F_SMALL;
            text(pg, PW - M - pgW, y, F_SMALL, C_MUTED);
        }
    }
}
