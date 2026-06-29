import { createConceptSeed, type RapidRoundsConceptSeed } from "@/lib/subject-seeds/seed-types";

const subject = "Internal Medicine" as const;

export const internalMedicineSeeds: RapidRoundsConceptSeed[] = [
  createConceptSeed(subject, "ACS", {
    schema: "Acute myocardial ischemia organized by ECG findings, biomarkers, stability, and reperfusion need.",
    questionArchetypes: ["Diagnosis", "Initial management", "Definitive management", "Complication"],
    pivotClues: ["ST elevation", "troponin rise", "ischemic chest pain"],
    supportingClues: ["diaphoresis", "radiation to jaw or arm", "dynamic ECG changes"],
    contextualClues: ["diabetes", "smoking", "prior coronary disease"],
    commonTraps: ["waiting for troponin when STEMI criteria are present", "missing dissection before anticoagulation"],
    primaryDiscriminators: ["ST elevation changes the task to urgent reperfusion"],
    managementRules: ["read the ECG first", "reperfuse STEMI urgently", "risk-stratify NSTEMI"],
    contraindications: ["avoid nitrates with recent PDE5 inhibitor use or right ventricular infarct hypotension"],
    relatedConcepts: ["aortic dissection", "pericarditis", "pulmonary embolism"],
    guidelineReferences: ["ACC/AHA acute coronary syndrome guidance"]
  }),
  createConceptSeed(subject, "HFrEF", {
    schema: "Systolic heart failure with reduced ejection fraction and congestion or low-output symptoms.",
    questionArchetypes: ["Diagnosis", "Initial management", "Definitive management", "Drug adverse effect"],
    pivotClues: ["reduced ejection fraction", "pulmonary edema", "orthopnea"],
    supportingClues: ["S3", "elevated BNP", "peripheral edema"],
    commonTraps: ["using diltiazem or verapamil in systolic dysfunction"],
    primaryDiscriminators: ["reduced EF separates HFrEF from HFpEF"],
    managementRules: ["treat congestion with loop diuretics", "optimize guideline-directed medical therapy when stable"],
    contraindications: ["avoid non-dihydropyridine calcium channel blockers in HFrEF"],
    relatedConcepts: ["HFpEF", "ACS", "cardiorenal syndrome"],
    guidelineReferences: ["ACC/AHA/HFSA heart failure guideline"]
  }),
  createConceptSeed(subject, "HFpEF", {
    schema: "Heart failure syndrome with preserved ejection fraction, diastolic dysfunction, and congestion.",
    pivotClues: ["preserved ejection fraction", "concentric hypertrophy", "diastolic dysfunction"],
    supportingClues: ["older patient", "hypertension", "atrial fibrillation", "pulmonary congestion"],
    commonTraps: ["assuming all heart failure has reduced EF"],
    primaryDiscriminators: ["preserved EF separates HFpEF from HFrEF"],
    managementRules: ["treat congestion", "control blood pressure and comorbid drivers"],
    relatedConcepts: ["HFrEF", "hypertension", "atrial fibrillation"],
    guidelineReferences: ["ACC/AHA/HFSA heart failure guideline"]
  }),
  createConceptSeed(subject, "COPD exacerbation", {
    schema: "Acute worsening dyspnea, cough, or sputum in chronic obstructive lung disease.",
    questionArchetypes: ["Diagnosis", "Initial management", "Complication"],
    pivotClues: ["increased sputum purulence", "hypercapnia", "smoking history with fixed obstruction"],
    supportingClues: ["wheezing", "barrel chest", "low baseline oxygen saturation"],
    commonTraps: ["over-oxygenating a CO2 retainer", "treating all wheezing as asthma"],
    primaryDiscriminators: ["fixed obstruction and smoking history separate COPD from asthma"],
    managementRules: ["give bronchodilators", "give systemic corticosteroids", "use antibiotics when infectious features or ventilatory support are present"],
    contraindications: ["avoid excessive oxygen targets in high hypercapnia risk"],
    relatedConcepts: ["asthma exacerbation", "pneumonia"],
    guidelineReferences: ["GOLD COPD strategy"]
  }),
  createConceptSeed(subject, "asthma exacerbation", {
    schema: "Reversible obstructive airway flare with wheeze, dyspnea, and reduced airflow.",
    questionArchetypes: ["Initial management", "Complication", "Drug adverse effect"],
    pivotClues: ["reduced peak flow", "accessory muscle use", "silent chest"],
    supportingClues: ["wheezing", "atopy", "trigger exposure"],
    commonTraps: ["under-recognizing silent chest", "delaying systemic steroids"],
    primaryDiscriminators: ["silent chest signals impending respiratory failure"],
    managementRules: ["give inhaled short-acting beta agonist", "add ipratropium for severe attacks", "give systemic corticosteroids"],
    contraindications: ["avoid nonselective beta blockers when possible"],
    relatedConcepts: ["COPD exacerbation", "anaphylaxis"],
    guidelineReferences: ["GINA asthma strategy"]
  }),
  createConceptSeed(subject, "pneumonia", {
    schema: "Infectious lung parenchymal inflammation with respiratory symptoms and compatible imaging.",
    pivotClues: ["new infiltrate", "fever", "productive cough"],
    supportingClues: ["hypoxemia", "crackles", "leukocytosis"],
    commonTraps: ["treating bronchitis as pneumonia without infiltrate"],
    primaryDiscriminators: ["new infiltrate separates pneumonia from bronchitis"],
    managementRules: ["assess severity and oxygenation", "start empiric antibiotics based on site of care and risk"],
    relatedConcepts: ["sepsis", "COPD exacerbation", "pulmonary embolism"],
    guidelineReferences: ["IDSA/ATS community-acquired pneumonia guideline"]
  }),
  createConceptSeed(subject, "pulmonary embolism", {
    schema: "Venous thromboembolism presenting with acute dyspnea, pleuritic pain, hypoxemia, or shock.",
    pivotClues: ["sudden dyspnea", "pleuritic chest pain", "unilateral leg swelling"],
    supportingClues: ["tachycardia", "hypoxemia", "recent surgery"],
    commonTraps: ["ordering D-dimer in high pretest probability", "delaying treatment in unstable massive PE"],
    primaryDiscriminators: ["pretest probability determines D-dimer versus imaging"],
    managementRules: ["risk-stratify before testing", "anticoagulate confirmed PE unless contraindicated"],
    contraindications: ["avoid anticoagulation when active major bleeding prohibits it"],
    relatedConcepts: ["DVT", "pneumonia", "ACS"],
    guidelineReferences: ["CHEST venous thromboembolism guideline"]
  }),
  createConceptSeed(subject, "DKA/HHS", {
    schema: "Hyperglycemic crisis with dehydration; DKA has ketosis and acidosis, HHS has profound hyperosmolality.",
    questionArchetypes: ["Diagnosis", "Initial management", "Mechanism/pathophysiology"],
    pivotClues: ["anion gap metabolic acidosis", "ketones", "serum osmolality"],
    supportingClues: ["polyuria", "dehydration", "missed insulin"],
    commonTraps: ["starting insulin before potassium is known"],
    primaryDiscriminators: ["ketosis and acidosis separate DKA from HHS"],
    managementRules: ["give isotonic fluids first", "check potassium before insulin", "treat the trigger"],
    contraindications: ["avoid insulin when potassium is dangerously low until potassium is replaced"],
    relatedConcepts: ["anion gap metabolic acidosis", "sepsis"],
    guidelineReferences: ["ADA standards of care in diabetes"]
  }),
  createConceptSeed(subject, "thyroid storm", {
    schema: "Life-threatening thyrotoxicosis with fever, adrenergic symptoms, and organ dysfunction.",
    pivotClues: ["fever with thyrotoxicosis", "tachyarrhythmia", "altered mental status"],
    supportingClues: ["goiter", "tremor", "low TSH"],
    commonTraps: ["giving iodine before thionamide"],
    primaryDiscriminators: ["organ dysfunction separates thyroid storm from uncomplicated hyperthyroidism"],
    managementRules: ["beta blockade when safe", "thionamide before iodine", "give glucocorticoids and supportive care"],
    contraindications: ["avoid iodine before thionamide"],
    relatedConcepts: ["hyperthyroidism", "atrial fibrillation", "sepsis"],
    guidelineReferences: ["American Thyroid Association thyrotoxicosis guidance"]
  }),
  createConceptSeed(subject, "adrenal insufficiency", {
    schema: "Cortisol deficiency causing fatigue, hypotension, hyponatremia, and crisis under stress.",
    pivotClues: ["hypotension", "hyponatremia", "hyperkalemia"],
    supportingClues: ["hyperpigmentation", "steroid withdrawal", "hypoglycemia"],
    commonTraps: ["waiting for confirmatory testing in adrenal crisis"],
    primaryDiscriminators: ["shock with risk factors requires stress-dose steroids"],
    managementRules: ["give stress-dose hydrocortisone immediately in adrenal crisis"],
    contraindications: ["avoid delaying steroids in unstable suspected adrenal crisis"],
    relatedConcepts: ["shock", "hyponatremia", "thyroid storm"],
    guidelineReferences: ["Endocrine Society adrenal insufficiency guideline"]
  }),
  createConceptSeed(subject, "cirrhosis complications", {
    schema: "Portal hypertension and impaired hepatic function causing ascites, variceal bleeding, encephalopathy, or infection.",
    pivotClues: ["ascites", "variceal bleeding", "hepatic encephalopathy", "spontaneous bacterial peritonitis"],
    supportingClues: ["jaundice", "asterixis", "splenomegaly"],
    commonTraps: ["missing diagnostic paracentesis for new ascites", "forgetting antibiotics in variceal bleeding"],
    primaryDiscriminators: ["new ascites requires diagnostic paracentesis"],
    managementRules: ["match treatment to the complication: ascites, bleeding, infection, or encephalopathy"],
    contraindications: ["avoid nephrotoxins and unnecessary sedatives in decompensated cirrhosis"],
    relatedConcepts: ["GI bleed", "AKI", "sepsis"],
    guidelineReferences: ["AASLD cirrhosis practice guidance"]
  }),
  createConceptSeed(subject, "AKI", {
    schema: "Acute decline in kidney filtration from prerenal, intrinsic, or postrenal causes.",
    pivotClues: ["rising creatinine", "oliguria", "muddy brown casts", "hydronephrosis"],
    supportingClues: ["volume depletion", "nephrotoxin exposure", "urine sediment"],
    commonTraps: ["over-relying on FENa in diuretic use", "missing urgent dialysis indications"],
    primaryDiscriminators: ["volume status and urine sediment separate prerenal from intrinsic causes"],
    managementRules: ["stop nephrotoxins", "assess volume status", "relieve obstruction when present"],
    contraindications: ["avoid nephrotoxins and unsafe contrast exposure"],
    relatedConcepts: ["CKD", "hyperkalemia", "sepsis"],
    guidelineReferences: ["KDIGO acute kidney injury guideline"]
  }),
  createConceptSeed(subject, "CKD", {
    schema: "Chronic kidney damage or reduced GFR with complications of mineral, electrolyte, acid-base, and hematologic balance.",
    pivotClues: ["reduced eGFR for at least 3 months", "albuminuria", "small echogenic kidneys"],
    supportingClues: ["anemia", "hyperphosphatemia", "hypertension"],
    commonTraps: ["calling acute creatinine rise CKD without chronicity"],
    primaryDiscriminators: ["duration separates CKD from AKI"],
    managementRules: ["stage by eGFR and albuminuria", "adjust medications and treat complications"],
    contraindications: ["avoid nephrotoxins and inappropriate medication doses for GFR"],
    relatedConcepts: ["AKI", "diabetic kidney disease", "anemia workup"],
    guidelineReferences: ["KDIGO chronic kidney disease guideline"]
  }),
  createConceptSeed(subject, "nephritic syndrome", {
    schema: "Inflammatory glomerular disease with hematuria, red blood cell casts, hypertension, and renal dysfunction.",
    pivotClues: ["red blood cell casts", "dysmorphic RBCs", "cola-colored urine"],
    supportingClues: ["hypertension", "edema", "low complement"],
    commonTraps: ["confusing nephritic hematuria with nephrotic protein loss"],
    primaryDiscriminators: ["RBC casts indicate nephritic pattern"],
    managementRules: ["evaluate urine sediment and renal function urgently when rapidly progressive"],
    relatedConcepts: ["nephrotic syndrome", "AKI", "lupus nephritis"],
    guidelineReferences: ["KDIGO glomerular diseases guideline"]
  }),
  createConceptSeed(subject, "nephrotic syndrome", {
    schema: "Glomerular protein-loss syndrome with heavy proteinuria, hypoalbuminemia, edema, and lipiduria.",
    pivotClues: ["heavy proteinuria", "hypoalbuminemia", "lipiduria"],
    supportingClues: ["edema", "hyperlipidemia", "thrombosis risk"],
    commonTraps: ["missing thrombosis risk in nephrotic syndrome"],
    primaryDiscriminators: ["massive proteinuria separates nephrotic from nephritic disease"],
    managementRules: ["identify cause and treat edema, proteinuria, and complications"],
    relatedConcepts: ["nephritic syndrome", "CKD", "diabetic kidney disease"],
    guidelineReferences: ["KDIGO glomerular diseases guideline"]
  }),
  createConceptSeed(subject, "anemia workup", {
    schema: "Low hemoglobin classified by MCV, reticulocyte response, iron studies, hemolysis markers, and bleeding risk.",
    questionArchetypes: ["Diagnosis", "Mechanism/pathophysiology", "Screening/prevention"],
    pivotClues: ["MCV", "reticulocyte count", "ferritin"],
    supportingClues: ["fatigue", "pallor", "GI symptoms"],
    commonTraps: ["treating iron deficiency without searching for bleeding in appropriate adults"],
    primaryDiscriminators: ["MCV starts classification and reticulocytes decide production versus loss/destruction"],
    managementRules: ["classify by MCV and reticulocyte count before targeted testing"],
    contraindications: ["avoid folate-only treatment when B12 deficiency is possible"],
    relatedConcepts: ["GI bleed", "CKD", "colon cancer screening"],
    guidelineReferences: ["ASH anemia educational guidance"]
  }),
  createConceptSeed(subject, "GI bleed", {
    schema: "Overt or occult gastrointestinal bleeding requiring localization, resuscitation, and targeted endoscopic or medical therapy.",
    pivotClues: ["hematemesis", "melena", "hematochezia", "hemodynamic instability"],
    supportingClues: ["NSAID use", "anticoagulation", "cirrhosis"],
    commonTraps: ["scoping before resuscitation in unstable bleeding"],
    primaryDiscriminators: ["instability makes resuscitation the first step"],
    managementRules: ["stabilize first", "localize source after perfusion is addressed"],
    contraindications: ["avoid delaying resuscitation for diagnostic procedures in unstable patients"],
    relatedConcepts: ["cirrhosis complications", "anemia workup"],
    guidelineReferences: ["ACG upper GI bleeding guideline"]
  }),
  createConceptSeed(subject, "sepsis", {
    schema: "Life-threatening organ dysfunction from infection requiring rapid recognition, antimicrobials, fluids, and source control.",
    pivotClues: ["suspected infection with organ dysfunction", "hypotension", "elevated lactate"],
    supportingClues: ["fever", "tachycardia", "altered mental status"],
    commonTraps: ["waiting for cultures before antibiotics when unstable"],
    primaryDiscriminators: ["infection plus organ dysfunction separates sepsis from uncomplicated infection"],
    managementRules: ["give empiric antimicrobials promptly", "restore perfusion", "pursue source control"],
    contraindications: ["avoid delaying antibiotics in unstable suspected sepsis"],
    relatedConcepts: ["pneumonia", "AKI", "adrenal insufficiency"],
    guidelineReferences: ["Surviving Sepsis Campaign guidelines"]
  }),
  createConceptSeed(subject, "infective endocarditis", {
    schema: "Endovascular infection of valves or cardiac devices causing bacteremia, embolic phenomena, murmur, or heart failure.",
    pivotClues: ["persistent bacteremia", "new murmur", "embolic lesions"],
    supportingClues: ["fever", "IV drug use", "prosthetic valve"],
    commonTraps: ["starting antibiotics before blood cultures in stable patients"],
    primaryDiscriminators: ["persistent bacteremia plus valve findings points to endocarditis"],
    managementRules: ["obtain multiple blood cultures before antibiotics when stable", "use echocardiography when suspected"],
    contraindications: ["avoid delaying antibiotics in unstable sepsis solely for ideal culture timing"],
    relatedConcepts: ["sepsis", "stroke", "glomerulonephritis"],
    guidelineReferences: ["AHA infective endocarditis scientific statement"]
  })
];
