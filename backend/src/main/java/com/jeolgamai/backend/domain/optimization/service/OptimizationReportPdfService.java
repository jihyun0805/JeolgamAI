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
 * PDF 좌표계
 *  - PDFBox 원점: 페이지 좌하단 (Y=0)
 *  - 커버 페이지: 절대 좌표 사용.  a(d) = PH - d  ("페이지 상단에서 d pt 아래" → PDFBox Y)
 *  - 본문 페이지: Pen.cursorY = 현재 사용 가능한 상단 Y (PDFBox 기준).
 *                text baseline = cursorY - ascent  (텍스트는 cursorY 아래에 그려짐)
 */
@Service
public class OptimizationReportPdfService {

    // ── page ────────────────────────────────────────────────────────────────
    private static final float PW   = PDRectangle.A4.getWidth();    // 595.28
    private static final float PH   = PDRectangle.A4.getHeight();   // 841.89
    private static final float M    = 44f;
    private static final float CW   = PW - M * 2f;                  // 507.28
    private static final float SAFE = M + 36f;                      // footer safe zone

    // ── radius ───────────────────────────────────────────────────────────────
    private static final float R_CARD = 10f;
    private static final float R_CHIP =  5f;
    private static final float R_CODE =  8f;
    private static final float KAPPA  = 0.5522847498f;

    // ── type scale ───────────────────────────────────────────────────────────
    private static final float F_COVER = 30f;
    private static final float F_H1    = 14f;
    private static final float F_H2    = 11.5f;
    private static final float F_BODY  = 9.5f;
    private static final float F_SMALL = 8f;
    private static final float LH_BODY = 14.5f;
    private static final float LH_CODE = 12f;
    private static final float SECTION_STACK_GAP = 32f;

    // ── palette ──────────────────────────────────────────────────────────────
    private static final Color BG_PAGE  = new Color(245, 247, 252);
    private static final Color BG_DARK  = new Color(10,  13,  20);
    private static final Color BG_DCARD = new Color(18,  24,  38);
    private static final Color BG_DEDGE = new Color(34,  46,  76);
    private static final Color C_PRI    = new Color(28,  89,  242);
    private static final Color C_PSOFT  = new Color(219, 234, 254);
    private static final Color C_PDIM   = new Color(147, 197, 253);
    private static final Color C_WHITE  = Color.WHITE;
    private static final Color C_CARD   = Color.WHITE;
    private static final Color C_CSOFT  = new Color(248, 250, 252);
    private static final Color C_BORD   = new Color(226, 232, 240);
    private static final Color C_TEXT   = new Color(15,  23,  42);
    private static final Color C_MID    = new Color(71,  85,  105);
    private static final Color C_MUTED  = new Color(148, 163, 184);
    private static final Color C_EME    = new Color(5,   150, 105);
    private static final Color C_ESOFT  = new Color(209, 250, 229);
    private static final Color C_ROSE   = new Color(225, 29,  72);
    private static final Color C_RSOFT  = new Color(255, 228, 230);
    private static final Color C_AMB    = new Color(202, 138, 4);
    private static final Color C_ASOFT  = new Color(254, 243, 199);
    private static final Color C_CDBG   = new Color(15,  23,  42);
    private static final Color C_CDHEAD = new Color(22,  32,  56);
    private static final Color C_CDTEXT = new Color(203, 213, 225);

    private static final String FONT_PATH = "fonts/NotoSansKR-VariableFont_wght.ttf";

    // ─────────────────────────────────────────────────────────────────────────

    public byte[] renderIntegratedReport(
            OptimizationModels.ProjectSummary project,
            OptimizationModels.AnalysisSnapshot analysis,
            OptimizationModels.ReportArtifact report
    ) {
        try (PDDocument doc = new PDDocument();
             InputStream fs = new ClassPathResource(FONT_PATH).getInputStream()) {

            PDType0Font font = PDType0Font.load(doc, fs, true);
            Pen pen = new Pen(doc, font);

            cover(pen, project, analysis, report);
            pen.newPage();
            sectionExecutiveSummary(pen, report);
            sectionRecommendations(pen, report);
            pen.newPage();
            sectionCostDrivers(pen, report);
            sectionExecutionPlan(pen, report);
            sectionWarnings(pen, report);
            pen.close();

            ByteArrayOutputStream buf = new ByteArrayOutputStream();
            doc.save(buf);
            return buf.toByteArray();
        } catch (IOException e) {
            throw new IllegalStateException("PDF 생성에 실패했습니다.", e);
        }
    }

    // ── Cover page ───────────────────────────────────────────────────────────
    // All positions in "distance from page top" (DFT). a(dft) converts to PDFBox Y.

    private void cover(Pen pen,
                       OptimizationModels.ProjectSummary project,
                       OptimizationModels.AnalysisSnapshot analysis,
                       OptimizationModels.ReportArtifact report) throws IOException {

        // full dark background
        pen.fillRect(0, PH, PW, PH, BG_DARK);

        // decorative circles – lower-right, subtle
        Color dc1 = mix(C_PRI, BG_DARK, 0.84f);
        Color dc2 = mix(C_PRI, BG_DARK, 0.90f);
        pen.circle(PW - 40f,  150f, 120f, dc2);
        pen.circle(PW - 130f, 80f,  72f,  dc1);
        pen.circle(PW + 20f,  200f, 80f,  dc2);

        // ── top band ─────────────────────────────────────────────────────────
        // DFT 0–74
        pen.fillRect(0, PH, PW, 74f, C_PRI);
        pen.text("JEOLGAMAI",                 M,          a(50f), F_SMALL, mix(C_WHITE, C_PRI, 0.35f));
        pen.text("AI 비용 최적화 리포트",     M + 92f,    a(50f), F_SMALL, mix(C_WHITE, C_PRI, 0.45f));
        float rLabel = pen.tw("# " + report.id(), F_SMALL);
        pen.text("# " + report.id(),          PW - M - rLabel, a(50f), F_SMALL, mix(C_WHITE, C_PRI, 0.5f));

        // ── project name ─────────────────────────────────────────────────────
        // DFT 74–196
        pen.text("INTEGRATED COST REPORT", M, a(96f),  F_SMALL, C_PDIM);
        pen.text(project.name(),           M, a(138f), F_COVER, C_WHITE);
        pen.text("경영 요약과 실행 리스크를 한눈에 보는 비용 최적화 리포트",
                                           M, a(170f), F_BODY,  C_MUTED);
        pen.hline(M, a(186f), CW, BG_DEDGE, 0.75f);

        // ── 4 metric cards  DFT 202–290 ──────────────────────────────────────
        final float CARD_H = 88f;
        final float GAP    = 10f;
        final float CW4    = (CW - GAP * 3f) / 4f;
        float cx = M;
        coverCard(pen, cx, a(202f), CW4, CARD_H,
                "총 월 비용",    krw(report.payload().totalMonthlyCost()), C_PDIM);   cx += CW4 + GAP;
        coverCard(pen, cx, a(202f), CW4, CARD_H,
                "낭비 비용",    krw(report.payload().wasteCost()),          C_ROSE);   cx += CW4 + GAP;
        coverCard(pen, cx, a(202f), CW4, CARD_H,
                "예상 월 절감", krw(report.payload().monthlySaving()),      C_EME);    cx += CW4 + GAP;
        coverCard(pen, cx, a(202f), CW4, CARD_H,
                "예상 연 절감", krw(report.payload().annualSaving()),       mix(C_EME, C_WHITE, 0.3f));

        pen.hline(M, a(306f), CW, BG_DEDGE, 0.75f);

        // ── two-column: score (left) / coverage (right)  DFT 320–450 ─────────
        //   LEFT col: x=M … M+240
        //   RIGHT col: x=M+262 … M+CW
        float LC = M;               // left col X start
        float RC = M + 262f;        // right col X start

        // -- LEFT: score --
        pen.text("ANALYSIS SCORE",               LC, a(334f), F_SMALL, C_MUTED);
        pen.text(analysis.score().totalScore() + "점",
                                                 LC, a(378f), 38f,     C_WHITE);
        pen.text("등급  " + analysis.score().grade(),
                                                 LC, a(402f), F_H2,    C_PDIM);
        pen.text("예상 월 절감  " + krw(report.payload().monthlySaving()),
                                                 LC, a(422f), F_SMALL, C_EME);

        // -- RIGHT: source coverage --
        pen.text("데이터 연동 현황",             RC, a(334f), F_SMALL, C_MUTED);
        boolean aws  = analysis.sourceCoverage().aws();
        boolean k8s  = analysis.sourceCoverage().k8s();
        boolean prom = analysis.sourceCoverage().prometheus();
        coverDotRow(pen, RC, 358f, "AWS",        aws);
        coverDotRow(pen, RC, 388f, "Kubernetes", k8s);
        coverDotRow(pen, RC, 418f, "Prometheus", prom);

        pen.hline(M, a(450f), CW, BG_DEDGE, 0.75f);

        // ── meta chips  DFT 468–510 ───────────────────────────────────────────
        pen.text("리포트 정보", M, a(464f), F_SMALL, C_MUTED);
        float chipY = a(484f);   // PDFBox Y for chip baseline
        float nx = M;
        nx = pen.chipDark(nx, chipY, "# " + report.id())         + 8f;
        nx = pen.chipDark(nx, chipY, "리전  " + analysis.awsRegion()) + 8f;
        pen.chipDark(nx, chipY, "생성  " + report.createdAt());

        pen.hline(M, a(508f), CW, BG_DEDGE, 0.75f);

        // ── preview recommendations  DFT 524–end ─────────────────────────────
        pen.text("주요 권고 미리보기", M, a(524f), F_SMALL, C_MUTED);

        float previewTop = a(542f);
        int shown = 0;
        for (OptimizationModels.ReportRecommendationHighlight rec
                : report.payload().topRecommendations()) {
            if (shown >= 2) break;
            Color ac = riskColor(rec.riskLevel());
            float cardTop = previewTop - shown * 52f;

            pen.fillRounded(M, cardTop, CW, 44f, R_CARD, BG_DCARD);
            pen.strokeRounded(M, cardTop, CW, 44f, R_CARD, BG_DEDGE, 0.75f);
            pen.fillRounded(M, cardTop, 5f, 44f, 3f, ac);

            pen.text(rec.title(), M + 20f, cardTop - 26f, F_H2, C_WHITE);

            shown++;
        }

        // bottom accent bar
        pen.fillRect(0, 10f, PW, 10f, C_PRI);
    }

    /** a(dft) converts "distance from page top" to PDFBox Y. */
    private static float a(float dft) { return PH - dft; }

    private void coverCard(Pen pen, float x, float topY, float w, float h,
                           String label, String value, Color valueColor) throws IOException {
        pen.fillRounded(x, topY, w, h, R_CARD, BG_DCARD);
        pen.strokeRounded(x, topY, w, h, R_CARD, BG_DEDGE, 0.75f);
        pen.text(label, x + 16f, topY - 18f, F_SMALL, C_MUTED);
        pen.text(value, x + 16f, topY - 46f, F_H2,    valueColor);
    }

    private void coverDotRow(Pen pen, float x, float dft, String label, boolean ok) throws IOException {
        // dot
        Color dotColor = ok ? C_EME : mix(C_MUTED, BG_DARK, 0.4f);
        float dotCY = a(dft + 4f);          // circle center in PDFBox Y
        pen.circle(x + 6f, dotCY, 4.5f, dotColor);
        // label
        pen.text(label, x + 18f, a(dft), F_SMALL, ok ? C_WHITE : C_MUTED);
        // status sub-text
        pen.text(ok ? "연결됨" : "미연동", x + 18f, a(dft + 12f), 7f,
                ok ? C_EME : C_MUTED);
    }

    // ── Section: Executive Summary ────────────────────────────────────────────

    private void sectionExecutiveSummary(Pen pen, OptimizationModels.ReportArtifact report) throws IOException {
        sectionHeader(pen, "경영 요약", "지금 왜 움직여야 하는지 한눈에 읽히게 정리합니다.", C_PRI);

        String text = fallback(report.payload().executiveSummary(), "분석 요약이 아직 생성되지 않았습니다.");
        float innerW = CW - 44f;
        float textH  = pen.wrapH(text, innerW, F_BODY, LH_BODY, 0);
        float cardH  = Math.max(80f, 38f + textH + 18f);

        pen.ensureSpace(cardH + 12f);
        float top = pen.curY;

        pen.fillRounded(M, top, CW, cardH, R_CARD, C_CARD);
        pen.strokeRounded(M, top, CW, cardH, R_CARD, C_BORD, 0.75f);
        pen.fillRounded(M, top, 5f, cardH, 3f, C_PRI);

        pen.text("EXECUTIVE SUMMARY", M + 22f, top - 20f, F_SMALL, C_PRI);
        pen.wrappedText(text, M + 22f, top - 36f, innerW, F_BODY, LH_BODY, C_TEXT, 0);

        pen.advance(cardH + SECTION_STACK_GAP);
    }

    // ── Section: Recommendations ──────────────────────────────────────────────

    private void sectionRecommendations(Pen pen, OptimizationModels.ReportArtifact report) throws IOException {
        sectionHeader(pen, "핵심 권고", "절감 효과와 리스크를 함께 보여주는 상위 권고 카드입니다.", C_PRI);

        if (report.payload().topRecommendations().isEmpty()) { emptyCard(pen, "표시할 핵심 권고가 없습니다."); return; }

        final float CARD_INSET_X = 22f;
        final float TITLE_BASELINE_OFFSET = 20f;
        final float CHIP_BASELINE_OFFSET = 40f;
        final float BODY_TOP_OFFSET = 62f;
        final float CARD_BOTTOM_PAD = 20f;
        final float CARD_STACK_GAP = 14f;
        final float CHIP_GAP = 7f;

        for (OptimizationModels.ReportRecommendationHighlight rec : report.payload().topRecommendations()) {
            String rat = fallback(rec.rationale(), "상세 근거가 없습니다.");
            float bodyW = CW - CARD_INSET_X * 2f - 6f;
            float ratH  = pen.wrapH(rat, bodyW, F_BODY, LH_BODY, 0);
            float cardH = BODY_TOP_OFFSET + ratH + CARD_BOTTOM_PAD;

            pen.ensureSpace(cardH + CARD_STACK_GAP);
            float top   = pen.curY;
            Color ac    = riskColor(rec.riskLevel());

            pen.fillRounded(M, top, CW, cardH, R_CARD, C_CARD);
            pen.strokeRounded(M, top, CW, cardH, R_CARD, C_BORD, 0.75f);
            pen.fillRounded(M, top, 5f, cardH, 3f, ac);

            pen.bold(rec.title(), M + CARD_INSET_X, top - TITLE_BASELINE_OFFSET, F_H2, C_TEXT);

            float chipY = top - CHIP_BASELINE_OFFSET;
            float nx = M + CARD_INSET_X;
            nx = pen.chip(nx, chipY, rec.targetResource(),                                 C_CSOFT,            C_BORD,                     C_MID)   + CHIP_GAP;
            nx = pen.chip(nx, chipY, "리스크  " + rec.riskLevel().toUpperCase(),           mix(ac,C_WHITE,.84f),mix(ac,C_WHITE,.5f),        ac)      + CHIP_GAP;
            pen.chip(nx, chipY,      "월 절감  " + krw(rec.monthlySaving()),               C_ESOFT,            mix(C_EME,C_WHITE,.5f),     C_EME);

            pen.wrappedText(rat, M + CARD_INSET_X, top - BODY_TOP_OFFSET, bodyW, F_BODY, LH_BODY, C_MID, 0);
            pen.advance(cardH + CARD_STACK_GAP);
        }
    }

    // ── Section: Cost Drivers ─────────────────────────────────────────────────

    private void sectionCostDrivers(Pen pen, OptimizationModels.ReportArtifact report) throws IOException {
        sectionHeader(pen, "비용 드라이버", "어디에서 가장 큰 비용이 발생하는지 상대 비중으로 표시합니다.", C_PRI);

        if (report.payload().topCostItems().isEmpty()) { emptyCard(pen, "비용 드라이버 데이터가 없습니다."); return; }

        final float HEADER_H = 34f;
        final float ROW_H = 58f;
        final float TABLE_INSET_X = 18f;
        final float CELL_PAD_X = 14f;
        final float TEXT_GAP = 6f;
        final float BAR_H = 10f;
        final float BAR_W_RATIO = 0.86f;
        final float SERVICE_COL_RATIO = 0.46f;
        final float RATIO_COL_RATIO = 0.32f;
        final float INNER_X = M + TABLE_INSET_X;
        final float INNER_W = CW - (TABLE_INSET_X * 2f);
        final float COL1_W = INNER_W * SERVICE_COL_RATIO;
        final float COL2_W = INNER_W * RATIO_COL_RATIO;
        final float COL3_W = INNER_W - COL1_W - COL2_W;
        final float COL1_X = INNER_X;
        final float COL2_X = COL1_X + COL1_W;
        final float COL3_X = COL2_X + COL2_W;
        int rows  = report.payload().topCostItems().size();
        float cardH = HEADER_H + rows * ROW_H + 12f;

        pen.ensureSpace(cardH + 12f);
        float top = pen.curY;

        pen.fillRounded(M, top, CW, cardH, R_CARD, C_CARD);
        pen.strokeRounded(M, top, CW, cardH, R_CARD, C_BORD, 0.75f);
        pen.fillRounded(M, top, 5f, cardH, 3f, C_PRI);
        pen.fillRect(M + 5f, top, CW - 5f, HEADER_H, C_CSOFT);

        pen.text("서비스", COL1_X + (COL1_W - pen.tw("서비스", F_SMALL)) / 2f, top - 22f, F_SMALL, C_MUTED);
        pen.text("상대 비중", COL2_X + (COL2_W - pen.tw("상대 비중", F_SMALL)) / 2f, top - 22f, F_SMALL, C_MUTED);
        pen.text("월 비용", COL3_X + (COL3_W - pen.tw("월 비용", F_SMALL)) / 2f, top - 22f, F_SMALL, C_MUTED);
        pen.hline(M + 5f, top - HEADER_H, CW - 5f, C_BORD, 0.6f);
        pen.vline(COL2_X, top, cardH, C_BORD, 0.4f);
        pen.vline(COL3_X, top, cardH, C_BORD, 0.4f);

        long maxCost = report.payload().topCostItems().stream()
                .mapToLong(OptimizationModels.ReportCostHighlight::monthlyCost).max().orElse(1L);

        float titleLineH = pen.lineH(F_BODY);
        float subtitleLineH = pen.lineH(F_SMALL);
        float rowTop = top - HEADER_H;
        for (int i = 0; i < rows; i++) {
            OptimizationModels.ReportCostHighlight item = report.payload().topCostItems().get(i);
            float ratio = maxCost <= 0 ? 0f
                    : Math.min(1f, Math.max(0.04f, (float) item.monthlyCost() / maxCost));
            float cellTop = rowTop;
            float cellCenterY = cellTop - (ROW_H / 2f);
            float serviceBlockH = titleLineH + TEXT_GAP + subtitleLineH;
            float serviceBlockTop = cellCenterY + (serviceBlockH / 2f);
            float titleBaseline = serviceBlockTop - pen.ascent(F_BODY);
            float subtitleTop = serviceBlockTop - titleLineH - TEXT_GAP;
            float subtitleBaseline = subtitleTop - pen.ascent(F_SMALL);
            float amountBaseline = cellCenterY + (titleLineH / 2f) - pen.ascent(F_BODY);
            float barWidth = COL2_W * BAR_W_RATIO;
            float barTop = cellCenterY + (BAR_H / 2f);
            String serviceMeta = item.usageType() + "  ·  " + item.resourceCount() + " res";
            float serviceBlockX = COL1_X + CELL_PAD_X;
            float amountX = COL3_X + (COL3_W - pen.tw(krw(item.monthlyCost()), F_BODY)) / 2f;
            float trackX = COL2_X + (COL2_W - barWidth) / 2f;

            pen.bold(item.service(), serviceBlockX, titleBaseline, F_BODY, C_TEXT);
            pen.text(serviceMeta, serviceBlockX, subtitleBaseline, F_SMALL, C_MUTED);

            pen.fillRounded(trackX, barTop, barWidth, BAR_H, 5f, C_CSOFT);
            pen.strokeRounded(trackX, barTop, barWidth, BAR_H, 5f, C_BORD, 0.5f);
            if (ratio > 0.01f)
                pen.fillRounded(trackX, barTop, barWidth * ratio, BAR_H, 5f, C_PRI);

            pen.text(krw(item.monthlyCost()), amountX, amountBaseline, F_BODY, C_TEXT);

            if (i < rows - 1)
                pen.hline(M + 5f, rowTop - ROW_H, CW - 5f, C_BORD, 0.4f);
            rowTop -= ROW_H;
        }
        pen.advance(cardH + SECTION_STACK_GAP);
    }

    // ── Section: Execution Plan ───────────────────────────────────────────────

    private void sectionExecutionPlan(Pen pen, OptimizationModels.ReportArtifact report) throws IOException {
        sectionHeader(pen, "실행 계획", "실행 명령과 롤백 경로까지 포함한 운영용 단계별 체크리스트입니다.", C_PRI);

        if (report.payload().executionPlan().isEmpty()) { emptyCard(pen, "실행 계획이 없습니다."); return; }

        final float STEP_BADGE_RADIUS = 14f;
        final float STEP_BADGE_FONT = 9.5f;
        final float STEP_BADGE_NUMBER_BASELINE_ADJUST = 3.5f;
        final float CARD_INSET_LEFT = 10f;
        final float CARD_INSET_TOP = 8f;
        final float CARD_INSET_RIGHT = 18f;
        final float BADGE_TO_CONTENT_GAP = 18f;
        final float TITLE_ROW_H = 22f;
        final float CHIP_ROW_H = 26f;
        final float TITLE_TO_PANEL_GAP = 22f;
        final float TITLE_BASELINE_OFFSET = 18f;
        final float CHIP_BASELINE_OFFSET = 44f;
        final float PANEL_TOP_OFFSET = TITLE_ROW_H + CHIP_ROW_H + TITLE_TO_PANEL_GAP;
        final float PANEL_PAD_X = 14f;
        final float PANEL_PAD_Y = 16f;
        final float PANEL_RADIUS = 8f;
        final float CODE_BLOCK_GAP = 8f;
        final float ROLLBACK_TO_RATIONALE_GAP = 20f;
        final float RATIONALE_LABEL_H = 12f;
        final float RATIONALE_TEXT_TOP_GAP = 8f;
        final float RATIONALE_LABEL_TO_TEXT_GAP = 20f;
        final float CARD_BOTTOM_PAD = 18f;
        final float CARD_ADVANCE_GAP = 14f;
        final float CHIP_GAP = 12f;
        final float EXEC_CHIP_H = 20f;
        final float EXEC_CHIP_PAD_X = 11f;
        final float EXEC_CHIP_TEXT_SIZE = 8.5f;
        final float EXEC_CHIP_RADIUS = 6f;

        final float BODY_X = M + CARD_INSET_LEFT + STEP_BADGE_RADIUS * 2f + BADGE_TO_CONTENT_GAP;
        final float BODY_W = CW - (BODY_X - M) - CARD_INSET_RIGHT;

        int idx = 1;
        for (OptimizationModels.ReportExecutionStep step : report.payload().executionPlan()) {
            String cmd      = fallback(step.commandSnippet(), "-");
            String rollback = fallback(step.rollbackSnippet(), "-");
            String rat      = fallback(step.rationale(), "실행 배경 설명이 없습니다.");

            float panelX = M + CARD_INSET_LEFT;
            float panelW = CW - CARD_INSET_LEFT - CARD_INSET_RIGHT;
            float panelInnerX = panelX + PANEL_PAD_X;
            float panelInnerW = panelW - PANEL_PAD_X * 2f;

            float cmdH  = pen.codeH(cmd, panelInnerW);
            float rbH   = pen.codeH(rollback, panelInnerW);
            float ratH  = pen.wrapH(rat, panelInnerW, F_BODY, LH_BODY, 0);

            float panelH =
                    PANEL_PAD_Y
                    + cmdH
                    + CODE_BLOCK_GAP
                    + rbH
                    + ROLLBACK_TO_RATIONALE_GAP
                    + RATIONALE_LABEL_H
                    + RATIONALE_TEXT_TOP_GAP
                    + ratH
                    + PANEL_PAD_Y;
            float cardH =
                    TITLE_ROW_H
                    + CHIP_ROW_H
                    + TITLE_TO_PANEL_GAP
                    + panelH
                    + CARD_BOTTOM_PAD;

            pen.ensureSpace(cardH + CARD_ADVANCE_GAP);
            float top  = pen.curY;
            Color ac   = riskColor(step.riskLevel());

            // card
            pen.fillRounded(M, top, CW, cardH, R_CARD, C_CARD);
            pen.strokeRounded(M, top, CW, cardH, R_CARD, C_BORD, 0.75f);

            // step circle badge (top-left, aligned with title row center)
            float circleCX = M + CARD_INSET_LEFT + STEP_BADGE_RADIUS;
            float circleCY = top - CARD_INSET_TOP - STEP_BADGE_RADIUS;
            pen.circle(circleCX, circleCY, STEP_BADGE_RADIUS, ac);
            String numStr = String.format("%02d", idx);
            float  numW   = pen.tw(numStr, STEP_BADGE_FONT);
            pen.text(numStr, circleCX - numW / 2f, circleCY - STEP_BADGE_NUMBER_BASELINE_ADJUST, STEP_BADGE_FONT, C_WHITE);

            // title
            pen.bold(step.title(), BODY_X, top - TITLE_BASELINE_OFFSET - CARD_INSET_TOP, F_H2, C_TEXT);

            // chips
            float chipY = top - CHIP_BASELINE_OFFSET - CARD_INSET_TOP;
            float nx = BODY_X;
            nx = pen.chipSized(nx, chipY, step.targetResource(),                       C_CSOFT,            C_BORD,                 C_MID, EXEC_CHIP_H, EXEC_CHIP_PAD_X, EXEC_CHIP_TEXT_SIZE, EXEC_CHIP_RADIUS) + CHIP_GAP;
            nx = pen.chipSized(nx, chipY, "리스크  " + step.riskLevel().toUpperCase(), mix(ac,C_WHITE,.84f),mix(ac,C_WHITE,.5f),    ac,    EXEC_CHIP_H, EXEC_CHIP_PAD_X, EXEC_CHIP_TEXT_SIZE, EXEC_CHIP_RADIUS) + CHIP_GAP;
            pen.chipSized(nx, chipY,      "월 절감  " + krw(step.monthlySaving()),     C_ESOFT,            mix(C_EME,C_WHITE,.5f), C_EME, EXEC_CHIP_H, EXEC_CHIP_PAD_X, EXEC_CHIP_TEXT_SIZE, EXEC_CHIP_RADIUS);

            float panelTop = top - PANEL_TOP_OFFSET - CARD_INSET_TOP;
            pen.fillRounded(panelX, panelTop, panelW, panelH, PANEL_RADIUS, C_CSOFT);
            pen.strokeRounded(panelX, panelTop, panelW, panelH, PANEL_RADIUS, C_BORD, 0.6f);

            // body – track Y from top downward inside panel
            float y = panelTop - PANEL_PAD_Y;

            pen.codeBlock(panelInnerX, y, panelInnerW, "적용 명령", cmd,      C_PRI);  y -= cmdH + CODE_BLOCK_GAP;
            pen.codeBlock(panelInnerX, y, panelInnerW, "롤백 명령", rollback, C_ROSE); y -= rbH + ROLLBACK_TO_RATIONALE_GAP;

            pen.bold("실행 배경", panelInnerX, y, F_SMALL, C_MID);          y -= RATIONALE_LABEL_TO_TEXT_GAP;
            pen.wrappedText(rat, panelInnerX, y, panelInnerW, F_BODY, LH_BODY, C_TEXT, 0);

            pen.advance(cardH + CARD_ADVANCE_GAP);
            idx++;
        }
    }

    // ── Section: Warnings ─────────────────────────────────────────────────────

    private void sectionWarnings(Pen pen, OptimizationModels.ReportArtifact report) throws IOException {
        if (report.payload().warnings().isEmpty()) return;

        float textH = 0f;
        for (String w : report.payload().warnings())
            textH += pen.wrapH("• " + w, CW - 42f, F_BODY, LH_BODY, 0) + 4f;
        float cardH = Math.max(68f, 38f + textH + 14f);

        pen.ensureSpace(cardH + 12f);
        float top = pen.curY;

        pen.fillRounded(M, top, CW, cardH, R_CARD, C_ASOFT);
        pen.strokeRounded(M, top, CW, cardH, R_CARD, mix(C_AMB, C_WHITE, 0.45f), 0.75f);
        pen.fillRounded(M, top, 5f, cardH, 3f, C_AMB);

        pen.bold("주의 사항", M + 22f, top - 20f, F_H2, C_AMB);

        float ty = top - 42f;
        for (String w : report.payload().warnings())
            ty = pen.wrappedText("• " + w, M + 22f, ty, CW - 42f, F_BODY, LH_BODY, C_TEXT, 0) - 4f;

        pen.advance(cardH + 8f);
    }

    // ── Shared layout helpers ─────────────────────────────────────────────────

    private void sectionHeader(Pen pen, String title, String sub, Color ac) throws IOException {
        pen.ensureSpace(50f);
        float top = pen.curY;
        // circle bullet vertically centered with title cap height
        pen.circle(M + 6f, top - 7f, 5f, ac);
        pen.bold(title, M + 18f, top - 2f,  F_H1,    C_TEXT);
        pen.text(sub,   M + 18f, top - 19f, F_SMALL, C_MUTED);
        pen.hline(M, top - 30f, CW, C_BORD, 0.75f);
        pen.advance(44f);
    }

    private void emptyCard(Pen pen, String msg) throws IOException {
        pen.ensureSpace(68f);
        float top = pen.curY;
        pen.fillRounded(M, top, CW, 68f, R_CARD, C_CSOFT);
        pen.strokeRounded(M, top, CW, 68f, R_CARD, C_BORD, 0.75f);
        pen.text(msg, M + 22f, top - 28f, F_BODY, C_MUTED);
        pen.advance(80f);
    }

    // ── Utilities ─────────────────────────────────────────────────────────────

    private static String krw(long v)                    { return String.format("%,d원", v); }
    private static String fallback(String v, String def) { return (v==null||v.isBlank()) ? def : v; }

    private static Color riskColor(String lv) {
        return switch (lv==null?"":lv.trim().toLowerCase()) {
            case "high"   -> C_ROSE;
            case "medium" -> C_AMB;
            case "low"    -> C_EME;
            default       -> C_PRI;
        };
    }

    private static Color mix(Color a, Color b, float t) {
        float s = 1f - t;
        return new Color(clamp(Math.round(a.getRed()*s+b.getRed()*t)),
                         clamp(Math.round(a.getGreen()*s+b.getGreen()*t)),
                         clamp(Math.round(a.getBlue()*s+b.getBlue()*t)));
    }
    private static int clamp(long v) { return (int)Math.max(0,Math.min(255,v)); }

    // ── Pen ───────────────────────────────────────────────────────────────────

    private static final class Pen {
        final PDDocument doc;
        final PDFont     font;
        PDPage           page;
        PDPageContentStream cs;
        int              pageNum;
        float            curY;   // "top" of current available area, PDFBox coords

        Pen(PDDocument doc, PDFont font) throws IOException {
            this.doc = doc; this.font = font;
            openPage();
        }

        void advance(float d)  { curY -= d; }
        void newPage()  throws IOException { openPage(); }
        void close()    throws IOException { closePage(); }

        void ensureSpace(float need) throws IOException {
            if (curY - need < SAFE) openPage();
        }

        // ── plain rect (absolute coords, topY = top edge) ────────────────────

        void fillRect(float x, float topY, float w, float h, Color c) throws IOException {
            cs.setNonStrokingColor(c);
            cs.addRect(x, topY - h, w, h);
            cs.fill();
        }

        // ── rounded rect ─────────────────────────────────────────────────────

        void fillRounded(float x, float topY, float w, float h, float r, Color c) throws IOException {
            cs.setNonStrokingColor(c);
            roundedPath(x, topY, w, h, r);
            cs.fill();
        }

        void strokeRounded(float x, float topY, float w, float h, float r, Color c, float lw) throws IOException {
            cs.setStrokingColor(c);
            cs.setLineWidth(lw);
            roundedPath(x, topY, w, h, r);
            cs.stroke();
        }

        private void roundedPath(float x, float topY, float w, float h, float r) throws IOException {
            // ensure r doesn't exceed half of smallest dimension
            r = Math.min(r, Math.min(w, h) / 2f);
            float by = topY - h;
            float ir = r * (1f - KAPPA);
            cs.moveTo(x + r, by);
            cs.lineTo(x + w - r, by);
            cs.curveTo(x+w-ir, by,      x+w, by+ir,      x+w, by+r);
            cs.lineTo(x+w, topY-r);
            cs.curveTo(x+w, topY-ir,    x+w-ir, topY,    x+w-r, topY);
            cs.lineTo(x+r, topY);
            cs.curveTo(x+ir, topY,      x, topY-ir,      x, topY-r);
            cs.lineTo(x, by+r);
            cs.curveTo(x, by+ir,        x+ir, by,        x+r, by);
            cs.closePath();
        }

        // ── circle (cy = PDFBox Y, from bottom) ──────────────────────────────

        void circle(float cx, float cy, float r, Color c) throws IOException {
            float k = r * KAPPA;
            cs.setNonStrokingColor(c);
            cs.moveTo(cx-r, cy);
            cs.curveTo(cx-r,cy+k, cx-k,cy+r, cx,  cy+r);
            cs.curveTo(cx+k,cy+r, cx+r,cy+k, cx+r,cy);
            cs.curveTo(cx+r,cy-k, cx+k,cy-r, cx,  cy-r);
            cs.curveTo(cx-k,cy-r, cx-r,cy-k, cx-r,cy);
            cs.closePath();
            cs.fill();
        }

        // ── line ─────────────────────────────────────────────────────────────

        void hline(float x, float y, float w, Color c, float lw) throws IOException {
            cs.setStrokingColor(c); cs.setLineWidth(lw);
            cs.moveTo(x, y); cs.lineTo(x+w, y); cs.stroke();
        }

        void vline(float x, float topY, float h, Color c, float lw) throws IOException {
            cs.setStrokingColor(c); cs.setLineWidth(lw);
            cs.moveTo(x, topY);
            cs.lineTo(x, topY - h);
            cs.stroke();
        }

        // ── text ─────────────────────────────────────────────────────────────

        void text(String t, float x, float baselineY, float size, Color c) throws IOException {
            if (t==null||t.isBlank()) return;
            cs.beginText();
            cs.setNonStrokingColor(c);
            cs.setFont(font, size);
            cs.newLineAtOffset(x, baselineY);
            cs.showText(t);
            cs.endText();
        }

        /**
         * Bold simulation via fill+stroke (PDF rendering mode 2).
         * Stroke width = ~3.5% of font size → subtle thickening without blurring.
         */
        void bold(String t, float x, float baselineY, float size, Color c) throws IOException {
            if (t==null||t.isBlank()) return;
            // Set stroke color and width outside text object (graphics state)
            cs.setStrokingColor(c);
            cs.setLineWidth(size * 0.035f);
            cs.beginText();
            cs.setNonStrokingColor(c);
            cs.setFont(font, size);
            cs.newLineAtOffset(x, baselineY);
            // PDF operator "2 Tr" = fill then stroke (simulates bold)
            cs.appendRawCommands("2 Tr\n");
            cs.showText(t);
            // Reset rendering mode to fill-only before ending text
            cs.appendRawCommands("0 Tr\n");
            cs.endText();
        }

        /** Returns Y of baseline after last line (use for chaining). */
        float wrappedText(String text, float x, float topBaseY, float maxW,
                          float size, float lh, Color c, int maxLines) throws IOException {
            List<String> lines = wrapLines(text, maxW, size, false);
            if (maxLines > 0 && lines.size() > maxLines) {
                lines = new ArrayList<>(lines.subList(0, maxLines));
                String last = lines.get(lines.size()-1);
                lines.set(lines.size()-1, last.length()>1 ? last.substring(0,last.length()-1)+"…" : "…");
            }
            float y = topBaseY;
            for (String line : lines) { text(line, x, y, size, c); y -= lh; }
            return y;
        }

        float wrapH(String text, float maxW, float size, float lh, int maxLines) throws IOException {
            List<String> lines = wrapLines(text, maxW, size, false);
            if (maxLines > 0 && lines.size() > maxLines) lines = lines.subList(0, maxLines);
            return Math.max(lh, lines.size() * lh);
        }

        float tw(String t, float size) throws IOException {
            return (font.getStringWidth(t) / 1000f) * size;
        }

        float ascent(float size) {
            return (font.getFontDescriptor().getAscent() / 1000f) * size;
        }

        float descent(float size) {
            return Math.abs((font.getFontDescriptor().getDescent() / 1000f) * size);
        }

        float lineH(float size) {
            return ascent(size) + descent(size);
        }

        // ── chip ─────────────────────────────────────────────────────────────

        float chip(float x, float baselineY, String t,
                   Color bg, Color border, Color textColor) throws IOException {
            final float H = 17f;
            float cw = tw(t, F_SMALL) + 18f;
            float chipTop = baselineY + H - 4f;
            fillRounded(x, chipTop, cw, H, R_CHIP, bg);
            strokeRounded(x, chipTop, cw, H, R_CHIP, border, 0.5f);
            text(t, x + 9f, baselineY, F_SMALL, textColor);
            return x + cw;
        }

        float chipSized(float x, float baselineY, String t,
                        Color bg, Color border, Color textColor,
                        float height, float padX, float textSize, float radius) throws IOException {
            float cw = tw(t, textSize) + padX * 2f;
            float chipTop = baselineY + height - 4f;
            fillRounded(x, chipTop, cw, height, radius, bg);
            strokeRounded(x, chipTop, cw, height, radius, border, 0.5f);
            text(t, x + padX, baselineY, textSize, textColor);
            return x + cw;
        }

        float chipDark(float x, float baselineY, String t) throws IOException {
            return chip(x, baselineY, t, BG_DCARD, BG_DEDGE, C_MUTED);
        }

        // ── code block ───────────────────────────────────────────────────────

        float codeH(String code, float blockW) throws IOException {
            float linesH = wrapHWb(code, blockW - 26f, F_SMALL, LH_CODE, 0);
            return 22f + linesH + 12f;
        }

        /**
         * Draw a code block. topY = top edge. Does NOT advance pen cursor.
         */
        void codeBlock(float x, float topY, float w, String lang,
                       String code, Color accent) throws IOException {
            float h = codeH(code, w);

            // main bg
            fillRounded(x, topY, w, h, R_CODE, C_CDBG);
            strokeRounded(x, topY, w, h, R_CODE, accent, 0.75f);

            // header: full-width rounded top, square bottom
            fillRounded(x, topY, w, 22f, R_CODE, C_CDHEAD);
            // fill the bottom-rounded part of header to make it square
            fillRect(x, topY - R_CODE, w, 22f - R_CODE, C_CDHEAD);

            // lang label inside header
            text(lang, x + 10f, topY - 14f, F_SMALL, mix(accent, C_WHITE, 0.3f));

            // code text
            wrappedTextWb(code, x + 12f, topY - 28f, w - 26f, F_SMALL, LH_CODE, C_CDTEXT, 0);
        }

        // ── wrap helpers ─────────────────────────────────────────────────────

        List<String> wrapLines(String text, float maxW, float size, boolean wb) throws IOException {
            if (text==null||text.isBlank()) return List.of(" ");
            List<String> result = new ArrayList<>();
            for (String para : text.replace("\r","").split("\n",-1)) {
                if (para.isBlank()) { result.add(" "); continue; }
                wrapPara(para, maxW, size, wb, result);
            }
            return result.isEmpty() ? List.of(" ") : result;
        }

        private float wrapHWb(String text, float maxW, float size, float lh, int max) throws IOException {
            List<String> lines = wrapLines(text, maxW, size, true);
            if (max > 0 && lines.size() > max) lines = lines.subList(0, max);
            return Math.max(lh, lines.size() * lh);
        }

        private float wrappedTextWb(String text, float x, float topY, float maxW,
                                     float size, float lh, Color c, int max) throws IOException {
            List<String> lines = wrapLines(text, maxW, size, true);
            if (max > 0 && lines.size() > max) lines = lines.subList(0, max);
            float y = topY;
            for (String line : lines) { text(line, x, y, size, c); y -= lh; }
            return y;
        }

        private void wrapPara(String para, float maxW, float size, boolean wb, List<String> out) throws IOException {
            if (wb) {
                StringBuilder cur = new StringBuilder();
                for (String tok : para.split(" ",-1)) {
                    String cand = cur.isEmpty() ? tok : cur + " " + tok;
                    if (cw(cand, size) <= maxW) { cur = new StringBuilder(cand); }
                    else {
                        if (!cur.isEmpty()) { out.add(cur.toString()); cur = new StringBuilder(); }
                        if (cw(tok, size) <= maxW) cur.append(tok);
                        else wrapPara(tok, maxW, size, false, out);
                    }
                }
                if (!cur.isEmpty()) out.add(cur.toString());
            } else {
                StringBuilder cur = new StringBuilder();
                for (int i = 0; i < para.length(); i++) {
                    char ch = para.charAt(i);
                    cur.append(ch);
                    if (cw(cur.toString(), size) > maxW) {
                        cur.deleteCharAt(cur.length()-1);
                        if (!cur.isEmpty()) { out.add(cur.toString()); cur = new StringBuilder(); }
                        cur.append(ch);
                    }
                }
                if (!cur.isEmpty()) out.add(cur.toString());
            }
        }

        private float cw(String t, float size) throws IOException {
            return (font.getStringWidth(t) / 1000f) * size;
        }

        // ── page lifecycle ────────────────────────────────────────────────────

        private void openPage() throws IOException {
            closePage();
            page = new PDPage(PDRectangle.A4);
            doc.addPage(page);
            cs = new PDPageContentStream(doc, page);
            pageNum++;
            // curY = first available baseline (leaves room for text ascent above)
            curY = PH - M - F_H1;
            // page background
            fillRect(0, PH, PW, PH, BG_PAGE);
        }

        private void closePage() throws IOException {
            if (cs == null) return;
            if (pageNum > 1) drawFooter();   // no footer on cover
            cs.close(); cs = null;
        }

        private void drawFooter() throws IOException {
            float lineY = SAFE - 4f;
            float textY = SAFE - 18f;
            hline(M, lineY, CW, C_BORD, 0.5f);
            text("JeolgamAI  ·  Integrated Cost Report", M, textY, F_SMALL, C_MUTED);
            String pg = "Page " + pageNum;
            float pgW = (font.getStringWidth(pg) / 1000f) * F_SMALL;
            text(pg, PW - M - pgW, textY, F_SMALL, C_MUTED);
        }
    }
}
