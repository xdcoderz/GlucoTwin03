from pathlib import Path
from datetime import date

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    BaseDocTemplate, Frame, PageBreak, Paragraph, Spacer, Table, TableStyle,
    KeepTogether, Preformatted
)


ROOT = Path(r"D:\3Nov")
OUT = ROOT / "deliverables" / "glucotwin_build_and_handoff_runbook.pdf"

NAVY = colors.HexColor("#12304A")
BLUE = colors.HexColor("#176B87")
TEAL = colors.HexColor("#1E8D88")
PALE = colors.HexColor("#EAF3F5")
INK = colors.HexColor("#1E2933")
MUTED = colors.HexColor("#52616B")
RULE = colors.HexColor("#C9D5DA")
WARN_BG = colors.HexColor("#FFF3D6")
WARN = colors.HexColor("#7A4B00")


def page_number(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(RULE)
    canvas.line(doc.leftMargin, 15 * mm, A4[0] - doc.rightMargin, 15 * mm)
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 8)
    canvas.drawString(doc.leftMargin, 9.8 * mm, "GlucoTwin - Build and Handoff Runbook")
    canvas.drawRightString(A4[0] - doc.rightMargin, 9.8 * mm, f"Page {doc.page}")
    canvas.restoreState()


def make_styles():
    s = getSampleStyleSheet()
    s.add(ParagraphStyle(
        name="CoverTitle", parent=s["Title"], fontName="Helvetica-Bold", fontSize=27,
        leading=32, textColor=NAVY, alignment=TA_LEFT, spaceAfter=8 * mm,
    ))
    s.add(ParagraphStyle(
        name="CoverSub", parent=s["BodyText"], fontName="Helvetica", fontSize=13,
        leading=19, textColor=MUTED, spaceAfter=5 * mm,
    ))
    s.add(ParagraphStyle(
        name="H1x", parent=s["Heading1"], fontName="Helvetica-Bold", fontSize=18,
        leading=23, textColor=NAVY, spaceBefore=4 * mm, spaceAfter=4 * mm,
        keepWithNext=True,
    ))
    s.add(ParagraphStyle(
        name="H2x", parent=s["Heading2"], fontName="Helvetica-Bold", fontSize=12.5,
        leading=16, textColor=BLUE, spaceBefore=4 * mm, spaceAfter=2.5 * mm,
        keepWithNext=True,
    ))
    s.add(ParagraphStyle(
        name="Bodyx", parent=s["BodyText"], fontName="Helvetica", fontSize=9.4,
        leading=13.2, textColor=INK, spaceAfter=2.4 * mm,
    ))
    s.add(ParagraphStyle(
        name="Small", parent=s["BodyText"], fontName="Helvetica", fontSize=8.1,
        leading=10.5, textColor=MUTED, spaceAfter=1.4 * mm,
    ))
    s.add(ParagraphStyle(
        name="TableHeader", parent=s["BodyText"], fontName="Helvetica-Bold", fontSize=8.5,
        leading=10.5, textColor=colors.white, spaceAfter=0,
    ))
    s.add(ParagraphStyle(
        name="Bulletx", parent=s["BodyText"], fontName="Helvetica", fontSize=9.3,
        leading=12.7, textColor=INK, leftIndent=5 * mm, firstLineIndent=-3.5 * mm,
        spaceAfter=1.7 * mm,
    ))
    s.add(ParagraphStyle(
        name="Step", parent=s["BodyText"], fontName="Helvetica", fontSize=9.4,
        leading=13.2, textColor=INK, leftIndent=6 * mm, firstLineIndent=-6 * mm,
        spaceAfter=2.3 * mm,
    ))
    s.add(ParagraphStyle(
        name="CodeBlock", parent=s["Code"], fontName="Courier", fontSize=7.5,
        leading=9.3, textColor=colors.HexColor("#102A43"), backColor=colors.HexColor("#F4F7F8"),
        borderColor=RULE, borderWidth=0.4, borderPadding=5, spaceBefore=1.5 * mm,
        spaceAfter=3 * mm,
    ))
    s.add(ParagraphStyle(
        name="Callout", parent=s["BodyText"], fontName="Helvetica-Bold", fontSize=9.2,
        leading=13, textColor=WARN, backColor=WARN_BG, borderColor=colors.HexColor("#E5C77D"),
        borderWidth=0.5, borderPadding=7, spaceBefore=2 * mm, spaceAfter=3 * mm,
    ))
    return s


S = make_styles()


def p(text, style="Bodyx"):
    return Paragraph(text, S[style])


def bullet(text):
    return p(f"- {text}", "Bulletx")


def step(n, text):
    return p(f"<b>{n}.</b> {text}", "Step")


def code(text):
    return Preformatted(text.strip("\n"), S["CodeBlock"])


def heading(text, level=1):
    return p(text, "H1x" if level == 1 else "H2x")


def info_table(rows, widths=None, header=True):
    prepared = []
    for i, row in enumerate(rows):
        prepared.append([p(str(cell), "TableHeader" if i == 0 and header else "Small") for cell in row])
    table = Table(prepared, colWidths=widths, repeatRows=1 if header else 0, hAlign="LEFT")
    style = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.35, RULE),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]
    if header:
        style += [
            ("BACKGROUND", (0, 0), (-1, 0), NAVY),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
        ]
    table.setStyle(TableStyle(style))
    return table


def section_title(story, title, intro=None):
    story.append(heading(title))
    if intro:
        story.append(p(intro))


def build():
    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = BaseDocTemplate(
        str(OUT), pagesize=A4,
        leftMargin=18 * mm, rightMargin=18 * mm, topMargin=18 * mm, bottomMargin=21 * mm,
        title="GlucoTwin Build and Handoff Runbook",
        author="GlucoTwin project team",
    )
    frame = Frame(doc.leftMargin, doc.bottomMargin, doc.width, doc.height, id="normal")
    doc.addPageTemplates([])
    doc.addPageTemplates([__import__("reportlab.platypus", fromlist=["PageTemplate"]).PageTemplate(id="main", frames=[frame], onPage=page_number)])
    story = []

    # Cover
    story += [Spacer(1, 31 * mm), p("GlucoTwin", "CoverTitle")]
    story += [p("Build, Verification, Offline Recovery, and Presentation Handoff Runbook", "CoverSub")]
    story += [Spacer(1, 7 * mm)]
    cover_box = Table([[p("A self-contained guide to reproduce the working research prototype from a project folder, run the two synthetic patient scenarios, verify the safety behavior, and prepare an offline demo backup.", "Bodyx")]], colWidths=[160 * mm])
    cover_box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), PALE), ("BOX", (0, 0), (-1, -1), 0.7, TEAL),
        ("LEFTPADDING", (0, 0), (-1, -1), 11), ("RIGHTPADDING", (0, 0), (-1, -1), 11),
        ("TOPPADDING", (0, 0), (-1, -1), 10), ("BOTTOMPADDING", (0, 0), (-1, -1), 10),
    ]))
    story += [cover_box, Spacer(1, 13 * mm)]
    story.append(p("Prepared: 30 October 2026", "CoverSub"))
    story.append(p("Project location used during preparation: D:\\3Nov", "CoverSub"))
    story.append(Spacer(1, 25 * mm))
    story.append(p("Safety statement", "H2x"))
    story.append(p("Research prototype only. All public demo patient and CGM inputs are synthetic. The supplied model score is uncalibrated and not clinically validated. Do not use it for diagnosis, dosing, emergencies, or treatment decisions.", "Callout"))
    story.append(PageBreak())

    # Contents
    section_title(story, "How to use this guide", "Follow the sections in order for a first-time setup. The commands are written for Windows PowerShell and assume the project is available as a complete folder. No MQTT broker, physical sensor, cloud account, or external API key is required.")
    story.append(info_table([
        ["Section", "What it gives you"],
        ["1. Scope and architecture", "What GlucoTwin is, what it is not, and how data flows."],
        ["2. Prerequisites and inventory", "What must be installed and which project files matter."],
        ["3. Fresh start", "Exact commands to bring up the local stack."],
        ["4. Demo scenarios", "How to use the lower and higher synthetic score cases."],
        ["5. Verification", "How to prove the normal path, unavailable state, recovery, and duplicate protection."],
        ["6. Offline recovery", "How to save and load Docker images without rebuilding."],
        ["7. Present and hand off", "A concise demo sequence and human-only final checklist."],
        ["8. Troubleshooting", "Common symptoms and safe fixes."],
    ], [46 * mm, 114 * mm]))
    story.append(Spacer(1, 5 * mm))
    story.append(heading("What was completed on 30 October 2026", 2))
    for item in [
        "Built the local React dashboard, Spring Boot fusion API, FastAPI inference service, H2 state store, and deterministic CGM replay publisher.",
        "Removed the need for MQTT and IoT hardware. The publisher replays the bundled synthetic JSON fixtures to Spring Boot over HTTP.",
        "Added two distinct synthetic scenarios and a dashboard scenario selector: DEMO-001 is the lower-score case; DEMO-002 is the clearly higher-score case.",
        "Verified the model service returns an explicit unavailable state when it is stopped, rather than inventing a new or stale score.",
        "Performed a clean, no-cache Docker rebuild in 288.3 seconds and created a portable Docker image archive for offline recovery.",
        "Updated project documentation and the competition pitch deck to reflect HTTP replay, the 60.9% test prevalence, and the verified status.",
    ]:
        story.append(bullet(item))
    story.append(PageBreak())

    # Scope / architecture
    section_title(story, "1. Scope and architecture", "GlucoTwin is a virtual-patient research demonstration. It fuses a static synthetic record with a replayed glucose timeline and scores one defined post-meal event over the next 120 minutes.")
    story.append(heading("Prediction target", 2))
    story.append(p("At a meal-time baseline, an event is defined as either glucose reaching 180 mg/dL or higher, or a rise of 40 mg/dL or more from baseline, at any point in the following 120 minutes. The score shown by the dashboard is an <b>uncalibrated model score</b>, not a clinical probability."))
    story.append(heading("Data flow", 2))
    story.append(code("Synthetic EHR + synthetic CGM fixture\n          |\n          v\nDeterministic replay publisher --HTTP--> Spring Boot fusion API --> H2 state\n                                           |\n                                           +--> FastAPI + fitted model\n                                           |\n                                           +--> React doctor-facing dashboard"))
    story.append(heading("Non-negotiable safety rules", 2))
    for item in [
        "Only synthetic patient inputs belong in the public demonstration.",
        "The browser calls Spring Boot only. It never calls the model service or the replay publisher directly.",
        "If the model cannot load or cannot be reached, the API returns status unavailable. Never replace this with an estimated, cached, or made-up score.",
        "Repeated CGM event IDs are ignored so replaying the same fixture does not double count readings.",
        "This is a data-fusion virtual patient, not a physiological simulation and not a medical device.",
    ]:
        story.append(bullet(item))
    story.append(heading("Included components", 2))
    story.append(info_table([
        ["Component", "Purpose", "How it is reached"],
        ["React dashboard", "Shows profile, glucose history, model result, factors, and safety language.", "http://localhost:3000"],
        ["Spring Boot", "Loads profiles, accepts CGM events, builds features, calls model, exposes dashboard API.", "http://localhost:8080"],
        ["FastAPI ML service", "Loads the fitted scikit-learn pipeline and returns score and factors.", "Internal Compose network"],
        ["H2", "Stores readings and current demo state locally.", "Docker volume only"],
        ["CGM publisher", "One-shot deterministic HTTP replay for both fixtures.", "No host port"],
    ], [35 * mm, 82 * mm, 43 * mm]))
    story.append(PageBreak())

    # prereq inventory
    section_title(story, "2. Prerequisites and project inventory", "A reader starting from scratch needs the complete GlucoTwin project folder and Docker Desktop. The normal first build may download public container base images; the offline method in Section 6 avoids that after a verified archive has been prepared.")
    story.append(heading("Required installations", 2))
    story.append(info_table([
        ["Item", "Why it is needed", "Check"],
        ["Docker Desktop with Compose v2", "Builds and runs all application services.", "docker compose version"],
        ["Git", "Needed only to clone/publish a repository.", "git --version"],
        ["PowerPoint or LibreOffice", "Open the final pitch deck/PDF for presentation.", "Open the application"],
    ], [47 * mm, 79 * mm, 34 * mm]))
    story.append(p("Node, Java, Maven, Python, pip, cloud accounts, database servers, an MQTT broker, and a physical CGM device are <b>not</b> required for the Docker workflow.", "Callout"))
    story.append(heading("Confirm the project folder", 2))
    story.append(p("The folder must contain the files below. Do not copy participant-level research tables into this folder or into a public Git repository."))
    story.append(code("D:\\3Nov\\\n  compose.yaml\n  frontend\\dashboard\\\n  backend\\fusion-api\\\n  ml-service\\app\\artifacts\\logistic_regression.joblib\n  cgm-publisher\\\n  data\\sample\\demo_patient_001.json\n  data\\sample\\demo_patient_002.json\n  docs\\\n  deliverables\\"))
    story.append(heading("Before you start", 2))
    for i, txt in enumerate([
        "Open Docker Desktop and wait until it reports that the Docker engine is running.",
        "Copy the complete project folder to the target machine, preserving its subfolders. If using Git, clone the repository then copy the model artifact only if it is intentionally included and its license allows it.",
        "Open Windows PowerShell. Change into the folder that contains compose.yaml.",
        "Do not store personal health information, real CGM exports, passwords, or API keys in this demo folder.",
    ], 1):
        story.append(step(i, txt))
    story.append(code("Set-Location D:\\3Nov\ndocker compose version\nGet-ChildItem compose.yaml, data\\sample, ml-service\\app\\artifacts"))
    story.append(PageBreak())

    # fresh run
    section_title(story, "3. Start the application from scratch", "Use this sequence on a development or presentation machine. The replay publisher automatically sends the two bundled nine-reading synthetic timelines after Spring Boot becomes healthy.")
    story.append(heading("Standard first start", 2))
    for i, txt in enumerate([
        "Open PowerShell in the project root.",
        "Build and start all services. The first start can take several minutes because Docker builds the Java, Python, and frontend images.",
        "Wait until the dashboard, Spring service, and ML service show healthy. The replay publisher is expected to finish and exit after its one-shot delivery.",
        "Open the dashboard in a browser after the health checks pass.",
    ], 1):
        story.append(step(i, txt))
    story.append(code("Set-Location D:\\3Nov\ndocker compose up --build -d\ndocker compose ps\nStart-Process http://localhost:3000"))
    story.append(heading("Expected service state", 2))
    story.append(info_table([
        ["Service", "Expected state", "Meaning"],
        ["dashboard", "Up (healthy)", "Browser UI is serving."],
        ["spring", "Up (healthy)", "Fusion API and local H2 state are ready."],
        ["ml-service", "Up (healthy)", "Fitted artifact loaded and ready to score."],
        ["cgm-publisher", "Exited (0), or absent from ps after completion", "Expected one-shot replay completed."],
    ], [38 * mm, 43 * mm, 79 * mm]))
    story.append(heading("Useful health checks", 2))
    story.append(code("# Spring readiness\nInvoke-RestMethod http://localhost:8080/actuator/health/readiness\n\n# Enabled demo scenarios\nInvoke-RestMethod http://localhost:8080/api/patients\n\n# Dashboard page responds\nInvoke-WebRequest -UseBasicParsing http://localhost:3000 | Select-Object StatusCode"))
    story.append(heading("Stop without deleting local state", 2))
    story.append(code("docker compose down"))
    story.append(p("For a fully clean project-scoped rebuild, including a fresh H2 volume, use the command below. It removes only this Compose project's containers, network, and named volume. Do not use docker system prune -a on a shared machine unless you intentionally want to remove unused images from other projects."))
    story.append(code("docker compose down -v --remove-orphans\ndocker compose build --no-cache\ndocker compose up -d"))
    story.append(PageBreak())

    # scenarios
    section_title(story, "4. Run the two synthetic demo scenarios", "The dashboard begins with DEMO-001. Both cases use the identical pipeline: synthetic profile plus replayed glucose readings to Spring Boot, 43 constructed model inputs, FastAPI inference, and a dashboard result.")
    story.append(info_table([
        ["Scenario", "Synthetic profile summary", "Verified result"],
        ["DEMO-001", "52F, T2DM 7 years, HbA1c 7.6%; brown rice, vegetables, chicken; glucose 112 to 142 mg/dL.", "Available model score 0.367765...; defined event false."],
        ["DEMO-002", "67M, HbA1c 8.4%, fasting glucose 180; white bread, corn, milk; glucose 120 to 190 mg/dL.", "Available model score 0.988781...; defined event true."],
    ], [27 * mm, 82 * mm, 51 * mm]))
    story.append(p("These results are deterministic for the included model bundle and fixtures. They are research-demo scores, not probabilities or clinical recommendations.", "Callout"))
    story.append(heading("Use the dashboard", 2))
    for i, txt in enumerate([
        "Open http://localhost:3000.",
        "Read the safety banner, target horizon, current glucose, and model status before discussing the score.",
        "Use the scenario selector to choose Patient 001 or Patient 002. You can also open the higher-score case directly at http://localhost:3000/?patient=DEMO-002.",
        "Describe the leading factors as model-supported contributors, not causes and not clinical advice.",
    ], 1):
        story.append(step(i, txt))
    story.append(heading("Verify with the API", 2))
    story.append(code("# Trigger fresh scores through the same Spring API used by the dashboard\nInvoke-RestMethod -Method Post http://localhost:8080/api/patients/DEMO-001/refresh\nInvoke-RestMethod -Method Post http://localhost:8080/api/patients/DEMO-002/refresh\n\n# Read the saved prediction state\nInvoke-RestMethod http://localhost:8080/api/patients/DEMO-001/prediction\nInvoke-RestMethod http://localhost:8080/api/patients/DEMO-002/prediction"))
    story.append(heading("If readings do not appear", 2))
    story.append(p("The publisher may have failed or been stopped before Spring became ready. Restart only the publisher; Spring's ingestion endpoint ignores duplicate event IDs, so this does not add duplicate glucose readings."))
    story.append(code("docker compose run --rm cgm-publisher\ndocker compose logs --tail 100 cgm-publisher spring"))
    story.append(PageBreak())

    # verification
    section_title(story, "5. Verify the safety and demo path", "Run these checks before a presentation. They prove the important behavior: normal scoring, safe model failure, recovery, and replay idempotency.")
    story.append(heading("A. Normal scoring", 2))
    story.append(step(1, "Confirm the three long-running services are healthy."))
    story.append(step(2, "Refresh both scenarios and compare status, score, and predicted_event to the known values."))
    story.append(code("docker compose ps\n$low  = Invoke-RestMethod -Method Post http://localhost:8080/api/patients/DEMO-001/refresh\n$high = Invoke-RestMethod -Method Post http://localhost:8080/api/patients/DEMO-002/refresh\n$low  | Select-Object status, model_score, predicted_event\n$high | Select-Object status, model_score, predicted_event"))
    story.append(heading("B. Model unavailable behavior", 2))
    story.append(step(1, "Stop the ML service only. The dashboard and Spring API remain running."))
    story.append(step(2, "Refresh DEMO-001. Confirm status is unavailable and that model_score and predicted_event are null or absent. A previous score must not be substituted."))
    story.append(step(3, "Restart the ML service. Wait for its health check, then refresh again and confirm the available score returns."))
    story.append(code("docker compose stop ml-service\nInvoke-RestMethod -Method Post http://localhost:8080/api/patients/DEMO-001/refresh\n\ndocker compose start ml-service\nStart-Sleep -Seconds 8\nInvoke-RestMethod -Method Post http://localhost:8080/api/patients/DEMO-001/refresh"))
    story.append(heading("C. Deterministic replay and duplicate protection", 2))
    story.append(step(1, "Get the current count of readings through the patient CGM endpoint."))
    story.append(step(2, "Run the one-shot publisher again. It sends the same stable event IDs."))
    story.append(step(3, "Get the count again. It should not increase because Spring deduplicates repeated event IDs."))
    story.append(code("$before = (Invoke-RestMethod http://localhost:8080/api/patients/DEMO-001/cgm).Count\ndocker compose run --rm cgm-publisher\n$after  = (Invoke-RestMethod http://localhost:8080/api/patients/DEMO-001/cgm).Count\n\"Before: $before  After: $after\""))
    story.append(heading("Verified preparation evidence", 2))
    story.append(info_table([
        ["Check", "Observed during preparation"],
        ["No-cache clean rebuild", "Passed in 288.3 seconds."],
        ["DEMO-001", "available, 0.3677653238267805, predicted_event false."],
        ["DEMO-002", "available, 0.9887812722077698, predicted_event true."],
        ["Model outage", "available changed to unavailable with no score."],
        ["Model recovery", "Available lower-score result returned after ML restart."],
    ], [57 * mm, 103 * mm]))
    story.append(PageBreak())

    # Offline
    section_title(story, "6. Prepare and use the offline Docker backup", "The offline archive lets a presentation machine load the four built images without rebuilding them. Docker Desktop must still be installed and running on that machine.")
    story.append(heading("Known-good archive", 2))
    story.append(p("The preparation archive is located at D:\\3Nov\\deliverables\\glucotwin-images.tar. It contains dashboard, Spring, FastAPI ML, and CGM publisher images. The file is intentionally ignored by Git because it is large."))
    story.append(info_table([
        ["Property", "Verified value"],
        ["Size", "357,423,104 bytes (about 357 MB)"],
        ["SHA-256", "4BD62A1452CC9F5668DDE1370C47FB3C8FD52AAF186EBE2BDED192135D5A7E56"],
        ["Purpose", "Offline loading of the four local Compose images."],
    ], [42 * mm, 118 * mm]))
    story.append(heading("Create a new archive after changing images", 2))
    story.append(code("Set-Location D:\\3Nov\ndocker compose build\ndocker image save -o .\\deliverables\\glucotwin-images.tar `\n  glucotwin-dashboard:latest `\n  glucotwin-spring:latest `\n  glucotwin-ml-service:latest `\n  glucotwin-cgm-publisher:latest\nGet-FileHash .\\deliverables\\glucotwin-images.tar -Algorithm SHA256"))
    story.append(heading("Load and start on an offline presentation machine", 2))
    for i, txt in enumerate([
        "Copy the complete project folder and the image archive to the presentation machine. The project folder must include compose.yaml and the configuration it references.",
        "Start Docker Desktop before loading the archive.",
        "Open PowerShell in the project folder. Load the archive, then start Compose without --build.",
        "Run the verification checks in Section 5. Do not present until dashboard, Spring, and ML service are healthy.",
    ], 1):
        story.append(step(i, txt))
    story.append(code("Set-Location D:\\3Nov\nGet-FileHash .\\deliverables\\glucotwin-images.tar -Algorithm SHA256\ndocker image load -i .\\deliverables\\glucotwin-images.tar\ndocker compose up -d\ndocker compose ps"))
    story.append(p("The archive avoids image rebuilding, but it does not replace Docker Desktop. If the machine has never obtained the base images and you use --build, it will need network access. For the offline path, load the archive and use docker compose up -d without --build.", "Callout"))
    story.append(PageBreak())

    # Present and handoff
    section_title(story, "7. Present and hand off", "Keep the presentation focused on the working fusion loop and the safety boundaries, rather than claiming clinical capability.")
    story.append(heading("Five-minute demonstration sequence", 2))
    story.append(info_table([
        ["Time", "Say and show"],
        ["0:00-0:30", "Problem: a static health record and changing glucose data are difficult to view together."],
        ["0:30-1:00", "Target: an event is >=180 mg/dL or a >=40 mg/dL rise within 120 minutes."],
        ["1:00-2:30", "Show DEMO-001: profile, readings, 0.368 model score, horizon, factors, and safety banner."],
        ["2:30-3:15", "Switch to DEMO-002: same pipeline, distinct synthetic data, 0.989 model score."],
        ["3:15-3:45", "Show failure-safe behavior: unavailable when ML is stopped, never a made-up score."],
        ["3:45-4:30", "Be honest about evidence: AUC 0.757, F1 0.742 versus always-positive 0.757, 78 missed events at threshold 0.50."],
        ["4:30-5:00", "Close: the contribution is an auditable research fusion loop, not clinical superiority."],
    ], [27 * mm, 133 * mm]))
    story.append(heading("Words to use", 2))
    for item in [
        "Say " + "<i>uncalibrated model score</i>" + ", not " + "<i>risk probability</i>" + ".",
        "Say " + "<i>synthetic demonstration</i>" + ", not " + "<i>patient monitoring system</i>" + ".",
        "Say the top factors are model contributors; do not state that they diagnose a cause.",
        "If asked about next steps: calibration, confidence intervals, external/multi-cohort validation, fairness analysis, real CGM integration, and clinician review.",
    ]:
        story.append(bullet(item))
    story.append(heading("Files ready for handoff", 2))
    story.append(info_table([
        ["Deliverable", "Location"],
        ["Final competition deck", "D:\\3Nov\\deliverables\\glucotwin_competition_pitch_v5_final.pptx"],
        ["This runbook", "D:\\3Nov\\deliverables\\glucotwin_build_and_handoff_runbook.pdf"],
        ["Offline Docker image archive", "D:\\3Nov\\deliverables\\glucotwin-images.tar"],
        ["Dashboard evidence screenshots", "D:\\3Nov\\docs\\screenshots\\"],
    ], [53 * mm, 107 * mm]))
    story.append(heading("Human-only checklist", 2))
    for item in [
        "Copy the image archive, final deck, and screenshots to a USB drive and/or approved cloud storage.",
        "Record a backup video of the working demo and open it before travelling.",
        "Add team member and college names to the final deck if they are required for submission.",
        "Rehearse the five-minute script twice, including the unavailable-state explanation.",
        "On the actual event machine, load the archive, start Compose, and repeat the Section 5 checks.",
        "Create/push the GitHub repository using the owner's account and review what becomes public.",
    ]:
        story.append(bullet(item))
    story.append(PageBreak())

    # Troubleshoot / final
    section_title(story, "8. Troubleshooting and safe maintenance", "Use project-scoped checks first. Keep the safety behavior intact while resolving problems.")
    story.append(info_table([
        ["Symptom", "Likely reason", "Safe response"],
        ["Dashboard is blank", "Spring is not healthy or browser points to wrong port.", "Run docker compose ps; inspect dashboard and spring logs; open http://localhost:3000."],
        ["Score is unavailable", "ML service stopped, unhealthy, or artifact issue.", "Run docker compose logs ml-service spring; do not invent a score; restart ML only after finding the issue."],
        ["No CGM values", "Publisher did not replay or Spring was unavailable during replay.", "Run docker compose run --rm cgm-publisher and inspect publisher/Spring logs."],
        ["Port in use", "Another local app uses 3000 or 8080.", "Stop the conflicting app or change the host mapping in compose.yaml, then update instructions."],
        ["Images rebuild unexpectedly", "Compose cannot find local images or --build was used.", "Load the known archive, then use docker compose up -d without --build."],
        ["Git rejects a large file", "Image archive was accidentally staged.", "Keep glucotwin-images.tar out of Git; .gitignore already covers it."],
    ], [34 * mm, 49 * mm, 77 * mm]))
    story.append(heading("Useful log commands", 2))
    story.append(code("docker compose ps\ndocker compose logs --tail 150 spring\ndocker compose logs --tail 150 ml-service\ndocker compose logs --tail 150 cgm-publisher\ndocker compose logs --tail 150 dashboard"))
    story.append(heading("Final acceptance checklist", 2))
    for item in [
        "Dashboard loads at localhost:3000 and shows the safety banner.",
        "Spring readiness endpoint reports UP.",
        "Both patient scenarios appear and score through the same pipeline.",
        "DEMO-001 is near 0.368 and DEMO-002 is near 0.989 with the included model/fixtures.",
        "Stopping ML produces unavailable with no substitute score; restarting restores availability.",
        "Offline archive hash has been checked and a separate copy is available.",
        "No real patient data, credentials, participant-level research tables, or local database files are staged for public sharing.",
    ]:
        story.append(bullet(item))
    story.append(Spacer(1, 4 * mm))
    story.append(p("End of runbook. Keep the project safety statement with every shared copy of the demo, screenshots, slide deck, and repository.", "Callout"))

    doc.build(story)
    print(OUT)


if __name__ == "__main__":
    build()
