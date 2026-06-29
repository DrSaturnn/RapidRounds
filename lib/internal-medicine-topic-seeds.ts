import type { NbmeArchetype } from "@/lib/local-reasoning-engine";

export type RapidRoundsConceptSeed = {
  id: string;
  topic: string;
  domain: "Internal Medicine";
  schema: string;
  questionArchetypes: NbmeArchetype[];
  pivotClues: string[];
  supportingClues: string[];
  contextualClues: string[];
  commonTraps: string[];
  primaryDiscriminators: string[];
  secondaryDiscriminators: string[];
  managementRules: string[];
  contraindications: string[];
  nextTimeRule: string;
  relatedConcepts: string[];
  guidelineReferences: string[];
};

export type ClinicalSchemaSeed = {
  id: string;
  name: string;
  category: string;
  clueTerms: string[];
  expectedPivots: string[];
  commonConfusions: string[];
};

export const internalMedicineTopicSeeds: RapidRoundsConceptSeed[] = [
  {
    id: "im-hfref",
    topic: "HFrEF",
    domain: "Internal Medicine",
    schema: "Systolic heart failure with reduced ejection fraction and congestion or low-output symptoms.",
    questionArchetypes: ["Diagnosis", "Initial management", "Definitive management", "Drug adverse effect", "Prognosis/counseling"],
    pivotClues: ["reduced ejection fraction", "orthopnea", "pulmonary edema", "S3", "volume overload"],
    supportingClues: ["elevated BNP", "cardiomegaly", "bibasilar crackles", "peripheral edema"],
    contextualClues: ["ischemic cardiomyopathy", "hypertension", "prior myocardial infarction"],
    commonTraps: ["treating congestion without guideline-directed therapy", "using non-dihydropyridine calcium channel blockers in systolic dysfunction"],
    primaryDiscriminators: ["reduced EF separates HFrEF from HFpEF", "acute pulmonary edema changes the first action toward stabilization and diuresis"],
    secondaryDiscriminators: ["renal function and potassium determine medication safety", "hypotension limits titration"],
    managementRules: ["stabilize hypoxia and congestion first", "use loop diuretics for fluid overload", "build long-term therapy with ARNI or ACE inhibitor/ARB, evidence beta blocker, MRA, and SGLT2 inhibitor when tolerated"],
    contraindications: ["avoid verapamil and diltiazem in HFrEF", "avoid MRA with dangerous hyperkalemia or severe renal dysfunction"],
    nextTimeRule: "First decide acute congestion versus chronic optimization, then check EF and medication safety.",
    relatedConcepts: ["HFpEF", "cardiogenic shock", "acute coronary syndrome", "cardiorenal syndrome", "hyperkalemia"],
    guidelineReferences: ["ACC/AHA/HFSA heart failure guideline", "ESC heart failure guideline"]
  },
  {
    id: "im-acs",
    topic: "ACS",
    domain: "Internal Medicine",
    schema: "Acute myocardial ischemia ranging from unstable angina to NSTEMI and STEMI.",
    questionArchetypes: ["Diagnosis", "Initial management", "Definitive management", "Mechanism/pathophysiology", "Complication"],
    pivotClues: ["ischemic chest pain", "ST elevation", "troponin rise", "dynamic ECG changes", "hemodynamic instability"],
    supportingClues: ["diaphoresis", "radiation to arm or jaw", "risk factors", "new wall motion abnormality"],
    contextualClues: ["diabetes", "smoking", "prior coronary disease", "cocaine use"],
    commonTraps: ["waiting for troponin when STEMI criteria are present", "missing aortic dissection before anticoagulation", "giving nitrates in right ventricular infarct or recent PDE5 inhibitor use"],
    primaryDiscriminators: ["STEMI requires immediate reperfusion", "troponin separates NSTEMI from unstable angina"],
    secondaryDiscriminators: ["pleuritic positional pain suggests pericarditis", "tearing pain with pulse deficit suggests dissection"],
    managementRules: ["obtain ECG rapidly", "give antiplatelet therapy when ACS is likely and bleeding risk allows", "reperfuse STEMI urgently", "risk-stratify NSTEMI for invasive strategy"],
    contraindications: ["avoid nitrates with recent PDE5 inhibitor use or right ventricular infarct hypotension", "avoid anticoagulation if dissection is suspected"],
    nextTimeRule: "Read the ECG first; STEMI is a reperfusion decision, not a wait-for-labs decision.",
    relatedConcepts: ["aortic dissection", "pericarditis", "pulmonary embolism", "heart failure", "cardiogenic shock"],
    guidelineReferences: ["ACC/AHA acute coronary syndrome guidance", "ESC acute coronary syndrome guideline"]
  },
  {
    id: "im-copd-exacerbation",
    topic: "COPD exacerbation",
    domain: "Internal Medicine",
    schema: "Acute worsening dyspnea, cough, or sputum in a patient with chronic obstructive lung disease.",
    questionArchetypes: ["Diagnosis", "Initial management", "Complication", "Screening/prevention"],
    pivotClues: ["increased sputum purulence", "increased dyspnea", "wheezing with smoking history", "hypercapnia"],
    supportingClues: ["barrel chest", "low baseline oxygen saturation", "chronic cough", "reduced FEV1/FVC"],
    contextualClues: ["long smoking history", "home oxygen", "recent respiratory infection"],
    commonTraps: ["over-oxygenating chronic CO2 retainers", "missing pneumonia or pneumothorax as a trigger", "treating all wheezing as asthma"],
    primaryDiscriminators: ["fixed obstruction and smoking history separate COPD from asthma", "purulent sputum supports antibiotics in selected exacerbations"],
    secondaryDiscriminators: ["CO2 retention changes ventilation strategy", "fever and focal infiltrate point toward pneumonia"],
    managementRules: ["use short-acting bronchodilators", "give systemic corticosteroids", "add antibiotics when infectious features or ventilatory support are present", "use noninvasive ventilation for appropriate hypercapnic respiratory failure"],
    contraindications: ["avoid excessive oxygen targets when hypercapnia risk is high"],
    nextTimeRule: "In COPD, decide severity and CO2 retention before choosing oxygen and ventilatory support.",
    relatedConcepts: ["asthma exacerbation", "pneumonia", "pulmonary embolism", "acute respiratory failure"],
    guidelineReferences: ["GOLD COPD strategy", "ATS/ERS COPD guidance"]
  },
  {
    id: "im-asthma-exacerbation",
    topic: "Asthma exacerbation",
    domain: "Internal Medicine",
    schema: "Reversible obstructive airway flare with wheeze, dyspnea, and reduced airflow.",
    questionArchetypes: ["Initial management", "Definitive management", "Complication", "Drug adverse effect"],
    pivotClues: ["wheezing", "reduced peak flow", "accessory muscle use", "silent chest", "prior intubation"],
    supportingClues: ["atopy", "trigger exposure", "reversible obstruction", "night symptoms"],
    contextualClues: ["viral infection", "allergen exposure", "poor controller adherence"],
    commonTraps: ["delaying systemic steroids in moderate or severe exacerbation", "under-recognizing silent chest", "using beta blockers in reactive airway disease"],
    primaryDiscriminators: ["reversibility and atopy separate asthma from COPD", "silent chest signals impending respiratory failure"],
    secondaryDiscriminators: ["fever and focal findings suggest pneumonia", "pleuritic chest pain may suggest pneumothorax or PE"],
    managementRules: ["give inhaled short-acting beta agonist promptly", "add ipratropium for severe exacerbations", "give systemic steroids for moderate or severe attacks", "escalate to magnesium or ventilatory support when severe"],
    contraindications: ["avoid nonselective beta blockers when possible", "avoid sedatives that suppress ventilation in severe attacks"],
    nextTimeRule: "Judge severity by work of breathing and airflow, not by wheeze volume alone.",
    relatedConcepts: ["COPD exacerbation", "anaphylaxis", "pneumonia", "pneumothorax"],
    guidelineReferences: ["GINA asthma strategy", "NAEPP asthma focused updates"]
  },
  {
    id: "im-pneumonia",
    topic: "Pneumonia",
    domain: "Internal Medicine",
    schema: "Infectious lung parenchymal inflammation with respiratory symptoms and compatible imaging.",
    questionArchetypes: ["Diagnosis", "Initial management", "Complication", "Risk factor"],
    pivotClues: ["new infiltrate", "fever", "productive cough", "hypoxemia", "pleuritic pain"],
    supportingClues: ["crackles", "leukocytosis", "sputum production", "consolidation"],
    contextualClues: ["aspiration risk", "recent hospitalization", "immunosuppression", "influenza season"],
    commonTraps: ["treating bronchitis as pneumonia without infiltrate", "missing sepsis severity", "ignoring aspiration or resistant organism risk"],
    primaryDiscriminators: ["new infiltrate separates pneumonia from bronchitis", "severity and setting drive antibiotic choice"],
    secondaryDiscriminators: ["wheezing without infiltrate favors asthma/COPD", "sudden pleuritic pain with risk factors suggests PE"],
    managementRules: ["assess severity and oxygenation", "start empiric antibiotics based on setting and risk", "obtain cultures when severe or hospitalized before antibiotics if this does not delay care"],
    contraindications: ["avoid fluoroquinolones when safer appropriate options exist in high-risk adverse-effect settings"],
    nextTimeRule: "Confirm pneumonia by syndrome plus infiltrate, then choose treatment by site of care and severity.",
    relatedConcepts: ["COPD exacerbation", "sepsis", "pulmonary embolism", "aspiration pneumonitis"],
    guidelineReferences: ["IDSA/ATS community-acquired pneumonia guideline"]
  },
  {
    id: "im-pulmonary-embolism",
    topic: "Pulmonary embolism",
    domain: "Internal Medicine",
    schema: "Venous thromboembolism presenting with acute dyspnea, pleuritic pain, hypoxemia, or shock.",
    questionArchetypes: ["Diagnosis", "Initial management", "Definitive management", "Risk factor"],
    pivotClues: ["sudden dyspnea", "pleuritic chest pain", "tachycardia", "unilateral leg swelling", "right heart strain"],
    supportingClues: ["hypoxemia", "recent surgery", "immobility", "cancer", "elevated D-dimer in low-risk patient"],
    contextualClues: ["pregnancy", "oral estrogen", "prior VTE", "thrombophilia"],
    commonTraps: ["ordering D-dimer in high pretest probability", "delaying treatment in unstable massive PE", "missing contraindications to anticoagulation"],
    primaryDiscriminators: ["pretest probability determines D-dimer versus imaging", "hemodynamic instability changes treatment toward reperfusion consideration"],
    secondaryDiscriminators: ["wheezing suggests asthma/COPD", "focal infiltrate with fever suggests pneumonia"],
    managementRules: ["risk-stratify before testing", "use CT pulmonary angiography when appropriate", "anticoagulate confirmed PE unless contraindicated", "consider thrombolysis or embolectomy for unstable massive PE"],
    contraindications: ["avoid anticoagulation or thrombolysis when active major bleeding or high bleeding risk prohibits it"],
    nextTimeRule: "First decide PE probability and stability; unstable PE is a treatment decision, not just a diagnostic one.",
    relatedConcepts: ["DVT", "pneumonia", "ACS", "asthma exacerbation", "right heart strain"],
    guidelineReferences: ["CHEST venous thromboembolism guideline", "ESC pulmonary embolism guideline"]
  },
  {
    id: "im-dka-hhs",
    topic: "DKA/HHS",
    domain: "Internal Medicine",
    schema: "Hyperglycemic crisis with dehydration; DKA has ketosis and acidosis, HHS has profound hyperosmolality.",
    questionArchetypes: ["Diagnosis", "Initial management", "Mechanism/pathophysiology", "Complication"],
    pivotClues: ["anion gap metabolic acidosis", "ketones", "very high glucose", "altered mental status", "serum osmolality"],
    supportingClues: ["polyuria", "polydipsia", "dehydration", "infection trigger", "missed insulin"],
    contextualClues: ["type 1 diabetes", "type 2 diabetes", "steroid use", "infection"],
    commonTraps: ["starting insulin before potassium is known", "missing HHS when ketones are mild", "forgetting fluids are first"],
    primaryDiscriminators: ["ketosis and acidosis separate DKA from HHS", "potassium level determines insulin safety"],
    secondaryDiscriminators: ["lactic acidosis and sepsis may coexist", "toxic alcohols can also cause anion gap acidosis"],
    managementRules: ["give isotonic fluids first", "check and correct potassium before insulin when low", "start insulin after initial fluids and safe potassium", "treat precipitating cause"],
    contraindications: ["avoid insulin when potassium is dangerously low until potassium is replaced"],
    nextTimeRule: "In hyperglycemic crisis, fluids first, potassium safety second, insulin third.",
    relatedConcepts: ["anion gap metabolic acidosis", "sepsis", "adrenal insufficiency", "hyperkalemia"],
    guidelineReferences: ["ADA standards of care in diabetes", "Endocrine Society hyperglycemic crisis guidance"]
  },
  {
    id: "im-thyroid-storm",
    topic: "Thyroid storm",
    domain: "Internal Medicine",
    schema: "Life-threatening thyrotoxicosis with fever, adrenergic symptoms, and organ dysfunction.",
    questionArchetypes: ["Diagnosis", "Initial management", "Mechanism/pathophysiology", "Complication"],
    pivotClues: ["fever", "tachyarrhythmia", "altered mental status", "thyrotoxicosis", "precipitating illness"],
    supportingClues: ["goiter", "tremor", "diarrhea", "weight loss", "low TSH"],
    contextualClues: ["Graves disease", "recent surgery", "infection", "iodinated contrast"],
    commonTraps: ["giving iodine before thionamide", "missing adrenal support in severe illness", "treating isolated lab hyperthyroidism as storm"],
    primaryDiscriminators: ["systemic decompensation separates thyroid storm from uncomplicated hyperthyroidism", "thionamide precedes iodine"],
    secondaryDiscriminators: ["sepsis can mimic fever and tachycardia", "pheochromocytoma can mimic adrenergic excess"],
    managementRules: ["give beta blockade when safe", "give thionamide", "give iodine after thionamide", "give glucocorticoids and supportive care", "treat trigger"],
    contraindications: ["avoid iodine before thionamide", "use caution with beta blockade in decompensated heart failure or severe asthma"],
    nextTimeRule: "Thyroid storm is treated in sequence: block adrenergic effects, block synthesis, then block release.",
    relatedConcepts: ["hyperthyroidism", "atrial fibrillation", "sepsis", "adrenal insufficiency"],
    guidelineReferences: ["American Thyroid Association thyrotoxicosis guidance"]
  },
  {
    id: "im-adrenal-insufficiency",
    topic: "Adrenal insufficiency",
    domain: "Internal Medicine",
    schema: "Cortisol deficiency causing fatigue, hypotension, hyponatremia, and crisis under stress.",
    questionArchetypes: ["Diagnosis", "Initial management", "Mechanism/pathophysiology", "Risk factor"],
    pivotClues: ["hypotension", "hyponatremia", "hyperkalemia", "hyperpigmentation", "chronic steroid withdrawal"],
    supportingClues: ["fatigue", "weight loss", "abdominal pain", "hypoglycemia", "eosinophilia"],
    contextualClues: ["autoimmune disease", "pituitary disease", "long-term glucocorticoids", "critical illness"],
    commonTraps: ["waiting for confirmatory testing in adrenal crisis", "missing secondary adrenal insufficiency without hyperkalemia", "giving thyroid hormone before steroids in combined deficiency"],
    primaryDiscriminators: ["hyperkalemia and hyperpigmentation support primary adrenal insufficiency", "shock with risk factors requires stress-dose steroids"],
    secondaryDiscriminators: ["SIADH causes hyponatremia without cortisol deficiency pattern", "sepsis may coexist with adrenal crisis"],
    managementRules: ["give stress-dose hydrocortisone immediately in adrenal crisis", "draw cortisol/ACTH if feasible without delaying treatment", "replace mineralocorticoid for primary chronic disease"],
    contraindications: ["avoid delaying steroids in unstable suspected adrenal crisis"],
    nextTimeRule: "If adrenal crisis is possible and the patient is unstable, treat first and confirm after.",
    relatedConcepts: ["thyroid storm", "DKA/HHS", "hyponatremia", "shock"],
    guidelineReferences: ["Endocrine Society adrenal insufficiency guideline"]
  },
  {
    id: "im-cirrhosis-complications",
    topic: "Cirrhosis complications",
    domain: "Internal Medicine",
    schema: "Portal hypertension and impaired hepatic function producing ascites, variceal bleeding, encephalopathy, or infection.",
    questionArchetypes: ["Diagnosis", "Initial management", "Complication", "Screening/prevention"],
    pivotClues: ["ascites", "variceal bleeding", "hepatic encephalopathy", "spontaneous bacterial peritonitis", "portal hypertension"],
    supportingClues: ["thrombocytopenia", "splenomegaly", "jaundice", "asterixis", "low albumin"],
    contextualClues: ["alcohol-associated liver disease", "viral hepatitis", "NASH", "hepatocellular carcinoma risk"],
    commonTraps: ["missing diagnostic paracentesis for new ascites", "forgetting antibiotics in variceal bleeding", "attributing encephalopathy to intoxication alone"],
    primaryDiscriminators: ["new ascites requires diagnostic paracentesis", "variceal bleed requires vasoactive therapy plus antibiotics and endoscopy"],
    secondaryDiscriminators: ["hepatorenal syndrome is renal failure in advanced cirrhosis after excluding other causes", "SBP can occur without dramatic abdominal findings"],
    managementRules: ["perform diagnostic paracentesis for new or hospitalized ascites", "treat SBP with antibiotics and albumin when indicated", "manage variceal bleeding with resuscitation, vasoactive medication, antibiotics, and endoscopy", "treat encephalopathy by reducing ammonia burden and triggers"],
    contraindications: ["avoid nephrotoxins and unnecessary sedatives in decompensated cirrhosis"],
    nextTimeRule: "In cirrhosis, identify the complication first; ascites, bleeding, infection, and encephalopathy have different first moves.",
    relatedConcepts: ["GI bleed", "AKI", "sepsis", "hepatorenal syndrome", "hepatocellular carcinoma"],
    guidelineReferences: ["AASLD cirrhosis practice guidance", "EASL decompensated cirrhosis guidance"]
  },
  {
    id: "im-aki",
    topic: "AKI",
    domain: "Internal Medicine",
    schema: "Acute decline in kidney filtration from prerenal, intrinsic, or postrenal causes.",
    questionArchetypes: ["Diagnosis", "Initial management", "Mechanism/pathophysiology", "Complication"],
    pivotClues: ["rising creatinine", "oliguria", "volume depletion", "muddy brown casts", "hydronephrosis"],
    supportingClues: ["BUN/creatinine ratio", "urine sodium", "fractional excretion clues", "nephrotoxin exposure"],
    contextualClues: ["sepsis", "NSAID use", "contrast exposure", "obstruction risk"],
    commonTraps: ["giving fluids to obstructive or overloaded AKI without reassessment", "missing urgent dialysis indications", "over-relying on FENa in diuretic use"],
    primaryDiscriminators: ["volume status and urine sediment separate prerenal from intrinsic causes", "hydronephrosis or retention points to postrenal obstruction"],
    secondaryDiscriminators: ["ATN shows granular casts", "AIN suggests drug exposure with allergic features"],
    managementRules: ["assess volume status and stop nephrotoxins", "treat obstruction urgently when present", "dialyze for refractory life-threatening complications"],
    contraindications: ["avoid nephrotoxins and contrast when safer alternatives exist"],
    nextTimeRule: "Classify AKI by prerenal, intrinsic, or postrenal before choosing fluids, obstruction relief, or dialysis.",
    relatedConcepts: ["CKD", "hyperkalemia", "sepsis", "cirrhosis complications"],
    guidelineReferences: ["KDIGO acute kidney injury guideline"]
  },
  {
    id: "im-ckd",
    topic: "CKD",
    domain: "Internal Medicine",
    schema: "Chronic kidney damage or reduced GFR with complications of mineral, electrolyte, acid-base, and hematologic balance.",
    questionArchetypes: ["Diagnosis", "Screening/prevention", "Complication", "Prognosis/counseling"],
    pivotClues: ["reduced eGFR for at least 3 months", "albuminuria", "small echogenic kidneys", "secondary hyperparathyroidism"],
    supportingClues: ["anemia", "hyperphosphatemia", "metabolic acidosis", "hypertension"],
    contextualClues: ["diabetes", "hypertension", "polycystic kidney disease", "recurrent AKI"],
    commonTraps: ["calling acute creatinine rise CKD without chronicity", "missing albuminuria risk stratification", "ignoring medication dose adjustment"],
    primaryDiscriminators: ["duration separates CKD from AKI", "albuminuria adds risk beyond eGFR"],
    secondaryDiscriminators: ["kidney size helps chronicity", "active urine sediment may suggest glomerulonephritis"],
    managementRules: ["treat blood pressure and albuminuria risk", "adjust medication doses", "manage anemia, bone-mineral disease, acidosis, and electrolyte issues", "plan kidney replacement education when advanced"],
    contraindications: ["avoid nephrotoxins and inappropriate medication doses for GFR"],
    nextTimeRule: "CKD requires chronicity plus staging by eGFR and albuminuria.",
    relatedConcepts: ["AKI", "diabetic kidney disease", "nephritic/nephrotic syndrome", "anemia workup"],
    guidelineReferences: ["KDIGO chronic kidney disease guideline"]
  },
  {
    id: "im-nephritic-nephrotic",
    topic: "Nephritic/nephrotic syndrome",
    domain: "Internal Medicine",
    schema: "Glomerular disease pattern distinguished by inflammatory hematuria versus heavy proteinuria and edema.",
    questionArchetypes: ["Diagnosis", "Mechanism/pathophysiology", "Complication"],
    pivotClues: ["red blood cell casts", "dysmorphic RBCs", "heavy proteinuria", "edema", "hypoalbuminemia"],
    supportingClues: ["hypertension", "low complement", "lipiduria", "recent infection", "systemic autoimmune findings"],
    contextualClues: ["diabetes", "lupus", "hepatitis", "streptococcal infection", "malignancy"],
    commonTraps: ["confusing nephritic hematuria with nephrotic protein loss", "missing rapidly progressive glomerulonephritis", "forgetting thrombosis risk in nephrotic syndrome"],
    primaryDiscriminators: ["RBC casts and hematuria indicate nephritic pattern", "massive proteinuria and hypoalbuminemia indicate nephrotic pattern"],
    secondaryDiscriminators: ["low complement narrows immune-complex causes", "diabetes is a common nephrotic cause"],
    managementRules: ["identify nephritic versus nephrotic pattern", "evaluate renal function and urine sediment", "refer urgent rapidly progressive presentations", "treat cause and complications"],
    contraindications: ["avoid delaying evaluation when rapidly progressive kidney injury is present"],
    nextTimeRule: "Urine sediment decides the lane: inflammatory blood casts versus protein-loss edema.",
    relatedConcepts: ["AKI", "CKD", "lupus nephritis", "diabetic kidney disease"],
    guidelineReferences: ["KDIGO glomerular diseases guideline"]
  },
  {
    id: "im-anemia-workup",
    topic: "Anemia workup",
    domain: "Internal Medicine",
    schema: "Low hemoglobin classified by MCV, reticulocyte response, iron studies, hemolysis markers, and bleeding risk.",
    questionArchetypes: ["Diagnosis", "Mechanism/pathophysiology", "Risk factor", "Screening/prevention"],
    pivotClues: ["microcytosis", "macrocytosis", "reticulocyte count", "ferritin", "hemolysis labs"],
    supportingClues: ["fatigue", "pallor", "menstrual bleeding", "GI symptoms", "neurologic findings"],
    contextualClues: ["chronic kidney disease", "alcohol use", "vegetarian diet", "colon cancer risk", "inflammatory disease"],
    commonTraps: ["treating iron deficiency without searching for bleeding in appropriate adults", "missing B12 neurologic findings", "ignoring reticulocyte response"],
    primaryDiscriminators: ["MCV starts classification", "reticulocyte count distinguishes underproduction from loss or destruction"],
    secondaryDiscriminators: ["low ferritin supports iron deficiency", "high LDH and indirect bilirubin suggest hemolysis"],
    managementRules: ["classify by MCV and reticulocytes", "use iron studies for microcytosis", "evaluate occult blood loss when indicated", "replace the deficient nutrient and treat cause"],
    contraindications: ["avoid folate-only treatment when B12 deficiency is possible with neurologic signs"],
    nextTimeRule: "Do not memorize anemia lists; start with MCV, then reticulocytes, then targeted confirmatory tests.",
    relatedConcepts: ["GI bleed", "CKD", "hemolysis", "colon cancer screening"],
    guidelineReferences: ["ASH anemia educational guidance", "ACG iron deficiency anemia guidance"]
  },
  {
    id: "im-gi-bleed",
    topic: "GI bleed",
    domain: "Internal Medicine",
    schema: "Overt or occult gastrointestinal bleeding requiring localization, resuscitation, and targeted endoscopic or medical therapy.",
    questionArchetypes: ["Diagnosis", "Initial management", "Definitive management", "Complication"],
    pivotClues: ["hematemesis", "melena", "hematochezia", "hemodynamic instability", "cirrhosis with varices"],
    supportingClues: ["NSAID use", "anticoagulation", "syncope", "iron deficiency", "elevated BUN"],
    contextualClues: ["peptic ulcer disease", "portal hypertension", "diverticulosis", "colon cancer risk"],
    commonTraps: ["scoping before resuscitation in unstable bleeding", "missing variceal-bleed antibiotics", "assuming hematochezia is always lower GI bleeding"],
    primaryDiscriminators: ["instability makes resuscitation the first step", "cirrhosis shifts management toward variceal protocol"],
    secondaryDiscriminators: ["melena often indicates upper GI source", "brisk upper bleeding can cause hematochezia"],
    managementRules: ["stabilize airway, breathing, and circulation", "restore perfusion and blood volume when needed", "use endoscopy based on suspected source and stability", "add vasoactive therapy and antibiotics for suspected variceal bleeding"],
    contraindications: ["avoid delaying resuscitation for diagnostic procedures in unstable patients"],
    nextTimeRule: "For GI bleed, stability comes before source localization.",
    relatedConcepts: ["cirrhosis complications", "anemia workup", "sepsis", "coagulopathy"],
    guidelineReferences: ["ACG upper GI bleeding guideline", "AASLD portal hypertensive bleeding guidance"]
  },
  {
    id: "im-sepsis",
    topic: "Sepsis",
    domain: "Internal Medicine",
    schema: "Life-threatening organ dysfunction from infection requiring rapid recognition, cultures, antimicrobials, fluids, and source control.",
    questionArchetypes: ["Diagnosis", "Initial management", "Complication", "Prognosis/counseling"],
    pivotClues: ["suspected infection", "hypotension", "elevated lactate", "organ dysfunction", "altered mental status"],
    supportingClues: ["fever or hypothermia", "tachycardia", "tachypnea", "leukocytosis", "oliguria"],
    contextualClues: ["pneumonia", "UTI", "intra-abdominal infection", "immunosuppression", "indwelling catheter"],
    commonTraps: ["waiting for cultures before antibiotics when unstable", "missing source control", "under-resuscitating septic shock"],
    primaryDiscriminators: ["infection plus organ dysfunction separates sepsis from uncomplicated infection", "persistent hypotension or high lactate signals shock physiology"],
    secondaryDiscriminators: ["cardiogenic shock may mimic hypotension but lacks infectious source", "adrenal crisis can mimic refractory shock"],
    managementRules: ["recognize organ dysfunction early", "obtain cultures when feasible without delaying antibiotics", "give broad empiric antimicrobials promptly", "resuscitate shock and pursue source control"],
    contraindications: ["avoid delaying antibiotics in unstable suspected sepsis"],
    nextTimeRule: "In sepsis, antibiotics and perfusion restoration are time-sensitive; do not wait for a perfect source label.",
    relatedConcepts: ["pneumonia", "GI bleed", "adrenal insufficiency", "AKI", "infective endocarditis"],
    guidelineReferences: ["Surviving Sepsis Campaign guidelines"]
  },
  {
    id: "im-infective-endocarditis",
    topic: "Infective endocarditis",
    domain: "Internal Medicine",
    schema: "Endovascular infection of valves or cardiac devices causing bacteremia, embolic phenomena, murmur, or heart failure.",
    questionArchetypes: ["Diagnosis", "Initial management", "Complication", "Risk factor"],
    pivotClues: ["persistent bacteremia", "new murmur", "IV drug use", "prosthetic valve", "embolic lesions"],
    supportingClues: ["fever", "positive blood cultures", "splinter hemorrhages", "Janeway lesions", "Osler nodes"],
    contextualClues: ["hemodialysis", "cardiac device", "recent dental procedure in high-risk host", "Staphylococcus aureus bacteremia"],
    commonTraps: ["starting antibiotics before blood cultures in stable patients", "missing echo need in persistent bacteremia", "confusing benign flow murmur with infected valve in bacteremia"],
    primaryDiscriminators: ["persistent bacteremia plus valve findings points to endocarditis", "unstable sepsis still requires immediate treatment after cultures if feasible"],
    secondaryDiscriminators: ["right-sided disease is associated with injection drug use", "prosthetic valve disease changes organism and treatment concerns"],
    managementRules: ["obtain multiple blood cultures before antibiotics when stable", "perform echocardiography when suspected", "start pathogen-directed prolonged IV therapy", "evaluate surgical indications such as heart failure or uncontrolled infection"],
    contraindications: ["avoid delaying antibiotics in unstable sepsis solely to complete ideal culture timing"],
    nextTimeRule: "In suspected endocarditis, cultures come before antibiotics only if the patient is stable enough to wait.",
    relatedConcepts: ["sepsis", "valvular heart disease", "stroke", "glomerulonephritis"],
    guidelineReferences: ["AHA infective endocarditis scientific statement", "ESC infective endocarditis guideline"]
  }
];

export function internalMedicineSeedsAsClinicalSchemas(): ClinicalSchemaSeed[] {
  return internalMedicineTopicSeeds.map((seed) => ({
    id: seed.id,
    name: seed.topic,
    category: seed.schema,
    clueTerms: [
      seed.topic,
      ...seed.pivotClues,
      ...seed.supportingClues,
      ...seed.contextualClues,
      ...seed.primaryDiscriminators,
      ...seed.managementRules
    ],
    expectedPivots: seed.pivotClues,
    commonConfusions: seed.commonTraps
  }));
}

export function getInternalMedicineTopicSeed(idOrTopic: string) {
  const normalized = idOrTopic.trim().toLowerCase();
  return internalMedicineTopicSeeds.find(
    (seed) => seed.id.toLowerCase() === normalized || seed.topic.toLowerCase() === normalized
  );
}
