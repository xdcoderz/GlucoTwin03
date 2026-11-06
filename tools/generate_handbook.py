"""Build the illustrated, source-grounded GlucoTwin study handbook."""
from pathlib import Path
from html import escape
import json
import math
import textwrap

from reportlab.lib import colors
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Table, TableStyle, Preformatted, Flowable, Image

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'deliverables/glucotwin_illustrated_project_handbook.pdf'
NAVY = colors.HexColor('#12324A')
TEAL = colors.HexColor('#087F8C')
BLUE = colors.HexColor('#2469A0')
GOLD = colors.HexColor('#B36C16')
INK = colors.HexColor('#233744')
MUTED = colors.HexColor('#596E79')
PALE = colors.HexColor('#EEF5F7')
LINE = colors.HexColor('#CCDAE0')
WHITE = colors.white
W = A4[0] - 36 * mm

ST = {
    'body': ParagraphStyle('body', fontName='Helvetica', fontSize=10, leading=14.4, textColor=INK, spaceAfter=7),
    'small': ParagraphStyle('small', fontName='Helvetica', fontSize=8.5, leading=11.8, textColor=MUTED, spaceAfter=5),
    'h1': ParagraphStyle('h1', fontName='Helvetica-Bold', fontSize=24, leading=28, textColor=NAVY, spaceAfter=12),
    'h2': ParagraphStyle('h2', fontName='Helvetica-Bold', fontSize=12.5, leading=16, textColor=TEAL, spaceBefore=10, spaceAfter=6, keepWithNext=True),
    'kicker': ParagraphStyle('kicker', fontName='Helvetica-Bold', fontSize=8.7, leading=12, textColor=TEAL, spaceAfter=7),
    'table': ParagraphStyle('table', fontName='Helvetica', fontSize=8.7, leading=11.8, textColor=INK),
    'th': ParagraphStyle('th', fontName='Helvetica-Bold', fontSize=8.7, leading=11.8, textColor=WHITE),
    'code': ParagraphStyle('code', fontName='Courier', fontSize=7.8, leading=10.5, textColor=NAVY, spaceBefore=4, spaceAfter=9, backColor=PALE, borderPadding=7),
    'call': ParagraphStyle('call', fontName='Helvetica', fontSize=10, leading=14, textColor=NAVY),
    'ref': ParagraphStyle('ref', fontName='Helvetica', fontSize=8, leading=10.3, textColor=MUTED, spaceAfter=3),
}

REFS = [
    ('HTTP and JSON exchanges', 'MDN: Overview of HTTP', 'https://developer.mozilla.org/en-US/docs/Web/HTTP/Guides/Overview', 'Request/response, methods, and status codes.'),
    ('Java API', 'Spring: Building a RESTful Web Service', 'https://spring.io/guides/gs/rest-service/', 'Controllers, JSON responses, and endpoint structure.'),
    ('Persistence', 'Spring Data JPA reference', 'https://docs.spring.io/spring-data/jpa/reference/jpa.html', 'Repositories and database access; use project-managed versions.'),
    ('Embedded database', 'H2 official repository', 'https://github.com/h2database/h2database', 'Embedded and disk-based database concepts.'),
    ('Python API', 'FastAPI tutorial', 'https://fastapi.tiangolo.com/tutorial/', 'Typed requests, routes, responses, and errors.'),
    ('Request validation', 'Pydantic models', 'https://docs.pydantic.dev/latest/concepts/models/', 'Validation models for structured input.'),
    ('Frontend', 'React Quick Start', 'https://react.dev/learn', 'Components, state, events, and conditional rendering.'),
    ('Types', 'TypeScript Handbook', 'https://www.typescriptlang.org/docs/handbook/intro.html', 'Object types, nullable fields, and compile-time checks.'),
    ('Frontend tooling', 'Vite guide', 'https://vite.dev/guide/', 'Development server and production build concepts.'),
    ('Charts', 'Recharts guide', 'https://recharts.github.io/en-US/guide/', 'React chart components; project uses the 2.x line.'),
    ('Static hosting', 'NGINX: Serve Static Content', 'https://docs.nginx.com/nginx/admin-guide/web-server/serving-static-content/', 'Serving built browser assets.'),
    ('Containers', 'Docker: How Compose works', 'https://docs.docker.com/compose/intro/compose-application-model/', 'Services, networks, volumes, and project isolation.'),
    ('Startup', 'Docker: Control startup order', 'https://docs.docker.com/compose/how-tos/startup-order/', 'Health checks and dependency conditions.'),
    ('Offline backup', 'Docker: image save', 'https://docs.docker.com/reference/cli/docker/image/save/', 'Exporting local images to a tar archive.'),
    ('Preprocessing', 'scikit-learn: Pipelines', 'https://scikit-learn.org/stable/modules/compose.html', 'Chaining fitted preprocessing and inference.'),
    ('Classifier', 'scikit-learn: Logistic regression', 'https://scikit-learn.org/stable/modules/linear_model.html#logistic-regression', 'Linear classification and logistic scores.'),
    ('Score interpretation', 'scikit-learn: Probability calibration', 'https://scikit-learn.org/stable/modules/calibration.html', 'Why score values need calibration evidence.'),
    ('Evaluation', 'scikit-learn: Metrics and scoring', 'https://scikit-learn.org/stable/modules/model_evaluation.html', 'Confusion matrix, F1, ROC AUC, and other metrics.'),
    ('Model artifact', 'scikit-learn: Model persistence', 'https://scikit-learn.org/stable/model_persistence.html', 'Trusted artifacts and version compatibility.'),
    ('Python tests', 'Python 3.13 unittest', 'https://docs.python.org/3.13/library/unittest.html', 'Fixtures, cases, assertions, and suites.'),
    ('Java build', 'Maven Getting Started', 'https://maven.apache.org/guides/getting-started/', 'Dependency management and test/build lifecycle.'),
    ('Version history', 'Pro Git: About Version Control', 'https://git-scm.com/book/en/v2/Getting-Started-About-Version-Control', 'Tracking and sharing source changes.'),
    ('Research provenance', 'Chinese diabetes datasets for data-driven machine learning', 'https://www.nature.com/articles/s41597-023-01940-7', 'Source dataset paper; model evidence here comes from local model records.'),
    ('Dataset version', 'ShanghaiT1DM and ShanghaiT2DM, version 5', 'https://doi.org/10.6084/m9.figshare.20425518.v5', 'Dataset DOI recorded in project attribution; DOI access may redirect.'),
    ('Dataset attribution', 'Creative Commons Attribution 4.0', 'https://creativecommons.org/licenses/by/4.0/', 'Source license reference; separate from the project MIT code license.'),
]


def p(text, style='body'):
    return Paragraph(text, ST[style])


def h(text):
    return p(text, 'h2')


def code(text):
    lines = []
    for line in text.strip().splitlines():
        if len(line) > 94:
            raise ValueError('Code line too long: ' + line)
        lines.append(line)
    return Preformatted('\n'.join(lines), ST['code'])


def call(title, text):
    t = Table([[p('<b>' + title + '</b><br/>' + text, 'call')]], colWidths=[W])
    t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, -1), PALE), ('LINEBEFORE', (0, 0), (0, -1), 3, TEAL), ('LEFTPADDING', (0, 0), (-1, -1), 11), ('RIGHTPADDING', (0, 0), (-1, -1), 11), ('TOPPADDING', (0, 0), (-1, -1), 9), ('BOTTOMPADDING', (0, 0), (-1, -1), 9)]))
    return t


def table(headers, rows, widths):
    cells = [[p(escape(str(v)), 'th') for v in headers]] + [[p(str(v), 'table') for v in row] for row in rows]
    t = Table(cells, colWidths=[W * x for x in widths], repeatRows=1, hAlign='LEFT')
    t.setStyle(TableStyle([('BACKGROUND', (0, 0), (-1, 0), NAVY), ('VALIGN', (0, 0), (-1, -1), 'TOP'), ('ROWBACKGROUNDS', (0, 1), (-1, -1), [WHITE, colors.HexColor('#F5F8F9')]), ('LINEBELOW', (0, 0), (-1, -1), .4, LINE), ('LEFTPADDING', (0, 0), (-1, -1), 7), ('RIGHTPADDING', (0, 0), (-1, -1), 7), ('TOPPADDING', (0, 0), (-1, -1), 7), ('BOTTOMPADDING', (0, 0), (-1, -1), 7)]))
    return t


def refs(*numbers):
    return p('Concept references: ' + ' | '.join(f'<a href="{REFS[n-1][2]}" color="#2469A0">[{n}] {REFS[n-1][1]}</a>' for n in numbers), 'small')


def source(path):
    return p('Project source: ' + escape(path), 'small')


class Diagram(Flowable):
    def __init__(self, kind, height=190):
        Flowable.__init__(self)
        self.width = W
        self.height = height
        self.kind = kind

    def draw(self):
        c = self.canv
        if self.kind == 'architecture':
            self.box(0, 150, 140, 59, 'Synthetic fixtures', 'profile + meal + CGM history')
            self.box(0, 45, 140, 59, 'HTTP replay', 'nine events per patient')
            self.box(192, 96, 141, 66, 'Spring Boot', 'fusion + API boundary', TEAL)
            self.box(375, 160, 115, 56, 'FastAPI + model', '43 inputs -> score')
            self.box(375, 73, 115, 56, 'H2 storage', 'persisted CGM')
            self.box(192, 0, 141, 53, 'React dashboard', 'profile + chart + result')
            self.arrow(70, 150, 70, 104)
            self.arrow(140, 74, 192, 120)
            self.arrow(140, 180, 192, 151)
            self.arrow(333, 144, 375, 180)
            self.arrow(375, 163, 333, 130)
            self.arrow(333, 110, 375, 100)
            self.arrow(257, 96, 257, 53)
            self.label(111, 118, 'POST events')
            self.label(267, 67, 'browser uses Spring only')
        elif self.kind == 'timeline':
            self.box(0, 95, 230, 52, 'Observed INPUT history', '-120 min through meal baseline')
            self.box(263, 95, 230, 52, 'Predicted FUTURE window', 'after baseline through +120 min', BLUE)
            c.setStrokeColor(MUTED); c.line(12, 62, 484, 62)
            for i in range(9):
                x = 12 + i * 27
                c.setFillColor(TEAL); c.circle(x, 62, 3, fill=1, stroke=0)
            for x, txt in [(12, '-120'), (120, '-60'), (228, '0 / meal'), (484, '+120')]:
                c.setStrokeColor(MUTED); c.line(x, 56, x, 68)
                self.label(x, 38, txt, center=True)
            c.setDash(3, 3); c.setStrokeColor(BLUE); c.line(235, 62, 484, 62); c.setDash()
            self.arrow(228, 80, 228, 152)
            self.label(252, 163, 'Score is requested here', center=True)
            self.label(261, 8, 'Future outcomes are not included in either demo fixture', center=True)
        elif self.kind == 'sequence':
            xs = [40, 175, 310, 453]
            for x, title in zip(xs, ['Browser', 'Spring', 'H2', 'FastAPI']):
                self.box(x - 36, self.height - 38, 76, 31, title, '')
                c.setStrokeColor(LINE); c.line(x, 20, x, self.height - 43)
            for y, a, b, txt in [(216, 0, 1, '1. POST refresh'), (181, 1, 2, '2. Read CGM'), (149, 2, 1, '3. Return history'), (110, 1, 3, '4. POST 43 features + horizon'), (73, 3, 1, '5. Score + top factors'), (37, 1, 0, '6. Save result in memory; return JSON')]:
                self.arrow(xs[a], y, xs[b], y)
                self.label((xs[a] + xs[b]) / 2, y + 7, txt, center=True, size=7.4)
        elif self.kind == 'pipeline':
            labels = [('43 inputs', 'numeric/null'), ('Imputer', 'fitted medians'), ('Scaler', 'fitted scale'), ('Logistic', 'score + flag')]
            for i, (title, sub) in enumerate(labels):
                self.box(i * 129, 64, 106, 57, title, sub, TEAL if i == 3 else NAVY)
                if i < 3: self.arrow(i * 129 + 106, 91, (i + 1) * 129, 91)
            self.label(245, 33, 'Transform with the saved training pipeline; do not refit on a demo patient', center=True)
            self.label(245, 12, 'Top factors = largest absolute transformed-value x coefficient terms', center=True)
        elif self.kind == 'states':
            self.box(0, 91, 115, 55, 'Pending', 'no score requested')
            self.box(185, 91, 125, 55, 'Request score', 'POST /refresh', TEAL)
            self.box(372, 150, 120, 48, 'Available', 'score + factors', TEAL)
            self.box(372, 83, 120, 48, 'Unavailable', 'null score', GOLD)
            self.box(372, 16, 120, 48, 'Needs history', 'less than 9 readings', BLUE)
            self.arrow(115, 118, 185, 118)
            for y in (174, 107, 40): self.arrow(310, 118, 372, y)
            self.label(180, 25, 'A refresh is required to detect model outage and recovery', center=True)
        elif self.kind == 'modules':
            for i, (title, sub) in enumerate([('1 Data', 'fixture agreement'), ('2 Replay', 'dry-run events'), ('3 Backend', 'feature tests'), ('4 ML', 'hash + schema'), ('5 Dashboard', 'preview API'), ('6 Packaging', 'Compose + backup'), ('7 Docs', 'scope + evidence')]):
                col, row = i % 4, i // 4
                self.box(col * 127, 133 - row * 78, 112, 55, title, sub)
            self.box(380, 55, 112, 55, '2 November', 'assembled acceptance', TEAL)
            self.label(246, 20, 'Independent readiness first; complete interface and demonstration gates together', center=True)
        elif self.kind == 'learning':
            levels = [('1 Explain', 'problem + target'), ('2 Trace', 'one patient + event'), ('3 Inspect', 'feature + model'), ('4 Verify', 'tests + failure'), ('5 Present', 'value + limits')]
            for i, (title, sub) in enumerate(levels):
                x = i * 99
                self.box(x, 55, 88, 58, title, sub, TEAL if i == 4 else NAVY)
                if i < 4: self.arrow(x + 88, 84, x + 99, 84)
            self.label(246, 24, 'Move on only when you can explain the output of the previous step', center=True)
        elif self.kind == 'confusion':
            cells = [(108, 99, '117', 'true negatives', PALE), (284, 99, '76', 'false positives', colors.HexColor('#FFF0D9')), (108, 18, '78', 'false negatives', colors.HexColor('#FFF0D9')), (284, 18, '222', 'true positives', PALE)]
            self.label(192, 192, 'Predicted no event', center=True)
            self.label(368, 192, 'Predicted event', center=True)
            self.label(2, 135, 'Actual no event')
            self.label(2, 55, 'Actual event')
            for x, y, number, title, bg in cells:
                c.setFillColor(bg); c.roundRect(x, y, 166, 73, 6, fill=1, stroke=0)
                c.setFont('Helvetica-Bold', 23); c.setFillColor(NAVY); c.drawCentredString(x + 83, y + 40, number)
                self.label(x + 83, y + 19, title, center=True)

    def label(self, x, y, text, center=False, size=8.2):
        c = self.canv; c.setFillColor(MUTED); c.setFont('Helvetica', size)
        if center: c.drawCentredString(x, y, text)
        else: c.drawString(x, y, text)

    def box(self, x, y, w, ht, title, subtitle, color=NAVY):
        c = self.canv; c.setFillColor(PALE); c.setStrokeColor(LINE)
        c.roundRect(x, y, w, ht, 7, fill=1, stroke=1)
        c.setFillColor(color); c.setFont('Helvetica-Bold', 10)
        c.drawCentredString(x + w/2, y + ht - 19 if subtitle else y + ht/2 - 3, title)
        if subtitle:
            for i, line in enumerate(textwrap.wrap(subtitle, width=max(16, int(w/4.1)))):
                self.label(x + w/2, y + ht - 33 - i * 10, line, center=True, size=7.8)

    def arrow(self, x1, y1, x2, y2):
        c = self.canv; c.setStrokeColor(TEAL); c.setFillColor(TEAL); c.setLineWidth(1.2)
        c.line(x1, y1, x2, y2)
        angle = math.atan2(y2 - y1, x2 - x1)
        path = c.beginPath(); path.moveTo(x2, y2)
        for delta in (.42, -.42):
            path.lineTo(x2 - 6 * math.cos(angle + delta), y2 - 6 * math.sin(angle + delta))
        path.close(); c.drawPath(path, fill=1, stroke=0)


PAGES = []


def page(section, title, intro, *items):
    PAGES.append((section, title, [p(section.upper(), 'kicker'), p(title, 'h1'), p(intro)] + list(items)))


def build_content():
    # Every planned page is a distinct unit so the reading paths are reliable.
    PAGES.append(('HANDBOOK', 'GlucoTwin', [
        Spacer(1, 35), p('PROJECT HANDBOOK / 01 NOVEMBER 2026', 'kicker'),
        Paragraph('GlucoTwin', ParagraphStyle('cover', fontName='Helvetica-Bold', fontSize=43, leading=49, textColor=NAVY, spaceAfter=16)),
        p('Understand the problem.<br/>Trace every component.<br/>Study the implementation.<br/>Present the evidence.', 'h1'),
        Spacer(1, 13), Diagram('modules', 205),
        call('One project, two perspectives', 'A plain-language guide for clients and judges, and a practical learning companion for the team building the prototype.'),
        Spacer(1, 16), p('Edition: seven-module preparation checkpoint. Final assembly and acceptance are scheduled for 2 November 2026.', 'small'),
        p('Public demo inputs are synthetic. The model score is uncalibrated and not clinically validated. No diagnosis, dosing, or emergency use.', 'small'),
    ]))
    page('START HERE', 'Choose your reading path',
         'Use this handbook to understand and explain the existing source tree at D:\\3Nov. It is a study guide and a module handoff reference; source files and the saved model are still required to run the project.',
         call('For a client or judge - around 15 minutes', 'Read pages 3-5, 12-13, 23-24. Focus on the problem, visible behavior, evidence, and what a successful demonstration proves.'),
         Spacer(1, 9), call('For a builder - a sequence of hands-on sessions', 'Read pages 4-11, then 14-22 and 25-27. Follow one synthetic patient through the code before trying to change multiple services.'),
         h('Map of the handbook'),
         table(['Pages', 'Topic'], [('3-6', 'Problem, scope, architecture, and a score request'), ('7-16', 'Modules explained individually, plus model evidence and UI behavior'), ('17-20', 'Technology concepts, study order, source map, and labs'), ('21-24', 'Assembly, troubleshooting, judging, and next steps'), ('25-27', 'All 43 inputs and a practical glossary'), ('28-30', 'Official reference links and local evidence map')], [.16, .84]),
         h('What the status labels mean'), p('<b>Implemented</b> means code exists. <b>Independently checked</b> means a specific test or build passed. <b>Historically verified</b> refers to the October 30 integrated demo. <b>Assembly pending</b> means the November 2 service-to-service gate has not been signed off.'),
         p('Reference numbers link to official explanations; pages 28-29 contain the full clickable URLs. Local paths identify the implementation being described. Official documentation can evolve; keep the versions declared in this project.' , 'small'))

    page('CLIENT / JUDGE', 'What problem does it solve?',
         'A patient record describes relatively slow-changing context. A glucose timeline describes a much faster signal. The prototype demonstrates how to put those two views together at a defined meal-time decision point.',
         h('The situation'), p('Imagine reviewing a synthetic patient with a recent meal, a rising glucose history, and a static record containing age, HbA1c, BMI, diabetes duration, and medication context. A glucose number alone does not show all of that context. A static profile alone does not show the recent trend.'),
         h('The proposed value'), p('GlucoTwin creates one view of the synthetic patient and passes a consistent feature vector to a fitted model. The dashboard displays the score, the next-120-minute horizon, the preceding glucose history, and the strongest model contributors. That makes the demonstration traceable from inputs to output.'),
         table(['Judge wants to know', 'What the demonstration can show'], [('What is the input?', 'A fictional patient record, meal description, and simulated glucose history.'), ('What is the output?', 'A model score for a specified future event, with threshold classification and contributors.'), ('What did the team build?', 'The service connections, feature construction, API, replay, UI, and local packaging.'), ('What is the immediate benefit?', 'A working example of combined context and a visible model-failure state.'), ('What remains unproven?', 'Better care, saved clinician time, clinical safety, and performance on new populations.')], [.32, .68]),
         h('A 30-second explanation'), call('Suggested wording', 'GlucoTwin is a research virtual patient. It combines a synthetic health record with simulated glucose history and scores a defined post-meal event for the next two hours. We show the score alongside its context and contributing factors, and make model failures visible. The present evidence supports a software demonstration; clinical benefit still needs study.'))

    page('SCOPE', 'What exactly is being predicted?',
         'The meal-time baseline is time zero. The model sees the record, meal context, and history available at that time. The outcome definition belongs to the following 120 minutes.',
         Diagram('timeline', 184),
         call('The research event', 'Within the future window: glucose >=180 mg/dL OR a rise >=40 mg/dL above baseline. These are the project\'s research-label rules, not medical advice.'),
         h('Work through DEMO-001'), p('Its latest pre-meal reading is 142 mg/dL. The rise rule would mean 182 mg/dL, while the fixed rule is 180 mg/dL. The model scores the future event. The fixture does not contain the future window, so it does not reveal whether that event actually happened.'),
         h('Why the high-score case needs careful explanation'), p('DEMO-002 already has a baseline of 190 mg/dL. It demonstrates a distinct high-score software path, but it is a weak showcase for anticipating a new excursion because the baseline is already above the fixed threshold. Do not present its 0.989 score as evidence of predicting an unseen rise. A future demonstration should include a below-threshold baseline and a separately defined synthetic future outcome.'),
         h('What "digital twin" means here'), p('It is a data-fusion representation of a virtual patient. The current build does not simulate organs, metabolism, treatment responses, or alternative meals. It also does not learn continuously from the two demo profiles.'),
         source('docs/CLINICAL_SCOPE.md; data/sample/*.json; FeatureBuilder.java'))

    page('CONNECTIONS', 'The whole system at a glance',
         'Spring Boot is the central boundary. The publisher and browser both talk to Spring. Spring reads the static profile, stores and retrieves CGM, constructs features, and calls the internal Python model service.',
         Diagram('architecture', 235),
         table(['Connection', 'Payload / responsibility'], [('Fixture -> Spring', 'Static patient and meal data loaded from bundled JSON resources.'), ('Fixture -> replay -> Spring', 'Nine timestamped HTTP CGM events per patient.'), ('Spring <-> H2', 'Glucose readings stored and retrieved in timestamp order.'), ('Spring <-> FastAPI', '43 named numeric/null inputs and fixed horizon; response with score/factors.'), ('Browser <-> Spring', 'Patient overview, history, explicit score request, and last prediction state.')], [.37, .63]),
         p('The source fixture is shared conceptually, but its history is delivered through ingestion. Spring does not automatically load the cgmHistory JSON section into H2. No MQTT broker is in the implemented path.', 'small'),
         refs(1, 2, 5, 12))

    page('CONNECTIONS', 'Follow one score request',
         'A button click triggers inference. Normal dashboard polling reads the latest state; polling itself does not rescore the meal.',
         Diagram('sequence', 282),
         h('Before the request'), p('The publisher must have delivered the required history. Spring accepts the known synthetic patient and stores each event ID once. The UI enables scoring after nine readings, while the backend additionally requires exact 15-, 30-, 60-, and 120-minute lags.'),
         h('After the response'), p('Spring stores the returned PredictionResponse in an in-memory map keyed by patient ID. The HTTP response updates the dashboard. Later polls can retrieve that result. A Spring restart clears prediction state even though H2 readings remain; request a new score after restarting.'),
         h('When a call fails'), p('The refresh path catches feature/model errors and returns unavailable with null result fields. A displayed available result is not a continuous model-health guarantee: an outage is discovered when a new refresh attempts the call.'),
         source('PatientController.java; PredictionService.java; PredictionClient.java; frontend/dashboard/src/App.tsx'))

    page('PART 1 / DATA', 'Build a reproducible patient story',
         'A fixture is a small, repeatable scenario. It supplies known inputs so developers can inspect behavior without collecting real patient information.',
         table(['Fixture section', 'Meaning', 'Used by'], [('provenance', 'Explicit synthetic flag; real patient data flag must be false.', 'Replay validation and Spring profile loading'), ('patient', 'ID, age, sex, BMI, HbA1c, duration, fasting glucose, diagnoses and medicines.', 'Static record and feature builder'), ('currentMeal', 'Description, time since previous meal, and recorded medication-at-meal fields.', 'Feature builder and dashboard'), ('cgmHistory', 'Nine readings at offsets 120, 105, ... 0 minutes before baseline.', 'Replay publisher')], [.23, .48, .29]),
         h('The two current scenarios'), p('<b>DEMO-001:</b> 52-year-old fictional woman; glucose history 112 to 142 mg/dL; brown rice, vegetables, and chicken. <b>DEMO-002:</b> 67-year-old fictional man; glucose history 120 to 190 mg/dL; bread, corn, and milk. Values refer to history leading into the meal, not a measured post-meal response.'),
         h('Inputs are different from labels'), p('The public fixtures have no future outcome label. The model was fitted elsewhere on ShanghaiT2DM-derived research meal windows. A successful demo score is not a training result and does not create new validation evidence.'),
         h('Study and verify'), p('Open demo_patient_001.json and locate the patient ID, meal text, and minutesBefore fields. Confirm the two fixture copies agree: one is in data/sample and another is bundled into Spring resources. Run the data module check before changing a field.'),
         code('.\\tools\\Module.ps1 -Part data -Action Check'),
         call('Checkpoint', 'Prepared: two validated synthetic scenarios and a defined schema. Assembly day: confirm the same patient context and baseline appear through the real API and dashboard.'),
         source('data/sample/; backend/fusion-api/src/main/resources/demo_patient_*.json'))

    page('PART 2 / REPLAY', 'Turn a fixture into an event stream',
         'The replay publisher behaves like a simple simulated sensor source. It emits historical samples in order so the receiving service can build up the patient timeline.',
         h('Step by step'), p('<b>1.</b> Load a fixture and require explicit synthetic provenance. <b>2.</b> Require the nine unique offsets from 120 down to zero. <b>3.</b> Convert each offset into a timestamp relative to the configured simulated meal time. <b>4.</b> Generate stable event IDs. <b>5.</b> Send JSON over HTTP, or print it in dry-run mode.'),
         code('''{
  "patientId": "DEMO-001",
  "eventId": "DEMO-001-HISTORY-01",
  "observedAt": "2026-10-30T10:00:00Z",
  "glucoseMgDl": 112.0,
  "source": "synthetic-cgm-replay"
}'''),
         h('Concepts you should understand'), p('<b>Determinism:</b> the same fixture and baseline produce the same events. <b>Idempotency:</b> repeated delivery of the same event ID must not add another reading. <b>Event time:</b> observedAt is the simulated measurement time; it is not the wall-clock time of replay. The default 1.2-second delivery interval compresses a two-hour history into a short demonstration.'),
         h('Independent exercise'), code('''.\\tools\\Module.ps1 -Part replay -Action Check
.\\tools\\Module.ps1 -Part replay -Action Start'''),
         p('The module Start command builds the replay image, prints 18 events for both fixtures, and exits without HTTP delivery. The original assembly publisher uses its normal sending command. Docker must be running for the Start command.'),
         call('Checkpoint', 'Prepared: validation, event generation, and dry-run tests. Assembly day: verify real delivery, nine stored readings per patient, duplicate suppression, and a successful one-shot exit.'),
         source('cgm-publisher/app.py: build_events(), main(); tests/test_modules.py'), refs(1, 20))

    page('PART 3 / BACKEND', 'Spring owns the fusion boundary',
         'A controller translates an HTTP request into application work. A service contains that work. A repository handles stored entities. In this project, those roles keep the browser and model separated.',
         table(['Source class', 'What to read for'], [('PatientController', 'Route definitions, patient views, ingestion and refresh endpoints.'), ('DemoPatientService', 'Load two known profiles and reject non-synthetic fixtures.'), ('CgmService / CgmReadingRepository', 'Validate patient, ignore duplicate IDs, save/read ordered glucose events.'), ('FeatureBuilder', 'Construct the 43 inputs from the profile, meal, and recent history.'), ('PredictionService', 'Pending/insufficient/available/unavailable states; result memory map.'), ('PredictionClient', 'HTTP JSON call to FastAPI; response mapped to a Java record.')], [.39, .61]),
         h('What H2 stores'), p('The current database persists received CGM readings in a file on a Docker volume. Static profiles come from JSON resources. Latest predictions live in memory, not in a prediction database table. Removing the named volume removes the stored synthetic readings.'),
         h('Input validation and failure behavior'), p('The ingestion record requires patient ID, event ID, timestamp, source, and glucose between 40 and 500 mg/dL. The service only accepts enabled synthetic patients. A missing model response or exception during refresh becomes unavailable. The broad catch currently groups several causes together; better diagnostic categories are a later improvement.'),
         h('Study and verify'), code('mvn -f backend/fusion-api/pom.xml test'),
         p('Five Java tests cover both feature-vector scenarios, known values, missing history, and an absent exact lag. They do not start the whole application or prove database concurrency and end-to-end outage recovery.'),
         source('backend/fusion-api/src/main/java/com/glucotwin/api/; pom.xml'), refs(2, 3, 4, 21))

    page('PART 3 / FEATURES', 'How raw context becomes 43 numbers',
         'A feature is a numeric representation the fitted model understands. The builder combines several families; the response score depends on the whole vector, not a single displayed glucose value.',
         table(['Group', 'Count', 'Example / interpretation'], [('Glucose history', '15', 'Baseline, four lags, four changes, mean, sample standard deviation, min, max, range, count.'), ('Timing', '4', 'Hour sine/cosine, weekend flag, time since previous meal.'), ('Meal description', '11', 'Reported food weight, quantity count, text length, eight keyword flags.'), ('Recorded medication', '7', 'Two numeric pump fields and five recorded-event flags.'), ('Static record', '6', 'Female indicator, age, BMI, duration, HbA1c and fasting plasma glucose.')], [.27, .10, .63]),
         h('Worked feature calculations'), p('For DEMO-001, baseline is 142 and the reading 15 minutes earlier is 136, so glucose_change_prev_15_min_mg_dl is <b>6</b>. The 120-minute change is 142 - 112 = <b>30</b>. Food text reports 120 g + 150 g + 60 g, giving <b>330 g of reported food</b>. This is not carbohydrate grams.'),
         h('Time and missing values'), p('The builder uses the latest stored reading as the meal baseline and derives time-of-day/weekend values in UTC. Demo timestamps are fixed for reproducibility. Exact lag gaps fail this demo builder; missing static numbers can be passed as null and filled by the model\'s fitted imputer. The history calculation includes time zero.'),
         call('Avoid leakage', 'Future glucose, the eventual outcome label, patient IDs and split assignments must not enter the feature vector. Changing a meal description changes keyword features; it is not a validated dietary intervention or counterfactual simulation.'),
         source('FeatureBuilder.java; contracts/v1.json; docs/FEATURE_DICTIONARY.md'),
         p('Pages 25-26 list every feature. The Java map is matched by names; FastAPI reorders the incoming values into its frozen 43-column order before scoring.', 'small'))

    page('PART 4 / MODEL', 'Serve the fitted model consistently',
         'FastAPI provides a narrow inference API. It uses an existing fitted scikit-learn pipeline; there is no training endpoint and the demo does not retrain on the two fixtures.',
         Diagram('pipeline', 145),
         h('What each step means'), p('<b>Imputation</b> fills missing numeric values using medians learned during training and retains supported missing-value indicators. <b>Scaling</b> applies the learned numeric transformation. <b>Logistic regression</b> combines the transformed inputs and produces a bounded score. The application uses threshold 0.50 for predicted_event.'),
         h('Checks before scoring'), p('At startup the service compares the artifact SHA-256 to metadata, requires the training scikit-learn version, checks feature names/order and count, and checks expected pipeline steps. A hash match detects a changed bundle; it does not establish clinical quality or prove the artifact\'s origin. Only load the supplied trusted artifact.'),
         h('How factors are obtained'), p('For each transformed input, the service multiplies its value by its logistic-regression coefficient, ranks absolute contributions and returns the five largest. These are terms in the model\'s linear/log-odds calculation. They are not percentage changes in risk, causal effects, or a complete explanation of the result; the intercept and other terms also matter.'),
         h('Score interpretation'), p('A 0.368 score does not establish that this individual has a calibrated 36.8% chance of an event. Calibration, external validation, and confidence intervals have not been established. This is why the interface says model score.'),
         source('ml-service/app/main.py; artifacts/model_metadata.json; requirements.txt'), refs(5, 6, 15, 16, 17, 19))

    page('MODEL EVIDENCE', 'What the reported results support',
         'The following numbers come from the supplied local model card and metadata. They are not new measurements performed while making this handbook, and the source dataset paper is not the source of these model scores.',
         table(['Metric', 'Model', 'Comparison'], [('ROC AUC', '0.757', '0.500 random ranking reference'), ('Balanced accuracy', '0.673', '0.500 reference'), ('F1 at 0.50', '0.742', '0.757 always-positive baseline')], [.38, .19, .43]),
         Spacer(1, 9), Diagram('confusion', 205),
         h('How to read it'), p('The held-out test set contains 493 meals from 15 patients in a patient-level split. There are 300 event-positive meals: 300/493 = <b>60.9%</b>. At 0.50, 222 of those events are identified and 78 are missed. There are 76 false positives and 117 true negatives.'),
         p('ROC AUC measures ranking over thresholds, not "75.7% accuracy." F1 summarizes precision and recall at one threshold. Here, F1 is below always-positive, so ranking performance does not imply a superior threshold policy. Balanced accuracy gives event and no-event sensitivity equal weight.'),
         call('What remains to establish', 'Calibration, uncertainty intervals, external validation, fairness analysis, and clinical review. Synthetic demo outputs do not validate any of these.'),
         source('docs/MODEL_CARD.md; artifacts/model_metadata.json'), refs(17, 18))

    page('PART 5 / DASHBOARD', 'What a viewer should see',
         'The doctor-facing view brings the synthetic record, pre-meal glucose curve, score and horizon together. A useful walkthrough follows the viewer\'s questions rather than the order in which the code was written.',
         Image(str(ROOT / 'docs/screenshots/dashboard_patient_001_pitch.png'), width=W, height=W * 810/1440),
         p('Historical screenshot: October 30 integrated demo. This image is evidence of that earlier state; it is not a fresh screenshot of the modular preview.', 'small'),
         table(['Viewer asks', 'Point to'], [('Who is this?', 'Scenario selector and fictional patient context.'), ('What has changed?', 'Glucose-history chart from -120 minutes to the meal baseline.'), ('What is being scored?', 'Research target, score status, and next-120-minute horizon.'), ('What contributed?', 'Leading model factors with raises/lowers directions.'), ('Can I use this clinically?', 'Persistent research/synthetic and no diagnosis/dosing/emergency wording.')], [.30, .70]),
         h('Technology in this part'), p('React holds screen state and renders components; TypeScript describes expected objects and nullability; Recharts draws the glucose line; Vite builds browser assets; NGINX serves those assets in the image. The browser fetches Spring about every 2.5 seconds. A button triggers a fresh model call.'),
         source('frontend/dashboard/src/App.tsx; styles.css; Dockerfile'), refs(7, 8, 9, 10, 11))

    page('PART 5 / STATES', 'Preview safely, then connect the model',
         'The same page needs to explain success, waiting, incomplete history and failure. A preview mode lets the dashboard be developed independently of the real model connection.',
         Diagram('states', 212),
         h('Two configurations, two expectations'), table(['Configuration', 'API and behavior'], [('Module preview', 'Dashboard at localhost:13000 calls preview API at localhost:18081. Synthetic history appears; model score remains unavailable/null. Patient display names include PREVIEW ONLY.'), ('Assembled demonstration', 'Dashboard at localhost:3000 calls Spring at localhost:8080. After a real refresh, the model can return available or unavailable.')], [.30, .70]),
         h('Why preview output is deliberately limited'), p('The preview API supplies fixture context and history but never loads the fitted artifact or reproduces the historical 0.368/0.989 scores. It is useful for inspecting labels, charts, empty/error behavior and patient context. The available-score path still requires real inference at assembly.'),
         h('What to verify on assembly day'), p('Switch patients and confirm the displayed profile, history and prediction all belong to the selected patient. Trigger a score, stop ML, refresh again and confirm unavailable replaces the result. Restart ML, wait for readiness and refresh once more. Existing tests do not replace these browser checks.'),
         code('.\\tools\\Module.ps1 -Part dashboard -Action Start'),
         source('tools/preview_api.py; compose.modules.yaml; App.tsx'), refs(7, 8))

    page('PART 6 / PACKAGING', 'Containers make the demo portable',
         'An image is a built software package; a container is a running instance. Compose defines services, their networks, environment settings, volumes and startup conditions. A volume keeps stored data outside a replaceable container.',
         table(['Endpoint', 'Assembled demo', 'Module work'], [('Browser dashboard', 'localhost:3000', 'localhost:13000'), ('Spring API', 'localhost:8080', 'localhost:18080'), ('Model API', 'Internal: ml-service:8000', 'localhost:18000'), ('Preview API', 'Not part of assembly', 'localhost:18081'), ('H2 volume', 'glucotwin project volume', 'Separate module-h2 volume')], [.34, .33, .33]),
         h('Understand localhost'), p('In the browser, localhost means the presentation computer. Inside a container, localhost means that container. Spring therefore calls the model using its Compose service name. The browser cannot use that internal name; its compiled API URL points to the host port. VITE_API_BASE_URL is a build-time setting, so a changed frontend target needs a rebuild.'),
         h('Independent versus assembled startup'), p('The original Compose file waits for model health before starting Spring, then Spring readiness before dashboard/replay startup. The module file has separate images, ports and storage and does not automatically start the full dependency chain. Its default replay action is dry-run.'),
         h('Offline recovery'), p('The image archive contains four built images. Copy it with the project folder, load it with docker image load, then use docker compose up -d --no-build. Docker Desktop must already be installed and running. The October 30 archive predates the module changes and must be regenerated after final acceptance.'),
         source('compose.yaml; compose.modules.yaml; Dockerfiles; tools/Module.ps1'), refs(12, 13, 14))

    page('PART 7 / HANDOFF', 'Keep the story and the code aligned',
         'Documentation is an interface for collaborators and judges. It records the target, assumptions, verified behavior, remaining gaps and how to reproduce a result.',
         Diagram('modules', 208),
         table(['Document / artifact', 'Purpose'], [('contracts/v1.json', 'Shared field names, ordered features, patient IDs, horizon, threshold, routes.'), ('MODULE_PLAN / CHECK_RESULTS', 'Ownership, independent actions, observed tests and unverified gates.'), ('ASSEMBLY_NOV_2', 'Sequence for assembling the real services and recording final evidence.'), ('MODEL_CARD / CLINICAL_SCOPE', 'Evidence, label definition, limits and permitted demonstration claims.'), ('Deck / runbook / screenshots', 'Presentation and recovery materials; refresh after the final assembled build.')], [.40, .60]),
         h('What the 90% checkpoint means'), p('Each part has implementation and an independent verification route. The remaining work is cross-service acceptance and presentation approval on 2 November. "90%" is the team\'s planning checkpoint, not a measured completion statistic. Existing integrated code is preserved rather than intentionally disabled.'),
         h('Version and provenance discipline'), p('Keep the frozen contract coordinated across both ends of an interface. Record which model artifact, fixture, image build and screenshot produced the evidence. A source ZIP is a recovery checkpoint; Git would add a reviewable change history. At the latest inspection, the folder was not yet a local Git repository.'),
         source('docs/MODULE_PLAN.md; docs/ASSEMBLY_NOV_2.md; deliverables/checkpoints/'), refs(22))

    page('TECHNOLOGY CONCEPTS', 'Know each tool\'s job',
         'Study the role a technology plays before its complete API. The stack is split across Java, Python and browser code so each service has a clear responsibility.',
         table(['Tool / concept', 'Meaning in this project'], [('Java 21 + Spring Boot', 'Typed application service that owns patient data access, features and browser API.'), ('Maven + JUnit', 'Java dependency/build lifecycle and automated feature tests.'), ('Python 3.13 image', 'Runtime for the replay, preview, and inference container code.'), ('FastAPI + Uvicorn + Pydantic', 'Python API routes, ASGI serving, and typed request validation.'), ('pandas + NumPy', 'Ordered numeric input row and contribution calculations.'), ('scikit-learn + joblib', 'Fitted imputer/scaler/classifier and saved pipeline artifact; sklearn is pinned to training version 1.9.1.'), ('React + TypeScript', 'Interactive components with typed expected data; compile-time types are not runtime API validation.'), ('Vite + npm lockfile', 'Build browser assets and install recorded dependency resolutions using npm ci.'), ('Recharts + CSS', 'Display glucose history and style dashboard layout/states.'), ('H2 + JPA', 'Embedded relational storage and repository access for CGM readings.'), ('Docker + Compose + NGINX', 'Package processes, connect them locally, and serve the browser files.'), ('PowerShell + unittest', 'Module commands and independent Python verification.')], [.35, .65]),
         p('The project currently uses Spring Boot 3.5.16 and the Recharts 2.x line. Official reference sites may show newer major versions. Learn the concepts there, but do not change dependency versions during assembly without retesting. The frontend has a generated lockfile; Python packages other than sklearn still use version ranges.', 'small'),
         refs(2, 5, 8, 9, 12, 15, 20, 21))

    page('STUDY PATH', 'Learn it in five passes',
         'Do not begin by memorizing every class. Use progressively deeper passes, and explain each pass in your own words before moving to the next.',
         Diagram('learning', 140),
         table(['Pass', 'Read / do', 'You should be able to explain'], [('1. Problem', 'Pages 3-5 and CLINICAL_SCOPE; draw the timeline.', 'Whose workflow is represented; input vs future label; what the score means.'), ('2. Data', 'Read DEMO-001 fixture, replay build_events, and ingestion route.', 'How a JSON reading gets a stable ID and becomes persisted history.'), ('3. Prediction', 'FeatureBuilder -> PredictionClient -> FastAPI predict.', 'How 142 and 136 become a +6 feature; why preprocessing is reused.'), ('4. Behavior', 'Run module checks and read UI state handling.', 'What happens without history, without ML, after restart, and on duplicate replay.'), ('5. Presentation', 'Use page 23; explain metrics from page 12.', 'Which claims are demonstrated and which require future validation.')], [.17, .41, .42]),
         h('A practical pace'), p('Give each pass a focused session with a visible output: a diagram, an annotated fixture, a traced function call, a test result, or a recorded explanation. Time varies with prior Java/React/Python knowledge. If a concept is unclear, open the matching official reference on pages 28-29 rather than starting an unrelated full course.'),
         call('Readiness test', 'Can you explain where the score came from, what data it could see, and why it becomes unavailable when inference fails? If yes, you understand the central loop.'))

    page('SOURCE WALKTHROUGH', 'Read the code in this order',
         'Paths below are relative to D:\\3Nov. Java class names in rows 4-7 are under backend/fusion-api/src/main/java/com/glucotwin/api/.',
         table(['Order', 'File / function', 'Question to answer'], [('1', 'contracts/v1.json', 'Which field names and 43 features must agree?'), ('2', 'data/sample/demo_patient_001.json', 'Which values describe static context and which describe history?'), ('3', 'cgm-publisher/app.py: build_events', 'How are timestamps and event IDs generated?'), ('4', 'PatientController + CgmService', 'Where does HTTP become validation and database work?'), ('5', 'DemoPatientService + FeatureBuilder', 'Where do profile, meal and glucose history meet?'), ('6', 'PredictionService: refresh', 'What gates scoring and which state is stored?'), ('7', 'PredictionClient: predict', 'What exactly is sent across the Java/Python boundary?'), ('8', 'ml-service/app/main.py: load_model / predict', 'How are artifact compatibility, column order, score and factors checked?'), ('9', 'frontend/dashboard/src/App.tsx', 'Which requests poll, which request scores, and how does the UI handle null?'), ('10', 'compose*.yaml + tools/Module.ps1', 'How do module and assembly environments differ?'), ('11', 'tests/test_modules.py + FeatureBuilderTest.java', 'Which behaviors have independent evidence?')], [.10, .47, .43]),
         h('Three tracing exercises'), p('<b>Trace a number:</b> follow 142 mg/dL from fixture to event to baseline feature. <b>Trace a state:</b> follow a model exception to an unavailable PredictionResponse and a hidden score card value. <b>Trace persistence:</b> locate the repository and volume, then contrast them with the in-memory prediction map.'),
         p('Write down the exact method and response field at each hop. That small trace is more useful for debugging than remembering the entire repository structure.', 'small'))

    page('PRACTICAL LABS', 'Study each part without assembling it',
         'Use PowerShell from the project root. Default checks need Python 3; Docker module commands need Docker Desktop. Native Java tests need JDK 21 and Maven. Native frontend build needs Node/npm.',
         h('Lab 1 - Validate the shared inputs'), code('''Set-Location D:\\3Nov
.\\tools\\Module.ps1
.\\tools\\Module.ps1 -Part data -Action Check'''),
         p('Expect seven entry-point checks and eight Python tests. Some entry-point checks establish file presence only; they do not prove that a service ran. Change a fixture only in a spare copy and observe what the validation rejects.'),
         h('Lab 2 - Inspect replay without sending data'), code('.\\tools\\Module.ps1 -Part replay -Action Start'),
         p('Expect 18 JSON events and exit. No backend is needed. Inspect the earliest and latest timestamps and explain why event time differs from replay speed.'),
         h('Lab 3 - Verify features and frontend compilation'), code('''mvn -f backend/fusion-api/pom.xml test
npm.cmd --prefix frontend/dashboard ci
npm.cmd --prefix frontend/dashboard run build'''),
         p('Expect five Java tests and a successful TypeScript/Vite build. A bundle-size warning is different from a failed build. Local certificate issues and the system-CA workaround are documented in MODULE_PLAN.md; certificate validation stays enabled.'),
         h('Lab 4 - Preview the dashboard module'), code('''.\\tools\\Module.ps1 -Part dashboard -Action Start
# Open http://localhost:13000
.\\tools\\Module.ps1 -Part dashboard -Action Stop'''),
         p('Expect synthetic history and an unavailable score. This is correct preview behavior. The assembled available-score demonstration is intentionally left for 2 November.'),
         source('tools/Module.ps1; tools/check_modules.py; docs/MODULE_PLAN.md'))

    page('ASSEMBLY / 02 NOV', 'What to expect when parts meet',
         'Use the full checklist in docs/ASSEMBLY_NOV_2.md. The final 10% consists of observed cross-service acceptance, offline recovery and presentation review, rather than extra features.',
         table(['Stage', 'Action', 'Expected observation'], [('1. Freeze', 'Run independent checks and stop module containers.', 'Contract, fixtures and compiled code agree.'), ('2. Start', 'docker compose up --build -d', 'ML healthy; then Spring ready; publisher completes; dashboard healthy.'), ('3. Inspect', 'Read both patients and their history endpoints.', 'Nine CGM readings for each scenario.'), ('4. Score', 'Click score for each patient or POST refresh.', 'Real model result; compare with historical reference scores.'), ('5. Fail/recover', 'Stop ML, refresh; restart ML, wait, refresh.', 'Unavailable/null during failed call; available after recovery.'), ('6. Replay', 'Run the publisher again.', 'Duplicate IDs ignored; counts remain unchanged.'), ('7. Package', 'Save current images; load on target machine.', 'Start without rebuilding and repeat the essential checks.'), ('8. Present', 'Refresh screenshots/deck; record backup video.', 'A clear explanation with current evidence and limits.')], [.14, .43, .43]),
         h('Reference outputs, not fallback values'), p('With the October 30 fixtures and model, the observed scores were 0.3677653238 for DEMO-001 and 0.9887812722 for DEMO-002. These help detect a changed build. They must never be inserted into a response when the model is unavailable.'),
         call('Current evidence boundary', 'The November 1 independent checks passed eight Python tests, five Java tests, frontend compilation, and Compose configuration validation. Docker execution was unavailable during that work. The final assembled state must be verified on assembly day.'),
         source('docs/MODULE_CHECK_RESULTS.md; docs/ASSEMBLY_NOV_2.md'))

    page('DEBUGGING', 'Find the failing boundary',
         'Start with the smallest observation that narrows the problem. A passing source check, a healthy process, a successful model call and a correct browser view are different kinds of evidence.',
         table(['Observation', 'Where to inspect', 'What it means'], [('Cannot contact Docker engine', 'Docker Desktop Linux engine status.', 'Containers cannot be started; Compose config can still validate.'), ('Patient JSON wrong or missing', 'Fixture copies and DemoPatientService.', 'Static-record or patient-ID problem, before model inference.'), ('No glucose history', 'Publisher logs and /api/patients/{id}/cgm.', 'Delivery/ingestion issue; a pending score is expected.'), ('Nine readings but unavailable', 'Exact lag times, Spring and ML logs.', 'Count alone is insufficient; feature construction or inference may fail.'), ('ML health says status ok', 'Also inspect model_loaded and reason.', 'HTTP service can be alive while its model is not loaded.'), ('API has a result, browser cannot fetch', 'Browser network tab, built API URL and CORS.', 'Wrong host/port or browser cross-origin restrictions.'), ('Repeated replay, count increases', 'Event IDs and ingestion constraints.', 'Duplicate protection or a changed event identity must be investigated.'), ('Score disappears after Spring restart', 'PredictionService memory map.', 'Expected: request a fresh score; stored CGM should remain.')], [.31, .35, .34]),
         h('Useful commands'), code('''docker compose ps -a
docker compose logs --tail 100 spring ml-service cgm-publisher
Invoke-RestMethod http://localhost:8080/api/patients
Invoke-RestMethod http://localhost:8080/actuator/health/readiness'''),
         p('If a later-reading timestamp changes the inferred meal baseline, recheck the fixture and replay configuration. Current code is tailored to fixed meal snapshots; arbitrary live streams need explicit meal anchoring and freshness policies.', 'small'))

    page('CLIENT / JUDGE', 'Present the value with evidence',
         'A judge should leave understanding the problem, the implemented contribution, and the current limits. Show one complete flow, then answer questions from that evidence.',
         table(['Time', 'Show / say'], [('0:00-0:40', 'Explain the static-context plus changing-glucose problem and synthetic patient.'), ('0:40-1:20', 'Define the meal baseline and next-120-minute event. Point out history vs forecast.'), ('1:20-2:40', 'Show DEMO-001 profile, history, explicit score request, horizon and factors.'), ('2:40-3:20', 'Show a distinct scenario; explain the high-baseline limitation of DEMO-002.'), ('3:20-4:00', 'Demonstrate unavailable after a failed model call and successful recovery.'), ('4:00-5:00', 'Explain AUC/F1 limits and close with the engineering contribution.')], [.21, .79]),
         h('Questions you should be ready to answer'),
         p('<b>Why call it a twin?</b> It is a virtual patient state made from static context and a glucose timeline. Physiological simulation is future work.'),
         p('<b>Why no sensor?</b> Controlled synthetic replay lets us inspect and reproduce the integration. A sensor adapter could later feed the ingestion boundary after appropriate validation.'),
         p('<b>Did you train the model today?</b> No. We reuse a supplied fitted research model. Our current work implements its serving, features, API, UI and packaging.'),
         p('<b>Can doctors rely on it?</b> Clinical use has not been established. The current demonstration does not diagnose, dose or respond to emergencies.'),
         p('<b>How good is it?</b> The supplied test AUC is 0.757; F1 at 0.50 is below the always-positive baseline and 78 events are missed. No external validation or calibration is available.'),
         p('<b>What does your project prove?</b> That the implemented services can combine the intended inputs, serve a real model result and communicate failure visibly under the tested demo conditions.'),
         call('Avoid unsupported claims', 'Do not claim reduced admissions, better treatment, saved clinician hours, 75.7% accuracy, a patient-specific calibrated probability, or confirmed future outcomes from these two demo fixtures.'))

    page('EXPECTATIONS', 'What is ready, and what comes next?',
         'A useful roadmap separates software acceptance from research validation and product deployment. Passing one does not automatically pass the next.',
         table(['Horizon', 'Work and acceptance evidence'], [('Now: module preparation', 'Source checkpoint, frozen schema, dry-run replay, preview API, independent tests, compiled frontend, and validated Compose.'), ('2 November: assembled demo', 'Real service calls, two scenario results, outage/recovery, idempotency, target-machine startup, current backups and presentation evidence.'), ('Next engineering iteration', 'Explicit meal anchoring, freshness timestamps, automatic score scheduling policy, client timeouts, clearer error reasons, persistent prediction audit, broader tests.'), ('Research development', 'Calibration, uncertainty intervals, external/multi-cohort validation, subgroup analysis, and more informative prospective examples.'), ('Any future real-data product', 'Human requirements, clinician review, privacy/consent/security design, operational monitoring, and applicable governance before clinical evaluation.')], [.31, .69]),
         h('Known implementation limits'), p('The feature builder takes the latest received reading as baseline. Predictions are kept in memory and scoring is manual. The HTTP client has no explicit application-level timeout configured. Module preview does not exercise actual ML. Some checks test file presence; browser switching and database concurrency need wider testing.'),
         p('The public port configuration and local H2 development setup are intended for a local prototype. They do not constitute authenticated multi-user deployment. The current stack has no user login, patient consent workflow or hospital-system integration.'),
         h('Keep scope under control'), p('For assembly, complete the acceptance gates for the existing target. Larger platform changes, chart-library upgrades, physiological simulation, and new model claims should have their own requirements and tests. The value of the final demo comes from a clear, reproducible story.'),
         source('Current source inspection; docs/MODULE_CHECK_RESULTS.md; docs/MODEL_CARD.md'))

    feature_names = json.loads((ROOT / 'contracts/v1.json').read_text())['featureNames']
    meanings = [
        'CGM at the inferred meal baseline, mg/dL.', 'CGM exactly 15 min earlier, mg/dL.', 'CGM exactly 30 min earlier, mg/dL.', 'CGM exactly 60 min earlier, mg/dL.', 'CGM exactly 120 min earlier, mg/dL.',
        'Baseline minus 15-min lag, mg/dL.', 'Baseline minus 30-min lag, mg/dL.', 'Baseline minus 60-min lag, mg/dL.', 'Baseline minus 120-min lag, mg/dL.',
        'Mean of history including baseline, mg/dL.', 'Sample standard deviation of history, mg/dL.', 'Minimum in history window, mg/dL.', 'Maximum in history window, mg/dL.', 'History maximum minus minimum, mg/dL.', 'Count of readings in history window.',
        'Sine of fractional UTC hour on a 24-hour circle.', 'Cosine of fractional UTC hour on a 24-hour circle.', 'UTC Saturday/Sunday flag, 1 or 0.', 'Time since previous recorded meal, minutes.',
        'Sum of explicit food gram amounts; not carbs.', 'Count of explicit gram amounts in the text.', 'Number of characters in the meal description.',
        'Rice keyword present, 1 or 0.', 'Noodle/vermicelli keyword present, 1 or 0.', 'Bread/bun/toast keyword present, 1 or 0.', 'Listed fruit keyword present, 1 or 0.', 'Listed vegetable keyword present, 1 or 0.', 'Meat/fish/egg/shrimp keyword present, 1 or 0.', 'Milk/yogurt keyword present, 1 or 0.', 'Root/corn keyword present, 1 or 0.',
        'Recorded pump bolus at meal, IU.', 'Recorded pump basal setting, IU/hour.', 'Recorded pump bolus flag.', 'Recorded pump basal-setting flag.', 'Recorded injected-insulin flag.', 'Recorded non-insulin medication flag.', 'Recorded intravenous-insulin flag.',
        'Female source code =1; otherwise 0 in builder.', 'Age in years.', 'Body mass index, kg/m2.', 'Recorded diabetes duration, years.', 'Recorded HbA1c, percent.', 'Recorded fasting laboratory glucose, mg/dL.'
    ]
    assert len(feature_names) == len(meanings) == 43
    for start, end, title in [(0, 22, 'All 43 inputs: history, time and meal'), (22, 43, 'All 43 inputs: flags and patient context')]:
        rows = [(str(i + 1), '<font face="Courier" size="7">' + escape(feature_names[i]) + '</font>', meanings[i]) for i in range(start, end)]
        page('FEATURE REFERENCE', title, 'Names below follow the frozen inference order. The service receives all names, permits supported null numeric values, and reorders by this contract before scoring.',
             table(['#', 'Exact input name', 'Meaning'], rows, [.06, .53, .41]),
             source('contracts/v1.json; FeatureBuilder.java; docs/FEATURE_DICTIONARY.md'))

    page('GLOSSARY', 'Terms you will hear during the demo',
         'Use these explanations to keep discussion concrete. The definitions are tailored to this prototype.',
         table(['Term', 'Plain-language meaning'], [('EHR / CGM', 'Static electronic health record context / repeated glucose measurements. Demo versions are synthetic.'), ('Baseline / horizon', 'The meal-time reference point / how far into the future the event is defined.'), ('Feature / target', 'A numeric input the model may use / the future outcome the model is trained to predict.'), ('Inference / training', 'Using the fitted model to score new input / learning its parameters from data.'), ('Calibration / threshold', 'Agreement of score levels with observed frequencies / cutoff used to turn a score into a classification.'), ('Leakage', 'Using information at scoring time that would only be known later, or allowing evaluation data into training.'), ('API / endpoint / JSON', 'A software interface / one route and operation / the structured message format.'), ('Idempotency / determinism', 'Repeated event delivery has no extra effect / the same fixed inputs produce the same output.'), ('Imputation / scaling', 'Fill missing numbers / transform numbers using fitted preprocessing.'), ('Contribution', 'One transformed feature multiplied by its model coefficient; not a causal effect.'), ('Persistence / volume', 'Data survives process restart / Docker-managed storage outside a container.'), ('Contract / fixture', 'Shared names and rules between parts / a reproducible synthetic scenario.'), ('Unit test / integration test', 'Check a small behavior independently / check parts working together.'), ('Readiness / availability', 'A component is ready for a particular task / the requested result can actually be returned.')], [.31, .69]),
         refs(1, 12, 15, 17, 20))

    for start, end, title in [(0, 14, 'Official learning references'), (14, 25, 'Model, testing and data references')]:
        items = []
        for i in range(start, end):
            category, label, url, use = REFS[i]
            items.append(p(f'<b>[{i+1}] {escape(label)}</b> - {escape(category)}', 'ref'))
            items.append(p(f'<a href="{url}" color="#2469A0">{escape(url)}</a><br/>{escape(use)}', 'ref'))
            items.append(Spacer(1, 3))
        page('REFERENCES', title, 'Links were consulted for concepts during handbook preparation on 1 November 2026. Project-specific implementation and metrics are grounded in the local files listed on page 30. All descriptions here are paraphrased.', *items,
             p('The dataset DOI is carried from the project attribution record; the browser could not directly resolve it during preparation. The paper was located through its publisher record. Current documentation may describe newer library versions than this project.', 'small') if start == 14 else Spacer(1, 0))

    page('LOCAL EVIDENCE', 'Where this handbook gets its facts',
         'All paths here are relative to D:\\3Nov. The handbook was prepared from a source inspection and the recorded build evidence; no additional live Docker or clinical validation is claimed.',
         table(['Claim / subject', 'Local source'], [('Seven parts and 2 November assembly', 'docs/MODULE_PLAN.md; docs/ASSEMBLY_NOV_2.md'), ('Independent verification results', 'docs/MODULE_CHECK_RESULTS.md; tests/test_modules.py; FeatureBuilderTest.java'), ('Event definition and research boundaries', 'docs/CLINICAL_SCOPE.md'), ('Reported split, metrics and confusion matrix', 'docs/MODEL_CARD.md; ml-service/app/artifacts/model_metadata.json'), ('Dataset provenance and attribution', 'docs/DATA_LICENSE_AND_ATTRIBUTION.md'), ('Shared feature and API schema', 'contracts/v1.json; docs/API_CONTRACT.md; docs/FEATURE_DICTIONARY.md'), ('Actual implementation', 'backend/fusion-api/; ml-service/app/main.py; cgm-publisher/app.py; frontend/dashboard/src/App.tsx'), ('Preview and module commands', 'tools/preview_api.py; tools/check_modules.py; tools/Module.ps1'), ('Service topology and ports', 'compose.yaml; compose.modules.yaml'), ('Historical dashboard image', 'docs/screenshots/dashboard_patient_001_pitch.png'), ('Earlier operational guide', 'deliverables/glucotwin_build_and_handoff_runbook.pdf')], [.39, .61]),
         h('How to keep this handbook current'), p('After assembly, update observed results, artifact/image versions and screenshots. Regenerate the handbook if module interfaces or scope change. A model metric belongs to a particular evaluation record, while a screenshot belongs to a particular running build; keep those contexts separate.'),
         call('Final study exercise', 'Explain the project in 60 seconds without naming a framework. Then trace one feature and one failure through the code. Together those two explanations demonstrate both product understanding and technical understanding.'))


def footer(c, doc):
    c.saveState()
    c.bookmarkPage(f'p{doc.page}')
    if doc.page <= len(PAGES):
        c.addOutlineEntry(f'{doc.page:02d}. {PAGES[doc.page - 1][1]}', f'p{doc.page}', level=0)
    c.setStrokeColor(LINE); c.line(18*mm, 17*mm, A4[0]-18*mm, 17*mm)
    c.setFillColor(MUTED); c.setFont('Helvetica', 8)
    c.drawString(18*mm, 11*mm, 'GLUCOTWIN / ILLUSTRATED PROJECT HANDBOOK')
    c.drawRightString(A4[0]-18*mm, 11*mm, f'{doc.page:02d}')
    if doc.page > 1:
        c.setFont('Helvetica', 7.5)
        c.drawRightString(A4[0]-18*mm, A4[1]-10*mm, 'REFERENCE EDITION | 01 NOV 2026')
    c.restoreState()


def build():
    build_content()
    assert len(PAGES) == 30, len(PAGES)
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    story = []
    for index, (_, title, items) in enumerate(PAGES):
        if index: story.append(PageBreak())
        story.extend(items)
    doc = SimpleDocTemplate(str(OUTPUT), pagesize=A4, leftMargin=18*mm, rightMargin=18*mm, topMargin=18*mm, bottomMargin=23*mm,
                            title='GlucoTwin - Illustrated Project Handbook', author='GlucoTwin project team', subject='Architecture, module study, technology concepts, judging and assembly')
    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    print(OUTPUT)
    print('Planned pages:', len(PAGES))


if __name__ == '__main__':
    build()
