"""Build the concise GlucoTwin judge Q&A handbook using ReportLab."""
from pathlib import Path
from xml.sax.saxutils import escape
import json
import re

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.utils import simpleSplit
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'output/pdf/glucotwin_judge_questions_and_answers.pdf'
QA = [
('What exact problem does GlucoTwin solve, and who is its intended user?',
 'It brings patient background, meal information and recent glucose together to score a defined post-meal event. It is intended for doctor-facing research demonstrations.'),
('Why use GlucoTwin when existing CGM dashboards already show glucose trends?',
 'Our focus is a meal-time event score for the next 120 minutes, alongside contributing factors and saved-result review. We have not established superiority over commercial CGM products.'),
('What makes this a digital twin?',
 'It maintains a virtual representation of one patient\'s context and glucose state. The anatomical body is educational; the MVP does not simulate the patient\'s complete physiology.'),
('Explain the complete workflow.',
 'Select a patient and meal, validate the glucose history, request a score and save the attempt. Then inspect factors, replay fictional follow-up, record a review and export the result.'),
('Which features actually work, and which are simulated?',
 'Actual model inference, input checks, storage, review history and PDF export work. Demo inputs are synthetic, and Future lab glucose curves are scripted examples.'),
('What useful output exists beyond the dashboard visuals?',
 'A saved event score with contributing factors, its original input snapshot and a traceable review record. These support inspecting the research workflow and reproducing what was evaluated.'),
('What does the patient JSON contain?',
 'It contains demographics, recorded health measurements, medications, meal details and glucose history. The feature builder converts relevant fields into model inputs.'),
('Where do glucose readings come from without a physical device?',
 'A publisher reads the synthetic fixtures and sends timestamped readings to Spring over HTTP. This lets us demonstrate ingestion without requiring CGM hardware.'),
('Why HTTP instead of MQTT?',
 'The current source is a deterministic software replay, so HTTP provides the required delivery with fewer components. MQTT could be considered if device integration creates a need for it.'),
('How do replay speed and reading timestamps differ?',
 'The publisher sends samples roughly 1.2 real seconds apart. Their timestamps represent 15-minute intervals, so replay speed is independent of simulated elapsed time.'),
('Why are there nine readings in a two-hour window?',
 'We include both endpoints: -120, -105, -90, -75, -60, -45, -30, -15 and 0 minutes. Eight intervals therefore contain nine readings.'),
('How are patient records kept separate?',
 'Each event includes a patient ID, and backend queries and saved results are associated with that ID. Patient-switch guards prevent late frontend responses from replacing another patient\'s displayed data.'),
('How does training data differ from demonstration data?',
 'The fitted model was trained on ShanghaiT2DM-derived meal windows. The public application uses synthetic patient records and replayed glucose, not participant-level training records.'),
('What is needed before accepting real patient data?',
 'We need verified data permissions, privacy controls, authentication, compatible input schemas and suitable validation. The existing research-input path validates local records; it is not an operational clinical integration.'),
('What happens when readings are missing or invalid?',
 'Ingestion rejects invalid values, while readiness checks identify missing or conflicting required timestamps. Scoring is gated when the required pre-meal history is incomplete.'),
('How do you handle duplicate events?',
 'An identical event with the same ID does not create another reading. Reusing that ID with a different payload returns a conflict and preserves the original.'),
('How do you handle units and timezones?',
 'The input contract uses mg/dL, and the workspace labels meal and observation times in UTC. Automatic mixed-unit ingestion is not implemented; incoming values must follow the contract.'),
('What is the meal-time baseline?',
 'It is the glucose value at the configured meal timestamp. A saved attempt freezes its baseline and inputs, so later observations do not rewrite that original prediction context.'),
('Why separate Spring Boot and FastAPI?',
 'Spring handles application state, validation and workflow coordination; FastAPI runs the Python model. This separates application responsibilities from inference dependencies.'),
('Why doesn\'t the browser call the model directly?',
 'Spring provides one controlled application interface and prepares the model inputs. It also owns saved attempts and failure handling, keeping the browser independent of inference-service details.'),
('How are the 43 model features created?',
 'The feature builder derives glucose lags, changes and summary statistics, then combines them with meal, medication and patient fields. The resulting inputs follow a fixed contract.'),
('How do you ensure training and inference inputs match?',
 'Startup checks verify the artifact\'s feature names, order, count and preprocessing pipeline. Contract checks also compare the service\'s feature list with the project\'s frozen schema.'),
('How do you prevent future-data leakage?',
 'Prediction inputs use the fixed meal baseline and preceding two-hour history. Post-meal readings are stored for follow-up and excluded from that original feature window.'),
('Why logistic regression?',
 'The supplied fitted model is compact, reproducible and supports straightforward contribution calculations. We compared its reported performance with simple baselines; we do not claim an exhaustive model-selection study.'),
('Does the model learn whenever new readings arrive?',
 'No. Incoming readings update application state, while inference uses a fixed fitted artifact. Retraining would require a separate, versioned training and evaluation process.'),
('What exactly is the prediction target?',
 'An event occurs if glucose reaches at least 180 mg/dL or rises at least 40 mg/dL above the meal baseline within the following 120 minutes. Either condition makes the composite event positive.'),
('Is this a rolling prediction?',
 'The current MVP scores a window anchored to the meal timestamp. It does not continuously move the horizon forward with each new sample.'),
('What if glucose is already above 180 at baseline?',
 'The dashboard explicitly identifies an already-high baseline. The score still concerns the defined post-meal window and must not be described as predicting a newly developing spike.'),
('Does 0.368 mean a 36.8% clinical probability?',
 'We cannot make that claim because the model has not been calibrated as an individual clinical probability. We present it as an uncalibrated score on a zero-to-one scale.'),
('What does ROC AUC of approximately 0.757 establish?',
 'It indicates useful ranking discrimination on the held-out test set. It does not establish calibration, clinical benefit or performance in a different population.'),
('Why investigate a model whose F1 loses to always-positive prediction?',
 'Its ranking and balanced accuracy show information beyond that simple baseline. However, the F1 limitation remains significant and requires further evaluation rather than a claim of overall superiority.'),
('What do the 78 missed events mean?',
 'At threshold 0.50, the model missed 78 of the 300 positive test meals. This limits its usefulness and prevents treating a below-threshold score as a safety clearance.'),
('Why split by patient rather than meal?',
 'Meals from the same person share characteristics. Keeping each patient in one split reduces leakage that could make performance appear better than it generalizes to unseen patients.'),
('Why use a threshold of 0.50?',
 'It is the fixed research threshold used in the reported evaluation. It has not been established as a clinically appropriate operating point; changing it would alter false-positive and false-negative rates.'),
('How are contributing factors calculated?',
 'The logistic model combines transformed feature values with fitted coefficients to calculate contributions. These describe the model\'s computation, not proven biological causes.'),
('What do the factor bars represent?',
 'They compare absolute magnitudes of the returned contributions within that result, with direction labelled separately. They are not percentages, confidence intervals or SHAP values.'),
('How do you verify the loaded model?',
 'The service checks its SHA-256 against metadata, the scikit-learn version, feature schema and required pipeline steps. These establish consistency with the expected artifact, not clinical validity.'),
('What happens when ML becomes unavailable?',
 'The API saves an unavailable attempt with a null score and classification. The dashboard and PDF withhold the score and factors rather than substitute an estimate.'),
('How do you distinguish current inputs from an older result?',
 'Saved attempts retain their input fingerprint and timestamp. When current inputs differ, the interface identifies that difference and allows a new versioned attempt.'),
('What is saved with a scoring attempt?',
 'The result includes its ID, meal baseline, computation time, input snapshot and hash, model output and version. This provides a record of what that particular attempt evaluated.'),
('Why separate predictions from follow-up observations?',
 'A prediction must retain the information available when it was issued. Later observations provide review evidence and should not retroactively change the saved inputs or score.'),
('Do eight follow-up readings prove no event occurred continuously?',
 'No. They complete our expected 15-minute sampling schedule, but events could occur between readings. The interface describes a sampled outcome, not continuous coverage.'),
('Why can a positive outcome be established with incomplete follow-up?',
 'One valid sample meeting the event rule establishes that an event was observed. Samples that remain below the rule cannot rule out events during missing periods.'),
('When is prediction-outcome comparison withheld?',
 'Comparison is withheld for unavailable predictions, unknown outcomes, changed inputs or retrospective receipt timing. This prevents presenting an unsuitable comparison as prospective agreement.'),
('How are review actions recorded?',
 'Review and reopen actions append timestamped notes instead of overwriting earlier entries. Reviewer identity is not authenticated in the current local demonstration.'),
('What changes in the body when glucose changes?',
 'A separate graphic overlay changes display color and brightness, with optional particle motion. Organ geometry and natural tissue colors remain fixed because organ function is not measured.'),
('How anatomically accurate is the body?',
 'Colors are informed by anatomical references, but procedural shapes and positions remain approximate. Pancreas inspection fades surrounding anatomy; the viewer is not a patient scan or validated atlas.'),
('How are fictional Future lab scenarios isolated?',
 'They run as labelled frontend storyboards and do not replace fitted-model outputs. Their invented future values are excluded from Phase 1 saved inference records and research exports.'),
('How did you verify persistence and PDF consistency?',
 'We recreated Spring in an isolated assembled stack and compared complete journals before and after. Exported PDFs matched their selected records\' IDs, hashes, scores, factors and timestamps.'),
('What did the acceptance checks prove, and what remains?',
 'They demonstrated the core software workflow on this machine, including real inference, outage recovery, persistence and exports. Real-patient use still requires appropriate data controls, calibration, external evaluation and clinical validation.'),
]

GROUPS = [
    ('Project purpose & scope', 1, 7),
    ('Data, replay & governance', 8, 14),
    ('Validation & architecture', 15, 22),
    ('Features & prediction target', 23, 29),
    ('Evaluation & explanations', 30, 37),
    ('Failure handling & saved results', 38, 44),
    ('Reviews, visuals & verification', 45, 50),
]

pdfmetrics.registerFont(TTFont('QA', 'C:/Windows/Fonts/arial.ttf'))
pdfmetrics.registerFont(TTFont('QA-Bold', 'C:/Windows/Fonts/arialbd.ttf'))
pdfmetrics.registerFontFamily('QA', normal='QA', bold='QA-Bold', italic='QA', boldItalic='QA-Bold')
INK = colors.HexColor('#173d47')
TEAL = colors.HexColor('#126b65')
MUTED = colors.HexColor('#526970')
LINE = colors.HexColor('#d7e3e2')
W, H = 595.276, 841.89
LEFT, RIGHT = 46, 46
WIDTH = W - LEFT - RIGHT
styles = {
    'q': ParagraphStyle('Question', fontName='QA-Bold', fontSize=11.1, leading=14.1, textColor=INK, spaceAfter=5),
    'a': ParagraphStyle('Answer', fontName='QA', fontSize=10.25, leading=14.5, textColor=MUTED),
    'n': ParagraphStyle('Number', fontName='QA-Bold', fontSize=12, leading=15, textColor=TEAL),
    'label': ParagraphStyle('Label', fontName='QA-Bold', fontSize=9, leading=12, textColor=TEAL, spaceAfter=8),
    'topic': ParagraphStyle('Topic', fontName='QA-Bold', fontSize=24, leading=28, textColor=INK, spaceAfter=8),
    'deck': ParagraphStyle('Deck', fontName='QA', fontSize=11, leading=16, textColor=MUTED),
}


def paragraph(text, style):
    return Paragraph(escape(text), style)


def page_furniture(canvas, doc):
    canvas.saveState()
    canvas.setFillColor(TEAL)
    canvas.rect(0, H-7, W, 7, fill=1, stroke=0)
    canvas.setFont('QA-Bold', 9)
    canvas.setFillColor(INK)
    canvas.drawString(LEFT, H-34, 'GlucoTwin')
    canvas.setFont('QA', 8)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(W-RIGHT, H-34, 'JUDGE Q&A  /  RESEARCH MVP')
    canvas.setStrokeColor(LINE)
    canvas.setLineWidth(.5)
    canvas.line(LEFT, 45, W-RIGHT, 45)
    canvas.setFont('QA', 7.2)
    canvas.drawString(LEFT, 30, 'Synthetic demo | Uncalibrated score | Not clinically validated')
    canvas.drawRightString(W-RIGHT, 30, f'{doc.page} / 8')
    canvas.restoreState()


def question_block(number, question, answer):
    # Every answer must fit within the requested three rendered lines.
    p = paragraph(answer, styles['a'])
    _, height = p.wrap(WIDTH-38, 1000)
    assert height <= 3 * styles['a'].leading + .1, (number, height)
    row = Table([[paragraph(f'{number:02d}', styles['n']),
                  [paragraph(question, styles['q']), p]]], colWidths=[31, WIDTH-31])
    row.setStyle(TableStyle([
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('LEFTPADDING',(0,0),(-1,-1),0),
        ('RIGHTPADDING',(0,0),(-1,-1),7),
        ('TOPPADDING',(0,0),(-1,-1),0),
        ('BOTTOMPADDING',(0,0),(-1,-1),10),
    ]))
    return KeepTogether([row, HRFlowable(width='100%', thickness=.35, color=LINE), Spacer(1,12)])


def build():
    assert len(QA) == 50
    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = SimpleDocTemplate(str(OUT), pagesize=(W,H), rightMargin=RIGHT, leftMargin=LEFT,
                            topMargin=62, bottomMargin=60,
                            title='GlucoTwin - 50 Judge Questions & Answers',
                            author='GlucoTwin Project', subject='Concise viva and competition preparation')
    story = [Spacer(1,22), paragraph('COMPETITION PREPARATION', styles['label'])]
    title = ParagraphStyle('CoverTitle', parent=styles['topic'], fontSize=38, leading=44, spaceAfter=16)
    story += [Paragraph('GlucoTwin<br/>Judge questions<br/>&amp; answers', title),
              paragraph('50 concise answers about the working MVP, its features, evidence and limits.', styles['deck']),
              Spacer(1,18)]
    scope = Table([[Paragraph('<b>The core MVP</b><br/>Patient + meal + recent glucose history → a saved 120-minute event score → follow-up review.'.replace('→','&gt;'), styles['deck'])]], colWidths=[WIDTH])
    scope.setStyle(TableStyle([('BACKGROUND',(0,0),(-1,-1),colors.HexColor('#edf4f1')),
                               ('BOX',(0,0),(-1,-1),.5,LINE),('LEFTPADDING',(0,0),(-1,-1),16),
                               ('RIGHTPADDING',(0,0),(-1,-1),16),('TOPPADDING',(0,0),(-1,-1),14),('BOTTOMPADDING',(0,0),(-1,-1),14)]))
    story += [scope, Spacer(1,25), paragraph('QUICK NAVIGATION', styles['label'])]
    contents = []
    for index,(name,start,end) in enumerate(GROUPS,2):
        contents.append([paragraph(name,styles['deck']),paragraph(f'Q{start:02d}-{end:02d}',styles['deck']),paragraph(str(index),styles['deck'])])
    table = Table(contents,colWidths=[WIDTH-115,75,40])
    table.setStyle(TableStyle([('LEFTPADDING',(0,0),(-1,-1),0),('RIGHTPADDING',(0,0),(-1,-1),0),
                               ('TOPPADDING',(0,0),(-1,-1),6),('BOTTOMPADDING',(0,0),(-1,-1),6),
                               ('LINEBELOW',(0,0),(-1,-1),.35,LINE)]))
    story += [table, Spacer(1,19), paragraph('How to use this guide',styles['q']),
              paragraph('Practise each answer aloud, then use the application to demonstrate it. Keep working inference, synthetic observations and fictional Future lab scenarios clearly distinguished.',styles['deck']),
              Spacer(1,10),paragraph('Prepared 2 November 2026. Answers reflect the current research prototype; update them when implementation or evidence changes.',styles['a'])]
    for index,(name,start,end) in enumerate(GROUPS,1):
        story += [PageBreak(), paragraph(f'{index:02d} / QUESTIONS {start:02d}-{end:02d}',styles['label']),
                  paragraph(name,styles['topic']),Spacer(1,14)]
        for number in range(start,end+1):
            story.append(question_block(number,*QA[number-1]))
    doc.build(story,onFirstPage=page_furniture,onLaterPages=page_furniture)
    reader = PdfReader(OUT)
    assert len(reader.pages) == 8, f'Unexpected pagination: {len(reader.pages)}'
    for page,(name,start,end) in zip(reader.pages[1:],GROUPS):
        text = re.sub(r'\s+',' ',page.extract_text())
        for number in range(start,end+1):
            assert QA[number-1][0] in text, (number,'Question missing or split unexpectedly')
    source = ROOT / 'docs/research/judge_qa_source.json'
    source.write_text(json.dumps([{'number':i,'question':q,'answer':a} for i,(q,a) in enumerate(QA,1)],indent=2),encoding='utf-8')
    print(f'Created {OUT}: {len(reader.pages)} pages, 50 questions; all answers <=3 lines.')


if __name__ == '__main__':
    build()
