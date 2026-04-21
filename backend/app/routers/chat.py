import json, re
import httpx
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field
from app.models.database import get_db, ChatMessage, Report, User
from app.services.auth import get_current_user
from app.config import settings

try:
    from openai import OpenAI
    _openai_ok = True
except ImportError:
    _openai_ok = False

router = APIRouter(prefix="/chat", tags=["Chat"])

class AskRequest(BaseModel):
    question: str = Field(..., min_length=1, max_length=1000)

CHAT_SYSTEM = """You are MediClear AI, a friendly medical assistant.

Your role:
1. Help the patient understand their own lab reports — use the PATIENT REPORT CONTEXT below when the question refers to their values.
2. Answer general medical and health questions in plain, friendly language.
3. Never diagnose — always recommend consulting a doctor for treatment decisions.

Rules:
- Keep answers under ~150 words unless the user asks for more detail.
- Use simple analogies when explaining medical concepts.
- Never invent specific lab values that aren't in the context.
- For symptoms that sound like an emergency (chest pain, severe bleeding, stroke signs), tell them to seek urgent care immediately.
"""

def _build_context(reports) -> str:
    if not reports:
        return "No reports uploaded yet."
    lines = []
    for r in reports[:10]:
        try:
            values = json.loads(r.lab_values or "{}")
        except Exception:
            values = {}
        vals = ", ".join(
            f"{k}={v.get('val')}{v.get('unit','')} ({v.get('status')})"
            for k, v in values.items()
        )
        lines.append(
            f"- {r.report_type} on {r.uploaded_at.date()}\n"
            f"  Values: {vals or 'none'}\n"
            f"  Summary: {r.ai_summary or ''}"
        )
    return "\n".join(lines)

# ── Smart rule-based chat ───────────────────────────────────────
# Aliases a user might type → the canonical display name stored in lab_values
TEST_ALIASES = {
    "Hemoglobin":           ["hemoglobin", "haemoglobin", "hgb", "hb"],
    "WBC":                  ["wbc", "white blood cell", "leukocyte", "leucocyte"],
    "RBC":                  ["rbc", "red blood cell"],
    "Platelets":            ["platelets", "platelet", "plt"],
    "Hematocrit":           ["hematocrit", "haematocrit", "hct", "pcv"],
    "MCV":                  ["mcv"],
    "Total Cholesterol":    ["total cholesterol", "cholesterol"],
    "LDL":                  ["ldl"],
    "HDL":                  ["hdl"],
    "Triglycerides":        ["triglycerides", "triglyceride"],
    "Fasting Glucose":      ["fasting glucose", "fasting sugar", "fbs", "blood sugar", "glucose"],
    "HbA1c":                ["hba1c", "a1c", "glycated hemoglobin", "glycated haemoglobin"],
    "TSH":                  ["tsh", "thyroid stimulating"],
    "Free T4":              ["free t4", "ft4"],
    "Free T3":              ["free t3", "ft3"],
    "ALT (SGPT)":           ["alt", "sgpt"],
    "AST (SGOT)":           ["ast", "sgot"],
    "Alkaline Phosphatase": ["alkaline phosphatase", "alp"],
    "Total Bilirubin":      ["bilirubin"],
    "Albumin":              ["albumin"],
}

TEST_EXPLANATIONS = {
    "Hemoglobin":           "Hemoglobin carries oxygen in your red blood cells. Low hemoglobin causes fatigue, weakness, and paleness — the most common cause is iron deficiency.",
    "WBC":                  "WBC (white blood cells) is your immune system's army. High WBC often means infection; very low WBC means weakened immunity.",
    "RBC":                  "RBC (red blood cell count) is the trucks that deliver oxygen. Low RBC usually means anemia.",
    "Platelets":            "Platelets help your blood clot. Low platelets can cause easy bruising and bleeding; very high can raise clot risk.",
    "Hematocrit":           "Hematocrit is the percentage of blood volume made of red cells. Low hematocrit goes with anemia.",
    "MCV":                  "MCV is the average size of your red blood cells. Low MCV points to iron-deficiency anemia; high points to B12/folate deficiency.",
    "Total Cholesterol":    "Total cholesterol sums all the cholesterol in your blood. High levels raise heart disease risk.",
    "LDL":                  "LDL is the 'bad' cholesterol — it builds up in arteries and raises cardiovascular risk when high.",
    "HDL":                  "HDL is the 'good' cholesterol — higher is better; it helps remove cholesterol from arteries.",
    "Triglycerides":        "Triglycerides are fats in your blood. High levels raise heart disease and pancreatitis risk.",
    "Fasting Glucose":      "Fasting glucose is your blood sugar after not eating for 8 hours. 70–100 mg/dL is normal; 100–125 is pre-diabetic; 126+ on two occasions is diabetic.",
    "HbA1c":                "HbA1c reflects your average blood sugar over the last 3 months. <5.7% is normal, 5.7–6.4% is pre-diabetic, ≥6.5% is diabetic.",
    "TSH":                  "TSH tells your thyroid how hard to work. High TSH = underactive thyroid (hypothyroid); low TSH = overactive (hyperthyroid).",
    "Free T4":              "Free T4 is the thyroid's main hormone. Low means hypothyroid; high means hyperthyroid.",
    "Free T3":              "Free T3 is the most active form of thyroid hormone.",
    "ALT (SGPT)":           "ALT (SGPT) is a liver enzyme. Elevated ALT usually indicates liver stress or damage.",
    "AST (SGOT)":           "AST (SGOT) is an enzyme in liver and muscle. Elevated AST usually indicates liver stress.",
    "Alkaline Phosphatase": "Alkaline phosphatase is a liver and bone enzyme. Elevated levels can indicate liver or bone issues.",
    "Total Bilirubin":      "Bilirubin is a byproduct of red cell breakdown. High levels can cause jaundice (yellowing).",
    "Albumin":              "Albumin is the main protein in blood. Low albumin can indicate liver or kidney issues or poor nutrition.",
}

def _loads(s):
    try: return json.loads(s or "{}")
    except Exception: return {}

def _find_tests(q_low: str) -> list:
    hits = []
    for display, aliases in TEST_ALIASES.items():
        for a in sorted(aliases, key=len, reverse=True):
            if re.search(rf"\b{re.escape(a)}\b", q_low):
                hits.append(display)
                break
    return hits

def _history(reports, display: str) -> list:
    """Oldest → newest points for a given test."""
    out = []
    for r in reversed(reports):
        values = _loads(r.lab_values)
        if display in values:
            out.append((values[display], r))
    return out

def _latest_abnormal(reports):
    if not reports: return []
    values = _loads(reports[0].lab_values)
    return [(k, v) for k, v in values.items() if v.get("status") != "normal"]

def _explain_test(reports, display: str) -> str:
    hist = _history(reports, display)
    if not hist:
        return f"I don't see {display} in any of your reports yet."
    latest_v, _ = hist[-1]
    val = latest_v.get("val"); unit = latest_v.get("unit", "")
    status = latest_v.get("status", "normal")
    mn = latest_v.get("min"); mx = latest_v.get("max")
    expl = TEST_EXPLANATIONS.get(display, "")
    line = f"**{display}** — your latest value is {val}{unit} ({status}). Normal range: {mn}–{mx}{unit}.\n{expl}"
    if len(hist) >= 2:
        first_v = hist[0][0].get("val")
        try:
            delta = round(float(val) - float(first_v), 2)
        except (TypeError, ValueError):
            delta = None
        if delta is not None and abs(delta) > 0.001:
            direction = "increased" if delta > 0 else "decreased"
            line += f"\nAcross {len(hist)} reports, it has {direction} by {abs(delta)}{unit} (from {first_v}{unit})."
        else:
            line += f"\nIt has been stable across {len(hist)} reports."
    return line

# ── General medical knowledge base (used when no LLM API is available) ──
# Each entry: (list of keyword phrases, answer text). First match wins.
MEDICAL_KB = [
    (["diabetes", "diabetic", "type 2 diabetes", "type 1 diabetes"],
     "Diabetes is a condition where your body can't properly control blood sugar. In Type 2 (the most common), your cells stop responding well to insulin. Think of insulin as a key that unlocks your cells so sugar can enter — when the lock gets sticky, sugar builds up in the blood.\n\nDiagnosis markers: fasting glucose ≥126 mg/dL or HbA1c ≥6.5%.\n\nManagement: diet (low refined carbs), 30 min exercise most days, weight loss if needed, and medications your doctor prescribes. Uncontrolled diabetes damages kidneys, eyes, nerves, and heart — controlling it early is very effective."),
    (["prediabetes", "pre-diabetes", "pre diabetic", "prediabetic"],
     "Prediabetes means your blood sugar is higher than normal but not yet diabetic — fasting glucose 100–125 mg/dL or HbA1c 5.7–6.4%. It's a warning sign, but also an opportunity: lifestyle changes can reverse it in many people.\n\nSteps that work: lose 5–7% body weight if overweight, 150 minutes of moderate activity per week, cut added sugars and refined carbs, eat more fiber and protein, and sleep 7–8 hours. Retest HbA1c in 3 months to track progress."),
    (["hypertension", "high blood pressure", "bp high"],
     "Hypertension (high blood pressure) is when the force of blood against your artery walls is consistently too high. Normal is under 120/80 mmHg; hypertension is ≥130/80.\n\nIt's called a silent condition because there are usually no symptoms, but untreated high BP raises risk of heart attack, stroke, and kidney disease. Reduce salt, manage stress, exercise 30 min/day, limit alcohol, and take any medications your doctor prescribes. Home BP monitoring helps you and your doctor track progress."),
    (["cholesterol", "high cholesterol", "bad cholesterol"],
     "Cholesterol is a fatty substance your body needs, but too much of the wrong type clogs arteries. LDL ('bad') cholesterol builds up in artery walls; HDL ('good') cholesterol clears it away.\n\nTargets: LDL <100 mg/dL, HDL ≥40, triglycerides <150, total <200.\n\nLowering LDL: reduce saturated fat (red meat, butter, full-fat dairy), eat more soluble fiber (oats, beans, apples), exercise 30 min/day, lose excess weight, and statin medications if your doctor recommends."),
    (["anemia", "iron deficiency", "low hemoglobin", "low haemoglobin"],
     "Anemia means your blood doesn't carry enough oxygen, usually because hemoglobin or red blood cells are low. The most common cause is iron deficiency, especially in women.\n\nSymptoms: fatigue, weakness, pale skin, cold hands/feet, shortness of breath on stairs.\n\nTreatment depends on cause. For iron deficiency: eat iron-rich foods (red meat, spinach, lentils, fortified cereals), take iron supplements as directed, pair with Vitamin C for better absorption, and avoid tea/coffee with meals. Get iron studies to confirm and track recovery."),
    (["hypothyroid", "hypothyroidism", "underactive thyroid"],
     "Hypothyroidism is when your thyroid gland doesn't produce enough hormones, slowing everything down. It shows up as high TSH (>4.0) and often low Free T4.\n\nSymptoms: fatigue, weight gain, cold sensitivity, dry skin, hair loss, constipation, low mood.\n\nTreatment is usually levothyroxine (synthetic thyroid hormone), taken daily on an empty stomach. Most people feel much better within weeks. Re-check TSH every 6–8 weeks after starting or adjusting the dose."),
    (["hyperthyroid", "hyperthyroidism", "overactive thyroid"],
     "Hyperthyroidism is when your thyroid makes too much hormone, speeding things up. TSH is suppressed (very low) and Free T4/T3 are high.\n\nSymptoms: rapid heartbeat, weight loss, tremor, heat intolerance, anxiety, sweating, bulging eyes.\n\nCauses include Graves' disease and thyroid nodules. Treatment options: anti-thyroid drugs (methimazole), radioactive iodine, or surgery. See an endocrinologist for a specialist evaluation."),
    (["fatty liver", "nafld", "alcoholic liver", "liver disease"],
     "Fatty liver disease is when fat builds up in liver cells. The non-alcoholic form (NAFLD) is linked to obesity, diabetes, and high cholesterol. The alcoholic form comes from heavy drinking.\n\nOften silent, but liver enzymes (ALT, AST) may be elevated. An ultrasound can confirm.\n\nReverse it by: losing 7–10% body weight (the single most effective step), avoiding alcohol, cutting sugar and refined carbs, eating more vegetables and omega-3s, and exercising regularly. Untreated fatty liver can progress to fibrosis and cirrhosis over years."),
    (["kidney", "renal", "creatinine", "kidney disease", "kidney function"],
     "Kidneys filter waste and balance fluids in your body. Kidney function is tracked by creatinine, eGFR, and urine tests. eGFR >90 is normal; <60 for 3+ months indicates chronic kidney disease.\n\nMain causes of kidney damage: diabetes and high blood pressure. Protect your kidneys by controlling blood sugar and BP, drinking enough water, avoiding excess NSAIDs (ibuprofen) and supplements, limiting salt, and getting regular blood/urine tests if you're at risk."),
    (["heart disease", "cardiovascular", "heart attack", "coronary"],
     "Heart disease is the leading cause of death globally, usually caused by plaque buildup in arteries (atherosclerosis). Risk factors: high LDL, high BP, diabetes, smoking, obesity, family history, and inactivity.\n\nReduce risk by: keeping LDL <100, BP <130/80, HbA1c <5.7, not smoking, exercising 30 min/day, eating Mediterranean-style (vegetables, olive oil, fish, nuts), managing stress, and sleeping well.\n\n**Warning signs needing urgent care**: chest pain or pressure, pain radiating to arm/jaw, shortness of breath, sudden cold sweat, or fainting. Call emergency services immediately."),
    (["bmi", "body mass index", "overweight", "obesity"],
     "BMI (Body Mass Index) is weight in kg ÷ height in meters squared. For most adults: <18.5 underweight, 18.5–24.9 healthy, 25–29.9 overweight, ≥30 obese (South Asian cutoffs are a bit lower — 23 and 25).\n\nBMI isn't perfect — it doesn't distinguish muscle from fat — but it's a useful quick screen. Waist circumference matters too (men <90 cm, women <80 cm). Losing 5–10% body weight significantly improves blood pressure, sugar, cholesterol, and joint pain."),
    (["vitamin d", "vitamin-d", "vit d"],
     "Vitamin D helps your body absorb calcium for strong bones and supports immunity. Normal blood level is 30–100 ng/mL; deficiency is <20.\n\nMany people are low, especially those who don't get much sun, wear full-coverage clothing, or have darker skin. Symptoms of deficiency include fatigue, bone/muscle pain, and frequent illnesses.\n\nSources: 15–20 min of midday sun (arms/legs), fatty fish (salmon, sardines), egg yolks, fortified milk. Most adults with low levels benefit from a daily supplement (typically 1000–2000 IU) — confirm dose with your doctor."),
    (["vitamin b12", "b12", "b-12"],
     "Vitamin B12 is needed for nerve function and making red blood cells. Deficiency is common in vegetarians/vegans and older adults.\n\nSymptoms: fatigue, tingling in hands/feet, memory problems, pale skin, mouth ulcers. Severe deficiency causes anemia with large red blood cells (high MCV).\n\nSources: meat, fish, eggs, dairy. Vegetarians should consider fortified foods or a daily supplement. Normal blood level is >300 pg/mL; <200 is clearly deficient."),
    (["blood pressure", "bp normal", "what is normal bp"],
     "Normal blood pressure: under 120/80 mmHg.\n• Elevated: 120–129 systolic / <80 diastolic\n• Stage 1 hypertension: 130–139 / 80–89\n• Stage 2: ≥140 / ≥90\n• Hypertensive emergency: >180 / >120 — seek care immediately\n\nMeasure at rest, feet flat on floor, arm supported at heart level. Take 2–3 readings a minute apart and average them. Home BP is often more accurate than clinic readings."),
    (["normal blood sugar", "normal glucose", "sugar range"],
     "Normal blood sugar targets:\n• Fasting (8+ hrs): 70–99 mg/dL\n• 2 hrs after a meal: <140 mg/dL\n• HbA1c: <5.7%\n\nPrediabetic: fasting 100–125 or HbA1c 5.7–6.4%.\nDiabetic: fasting ≥126 (confirmed twice) or HbA1c ≥6.5%.\n\nIf you're already diabetic, typical targets are fasting <130, post-meal <180, HbA1c <7% — but your doctor sets personalized goals."),
    (["exercise", "workout", "physical activity"],
     "General activity targets for adults:\n• 150 minutes/week of moderate cardio (brisk walk, cycling) OR 75 min of vigorous (running, swimming laps)\n• Strength training 2+ days/week (all major muscle groups)\n• Reduce long sedentary blocks — stand/walk every 30–60 min\n\nEven walking counts. 30 minutes of walking after meals significantly reduces blood sugar spikes. Start small if new to exercise — consistency beats intensity."),
    (["diet", "healthy diet", "what to eat", "what should i eat"],
     "A simple, evidence-based eating pattern:\n• Half your plate: vegetables and fruits\n• Quarter: lean protein (fish, chicken, lentils, tofu, eggs)\n• Quarter: whole grains (brown rice, whole-wheat roti, oats)\n• Healthy fats: olive oil, nuts, seeds, avocado\n• Limit: refined carbs (white bread, sugary drinks), processed meats, deep-fried foods\n\nEat slowly, drink water with meals, and stop at 80% full. This Mediterranean-style pattern consistently shows the best long-term health outcomes."),
    (["sleep", "insomnia", "how much sleep"],
     "Most adults need 7–9 hours of sleep. Consistent bedtime matters more than total hours on weekends.\n\nTips: keep the room cool and dark, no screens 30 min before bed, no caffeine after 2 PM, no heavy meals within 3 hours of sleep, and a consistent wake-up time even on weekends.\n\nChronic short sleep raises risk of diabetes, hypertension, and weight gain. If you snore loudly or wake gasping, ask your doctor about sleep apnea testing."),
    (["water", "hydration", "how much water"],
     "General guideline: about 30 ml per kg of body weight per day — so ~2 to 2.5 L (8–10 glasses) for most adults. Needs go up with exercise, heat, fever, or diarrhea.\n\nA practical check: urine should be pale yellow, not dark amber. Thirst isn't a reliable early signal — mild dehydration can cause fatigue, headache, and poor focus before you feel thirsty. Plain water is best; limit sugary drinks."),
    (["smoking", "quit smoking", "tobacco"],
     "Smoking is the single biggest preventable cause of disease — heart attack, stroke, cancer, and lung disease. Every cigarette damages blood vessels and raises clot risk.\n\nGood news: benefits start fast. Within 20 minutes your heart rate drops; within a year your heart attack risk is cut in half; within 5 years, stroke risk nearly matches a non-smoker's.\n\nQuitting tools that work: nicotine replacement (patches, gum), prescription meds (varenicline, bupropion), counseling, and quit lines. Combining methods triples success."),
    (["alcohol", "drinking"],
     "No level of alcohol is truly 'healthy', but moderate intake has less risk than heavy drinking. Guidelines: up to 1 drink/day for women, 2 for men — and several alcohol-free days per week.\n\nOne drink = 350 ml beer, 150 ml wine, or 45 ml spirits.\n\nHeavy drinking raises risk of liver disease, high BP, several cancers, and dependence. If you have fatty liver, elevated ALT/AST, or take medications that interact with alcohol, cutting back or stopping is the best choice."),
    (["stress", "anxiety", "mental health", "depression"],
     "Chronic stress affects physical health — it raises blood pressure, worsens sugar control, and disrupts sleep and digestion.\n\nEvidence-based ways to reduce stress: 20 minutes of daily walking, slow breathing (4 seconds in, 6 out), sleeping 7+ hours, limiting news/social media, and staying connected with friends and family.\n\nIf you're experiencing persistent sadness, loss of interest, sleep changes, or thoughts of self-harm for more than 2 weeks, please reach out to a mental health professional. Depression and anxiety are very treatable."),
    (["headache", "migraine"],
     "Common headache types:\n• Tension: dull, band-like pressure — often from stress, poor posture, or dehydration.\n• Migraine: throbbing, usually one-sided, with sensitivity to light/sound; can last hours to days.\n• Cluster: severe, around one eye.\n\nMost respond to rest, hydration, and OTC pain relievers. Keep a headache diary to spot triggers (food, sleep, caffeine).\n\n**See a doctor urgently** if it's the worst headache of your life, comes with fever/stiff neck, vision changes, weakness, or confusion."),
    (["fever", "high temperature"],
     "Fever is the body's defense against infection. Normal body temperature is ~36.5–37.5°C (97.7–99.5°F). Fever = 38°C+ (100.4°F+).\n\nFor most adults, fever under 39°C with good fluid intake doesn't need medication. Rest, drink fluids, and take paracetamol (acetaminophen) or ibuprofen for comfort.\n\n**Seek medical care** if: fever >39.5°C, lasts >3 days, comes with severe headache/stiff neck, chest pain, difficulty breathing, persistent vomiting, or if you have a weakened immune system."),
    (["covid", "coronavirus"],
     "COVID-19 is a viral illness spread mainly through respiratory droplets. Most cases are mild — fever, cough, fatigue, sore throat — but some people, especially elderly or those with chronic conditions, can develop severe illness.\n\nPrevention: stay up to date on vaccination, wash hands, wear a mask in crowded indoor settings during outbreaks, and stay home if sick. If you test positive, isolate 5–7 days and until symptoms improve.\n\n**Urgent care needed for**: trouble breathing, persistent chest pain, confusion, bluish lips/face, or low oxygen saturation (<94%)."),
]

def _general_medical_answer(q_low: str) -> str | None:
    """Match general medical topics from the knowledge base. Returns answer or None."""
    for keywords, answer in MEDICAL_KB:
        for kw in keywords:
            if re.search(rf"\b{re.escape(kw)}\b", q_low):
                return answer + "\n\n_This is general information — please consult your doctor for decisions about your own care._"
    return None

def _rule_based_answer(q: str, reports) -> str:
    if not reports:
        return ("I don't see any reports yet. Upload a lab report (PDF or image) and I can "
                "help explain your values, show trends, and give tips.")

    q_low = q.lower().strip()
    latest = reports[0]
    abnormal = _latest_abnormal(reports)
    n = len(reports)

    # Greeting
    if re.match(r"^\s*(hi|hello|hey|namaste|hola)\b[\s!.?,]*$", q_low):
        return ("Hi! I can help you understand your lab reports. Try asking:\n"
                "• 'Explain my HbA1c' or 'What is LDL?'\n"
                "• 'What's outside my normal range?'\n"
                "• 'How has my cholesterol changed?'\n"
                "• 'Give me tips based on my latest report'")

    # Specific tests mentioned → explain each
    mentioned = _find_tests(q_low)
    if mentioned:
        body = "\n\n".join(_explain_test(reports, t) for t in mentioned[:3])
        return body + "\n\n_Please discuss any concerns with your doctor._"

    # Trend / change / compare
    if any(k in q_low for k in ["trend", "changed", "changing", "change over", "getting better",
                                 "getting worse", "improv", "over time", "compare", "progress"]):
        if n < 2:
            return "You need at least two reports to see trends. Upload another report and I can compare values over time."
        changes = []
        for test in TEST_EXPLANATIONS.keys():
            hist = _history(reports, test)
            if len(hist) < 2: continue
            try:
                first_v = float(hist[0][0]["val"]); last_v = float(hist[-1][0]["val"])
            except (TypeError, ValueError, KeyError):
                continue
            if first_v == 0: continue
            delta = last_v - first_v
            pct = abs(delta / first_v * 100)
            if pct < 5 and hist[-1][0].get("status") == "normal": continue
            arrow = "↑" if delta > 0 else "↓" if delta < 0 else "→"
            unit = hist[-1][0].get("unit", "")
            changes.append((pct, f"**{test}**: {first_v}{unit} → {last_v}{unit} ({arrow} {abs(round(delta,2))}{unit})"))
        if not changes:
            return "Your values have been relatively stable across reports. No significant trend changes detected."
        changes.sort(reverse=True)
        return ("Notable changes across your reports:\n\n"
                + "\n".join(f"• {c[1]}" for c in changes[:6])
                + "\n\n_Discuss significant trends with your doctor._")

    # Abnormal / outside normal / what's wrong
    if any(k in q_low for k in ["abnormal", "outside normal", "outside my normal", "outside the normal",
                                 "out of range", "out of normal", "normal range", "off range",
                                 "above normal", "below normal", "elevated", "too high", "too low",
                                 "wrong", "concern", "problem", "issue", "bad value",
                                 "danger", "unhealthy", "worried"]):
        if not abnormal:
            return f"Good news — all values in your latest report (**{latest.report_type}**) are within the normal range."
        lines = []
        for k, v in abnormal:
            short = TEST_EXPLANATIONS.get(k, "").split(".")[0]
            lines.append(f"• **{k}**: {v.get('val')}{v.get('unit','')} ({v.get('status')}). Normal: {v.get('min')}–{v.get('max')}. {short}.")
        return (f"In your latest report (**{latest.report_type}**), these values are outside the normal range:\n\n"
                + "\n".join(lines) + "\n\n_Please review with your doctor._")

    # Tips / advice / diet / lifestyle
    if any(k in q_low for k in ["tip", "advice", "advise", "diet", "lifestyle", "should i do",
                                 "improve", "recommend", "suggestion", "help me", "what can i"]):
        tips = _loads(latest.ai_tips) if isinstance(latest.ai_tips, str) else []
        if isinstance(tips, list) and tips:
            return f"Based on your latest report (**{latest.report_type}**):\n\n" + "\n".join(f"• {t}" for t in tips[:6])
        return "Upload a report and I'll give you tailored tips based on its values."

    # Critical / urgent / flagged
    if any(k in q_low for k in ["urgent", "critical", "flag", "serious", "emergency"]):
        flagged = [r for r in reports if r.is_flagged]
        if not flagged:
            return "None of your reports are flagged as urgent. All values are within acceptable ranges."
        lines = [f"• **{r.report_type}** ({r.uploaded_at.date()}): {r.flag_reason or 'flagged by doctor'}" for r in flagged[:5]]
        return "The following reports are flagged:\n\n" + "\n".join(lines) + "\n\n_Please contact your doctor promptly._"

    # Summary / explain / latest
    if any(k in q_low for k in ["summary", "summarize", "explain", "overview", "what do my",
                                 "what does", "mean", "latest", "recent", "my report"]):
        expl = latest.ai_explanation or latest.ai_summary or ""
        head = f"Your latest report is **{latest.report_type}** from {latest.uploaded_at.date()}."
        if abnormal:
            abn = "; ".join(f"{k}: {v.get('val')}{v.get('unit','')} ({v.get('status')})" for k, v in abnormal[:5])
            return f"{head}\n\n{expl}\n\n**Values outside normal:** {abn}."
        return f"{head} All values are within the normal range.\n\n{expl}"

    # Count / how many reports
    if any(k in q_low for k in ["how many", "count of reports", "total report", "how much report"]):
        flagged_ct = sum(1 for r in reports if r.is_flagged)
        return f"You have **{n}** report{'s' if n != 1 else ''} on file. {flagged_ct} {'is' if flagged_ct == 1 else 'are'} flagged."

    # Doctor / when to see
    if any(k in q_low for k in ["see a doctor", "see doctor", "consult", "appointment", "when should i"]):
        if any(r.is_flagged for r in reports):
            return "You have flagged reports, so please consult your doctor soon. You can message them from the Messages tab."
        if abnormal:
            return "Some values are outside the normal range but not critical. A routine consultation with your doctor is a good idea."
        return "Your values look within normal range. A routine annual check-up is fine."

    # General medical topic lookup (diabetes, hypertension, thyroid, etc.)
    kb = _general_medical_answer(q_low)
    if kb:
        return kb

    # Default: helpful guide
    return ("I can help with things like:\n\n"
            "• **Explain a specific test** — 'explain my HbA1c', 'what is LDL?'\n"
            "• **Abnormal values** — 'what's outside my normal range?'\n"
            "• **Trends** — 'how has my cholesterol changed?'\n"
            "• **Advice** — 'what tips do you have based on my reports?'\n"
            "• **Latest summary** — 'summarize my latest report'\n"
            "• **General medical topics** — 'what is diabetes?', 'normal blood pressure?', 'fatty liver'\n\n"
            f"You currently have **{n}** report{'s' if n != 1 else ''} on file.")

# ── LLM callers ──────────────────────────────────────────────
# Ordered newest-first; the first one that succeeds is used and cached for this process.
GEMINI_MODELS = ["gemini-2.5-flash", "gemini-2.0-flash", "gemini-flash-latest", "gemini-1.5-flash"]
_gemini_working_model: str | None = None

def _call_gemini(q: str, context: str, history) -> str | None:
    """Google Gemini free tier. Returns answer text or None on failure."""
    global _gemini_working_model
    key = settings.GEMINI_API_KEY
    if not key or key.startswith("your-"):
        return None
    contents = [
        {"role": "user", "parts": [{"text": CHAT_SYSTEM + "\n\nPATIENT REPORT CONTEXT:\n" + context}]},
        {"role": "model", "parts": [{"text": "Understood. I'll help with reports and general medical questions."}]},
    ]
    for h in history:
        contents.append({"role": "user" if h.role == "user" else "model", "parts": [{"text": h.content}]})
    contents.append({"role": "user", "parts": [{"text": q}]})
    body = {"contents": contents, "generationConfig": {"temperature": 0.4, "maxOutputTokens": 700}}

    models_to_try = [_gemini_working_model] if _gemini_working_model else GEMINI_MODELS
    last_err = None
    try:
        with httpx.Client(timeout=30) as client:
            for model in models_to_try:
                url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}"
                try:
                    r = client.post(url, json=body)
                    if r.status_code == 404:
                        last_err = f"{model}: 404"
                        continue
                    r.raise_for_status()
                    data = r.json()
                    _gemini_working_model = model
                    return data["candidates"][0]["content"]["parts"][0]["text"].strip()
                except httpx.HTTPStatusError as e:
                    last_err = f"{model}: {e.response.status_code} {e.response.text[:200]}"
                    if e.response.status_code == 404:
                        continue
                    raise
    except Exception as e:
        last_err = str(e)
    print(f"Gemini error: {last_err}")
    return None

def _call_openai(q: str, context: str, history) -> str | None:
    if not (_openai_ok and settings.OPENAI_API_KEY and not settings.OPENAI_API_KEY.startswith("sk-your-")):
        return None
    try:
        client = OpenAI(api_key=settings.OPENAI_API_KEY)
        msgs = [{"role": "system", "content": CHAT_SYSTEM + "\n\nPATIENT REPORT CONTEXT:\n" + context}]
        for h in history:
            msgs.append({"role": h.role, "content": h.content})
        msgs.append({"role": "user", "content": q})
        r = client.chat.completions.create(model="gpt-4o", messages=msgs, temperature=0.4, max_tokens=500)
        return r.choices[0].message.content.strip()
    except Exception as e:
        print(f"OpenAI error: {e}")
        return None

@router.post("/ask")
def ask(req: AskRequest, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    if user.role.value != "patient":
        raise HTTPException(403, "Chat is for patients")
    q = req.question.strip()
    reports = (db.query(Report)
                 .filter(Report.patient_id == user.id)
                 .order_by(Report.uploaded_at.desc())
                 .all())
    context = _build_context(reports)
    history = (db.query(ChatMessage)
                 .filter(ChatMessage.user_id == user.id)
                 .order_by(ChatMessage.created_at.desc())
                 .limit(8).all())
    history = list(reversed(history))

    answer = (
        _call_gemini(q, context, history)
        or _call_openai(q, context, history)
        or _rule_based_answer(q, reports)
    )

    db.add(ChatMessage(user_id=user.id, role="user", content=q))
    db.add(ChatMessage(user_id=user.id, role="assistant", content=answer))
    db.commit()
    return {"answer": answer}

@router.get("/history")
def history(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    msgs = (db.query(ChatMessage)
              .filter(ChatMessage.user_id == user.id)
              .order_by(ChatMessage.created_at.asc())
              .all())
    return [
        {"id": m.id, "role": m.role, "content": m.content, "created_at": m.created_at.isoformat()}
        for m in msgs
    ]

@router.delete("/history")
def clear(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    db.query(ChatMessage).filter(ChatMessage.user_id == user.id).delete()
    db.commit()
    return {"ok": True}
