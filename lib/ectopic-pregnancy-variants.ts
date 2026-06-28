import type { RapidRoundsCase } from "./rapidrounds-case";

const scriptId = "ectopic_pregnancy";
const topic = "Ectopic pregnancy";
const domain = "obgyn";
const canonicalProblem = "First-trimester bleeding and abdominal or pelvic pain";

export const ectopicPregnancyVariants: RapidRoundsCase[] = [
  {
    id: "rr-ectopic-pregnancy-recognition",
    scriptId,
    domain,
    topic,
    canonicalProblem,
    variantType: "recognition",
    difficulty: 1,
    vignette:
      "A 27-year-old G1P0 at 7 weeks by last menstrual period has light vaginal bleeding and unilateral pelvic pain. She feels well. Transvaginal ultrasound does not show an intrauterine pregnancy.",
    answerPrompt: "What illness script should this presentation make you recognize?",
    acceptedAnswers: ["ectopic pregnancy", "tubal ectopic pregnancy", "pregnancy of unknown location concerning for ectopic pregnancy"],
    pivotClues: ["No intrauterine pregnancy with unilateral pelvic pain"],
    supportingClues: ["positive pregnancy test", "first-trimester bleeding"],
    distractorClues: ["feels well"],
    correctReasoning:
      "First-trimester bleeding with unilateral pelvic pain and no intrauterine pregnancy should immediately trigger the ectopic pregnancy illness script.",
    commonWrongReasoning: [
      "Calling this threatened abortion before an intrauterine pregnancy has been confirmed.",
      "Letting stable vital signs falsely reassure you away from ectopic pregnancy."
    ],
    decisionBoundary: [
      {
        confusedWith: "threatened abortion",
        howToDistinguish:
          "Threatened abortion requires a confirmed intrauterine pregnancy with a closed cervix; no intrauterine pregnancy plus unilateral pain keeps ectopic pregnancy high-risk."
      }
    ],
    teachMeMore:
      "Pregnant patient in the first trimester with bleeding plus abdominal or pelvic pain. The dangerous retrieval is ectopic pregnancy until an intrauterine pregnancy is established. Stability changes management, not the need to recognize the script."
  },
  {
    id: "rr-ectopic-pregnancy-diagnosis",
    scriptId,
    domain,
    topic,
    canonicalProblem,
    variantType: "diagnosis",
    difficulty: 2,
    vignette:
      "A 30-year-old with 6 weeks of amenorrhea has spotting and sharp left pelvic pain. Serum beta-hCG is 2800 mIU/mL. Transvaginal ultrasound shows an empty uterus and a left adnexal mass.",
    answerPrompt: "What is the most likely diagnosis?",
    acceptedAnswers: ["ectopic pregnancy", "tubal ectopic pregnancy", "left tubal ectopic pregnancy"],
    pivotClues: ["Adnexal mass with empty uterus above the discriminatory zone"],
    supportingClues: ["amenorrhea", "spotting", "unilateral pelvic pain"],
    distractorClues: ["first pregnancy"],
    correctReasoning:
      "An adnexal mass with an empty uterus when beta-hCG is above the discriminatory zone establishes ectopic pregnancy.",
    commonWrongReasoning: [
      "Choosing spontaneous abortion from bleeding alone.",
      "Ignoring the adnexal mass because the patient is not unstable."
    ],
    decisionBoundary: [
      {
        confusedWith: "spontaneous abortion",
        howToDistinguish:
          "Spontaneous abortion is an intrauterine pregnancy loss pattern; an adnexal mass with no intrauterine pregnancy points to ectopic pregnancy."
      }
    ],
    teachMeMore:
      "Ectopic pregnancy becomes a diagnosis when pregnancy is present but the uterus is empty and adnexal evidence appears. The board discriminator is not pain alone; it is extrauterine localization or failure to visualize an intrauterine pregnancy when beta-hCG should be high enough."
  },
  {
    id: "rr-ectopic-pregnancy-next-best-step",
    scriptId,
    domain,
    topic,
    canonicalProblem,
    variantType: "next_best_step",
    difficulty: 2,
    vignette:
      "A 24-year-old at 6 weeks' gestation has mild pelvic pain and spotting. Vital signs are normal. Urine pregnancy test is positive. No ultrasound has been performed.",
    answerPrompt: "What is the next best step?",
    acceptedAnswers: ["transvaginal ultrasound", "pelvic ultrasound", "transvaginal ultrasonography"],
    pivotClues: ["Positive pregnancy test with pain and bleeding before pregnancy location is known"],
    supportingClues: ["stable vital signs", "first trimester"],
    distractorClues: ["mild symptoms"],
    correctReasoning:
      "A stable patient with early pregnancy pain and bleeding needs transvaginal ultrasound to locate the pregnancy.",
    commonWrongReasoning: [
      "Treating before confirming the pregnancy location.",
      "Reassuring the patient because symptoms are mild."
    ],
    decisionBoundary: [
      {
        confusedWith: "methotrexate",
        howToDistinguish:
          "Methotrexate is used after ectopic pregnancy is diagnosed and eligibility is confirmed; the first step here is locating the pregnancy."
      }
    ],
    teachMeMore:
      "When pregnancy location is unknown, first locate it. In a stable patient, transvaginal ultrasound is the immediate diagnostic step; management follows once intrauterine versus ectopic location is clarified."
  },
  {
    id: "rr-ectopic-pregnancy-stable-management",
    scriptId,
    domain,
    topic,
    canonicalProblem,
    variantType: "stable_management",
    difficulty: 2,
    vignette:
      "A stable 29-year-old has a 2.5-cm tubal ectopic pregnancy, beta-hCG 1800 mIU/mL, no fetal cardiac activity, normal liver and renal tests, and reliable follow-up.",
    answerPrompt: "What is the most appropriate management?",
    acceptedAnswers: ["methotrexate", "medical management with methotrexate", "single-dose methotrexate"],
    pivotClues: ["Stable unruptured ectopic pregnancy with reliable follow-up"],
    supportingClues: ["low beta-hCG", "no fetal cardiac activity", "normal liver and renal tests"],
    distractorClues: ["tubal ectopic pregnancy"],
    correctReasoning:
      "Stable, unruptured ectopic pregnancy with low beta-hCG and reliable follow-up can be treated medically with methotrexate.",
    commonWrongReasoning: [
      "Assuming every ectopic pregnancy requires immediate surgery.",
      "Forgetting that methotrexate requires stability and follow-up."
    ],
    decisionBoundary: [
      {
        confusedWith: "surgery",
        howToDistinguish:
          "Surgery becomes the answer when the patient is unstable, rupture is suspected, follow-up is unreliable, or methotrexate criteria are not met."
      }
    ],
    teachMeMore:
      "Stable ectopic management asks whether the patient is a methotrexate candidate. Low burden disease, no fetal cardiac activity, normal labs, and reliable follow-up support medical therapy."
  },
  {
    id: "rr-ectopic-pregnancy-unstable-management",
    scriptId,
    domain,
    topic,
    canonicalProblem,
    variantType: "unstable_management",
    difficulty: 2,
    vignette:
      "A 31-year-old with a positive pregnancy test has sudden severe pelvic pain, shoulder pain, BP 82/48, pulse 128, and peritoneal signs. Bedside ultrasound shows free intraperitoneal fluid.",
    answerPrompt: "What is the immediate next step?",
    acceptedAnswers: ["emergent surgical management", "emergent laparoscopy", "emergency laparotomy", "surgical management"],
    pivotClues: ["Hemodynamic instability with free intraperitoneal fluid"],
    supportingClues: ["positive pregnancy test", "severe pelvic pain", "peritoneal signs"],
    distractorClues: ["bedside ultrasound performed"],
    correctReasoning:
      "Unstable suspected ruptured ectopic pregnancy requires immediate operative management after resuscitation is started.",
    commonWrongReasoning: [
      "Ordering confirmatory testing despite shock.",
      "Choosing methotrexate because ectopic pregnancy is recognized."
    ],
    decisionBoundary: [
      {
        confusedWith: "methotrexate",
        howToDistinguish:
          "Methotrexate belongs to stable, unruptured ectopic pregnancy; shock or peritoneal signs makes surgery the immediate decision."
      }
    ],
    teachMeMore:
      "In ectopic pregnancy, instability overrides slower diagnostic refinement. Hypotension, tachycardia, peritoneal signs, or hemoperitoneum means presumed rupture and urgent surgical management."
  },
  {
    id: "rr-ectopic-pregnancy-methotrexate-eligibility",
    scriptId,
    domain,
    topic,
    canonicalProblem,
    variantType: "methotrexate_eligibility",
    difficulty: 3,
    vignette:
      "A stable patient with ectopic pregnancy asks about avoiding surgery. She has chronic liver disease and cannot return for serial beta-hCG monitoring.",
    answerPrompt: "What feature makes methotrexate inappropriate here?",
    acceptedAnswers: ["chronic liver disease and unreliable follow-up", "liver disease", "unreliable follow-up", "cannot return for follow-up"],
    pivotClues: ["Chronic liver disease and inability to return for serial follow-up"],
    supportingClues: ["stable ectopic pregnancy", "desires nonsurgical treatment"],
    distractorClues: ["wants to avoid surgery"],
    correctReasoning:
      "Methotrexate requires safe medication use and reliable follow-up; liver disease and inability to monitor beta-hCG make it inappropriate.",
    commonWrongReasoning: [
      "Treating stability as the only methotrexate criterion.",
      "Forgetting that medical management requires follow-up until beta-hCG resolves."
    ],
    decisionBoundary: [
      {
        confusedWith: "methotrexate",
        howToDistinguish:
          "Methotrexate becomes appropriate only when the patient is stable, has no contraindication, and can complete serial follow-up."
      }
    ],
    teachMeMore:
      "Methotrexate eligibility is a safety screen, not just a diagnosis. Check stability, rupture risk, fetal cardiac activity, beta-hCG burden, medication contraindications, and ability to follow serial beta-hCG."
  },
  {
    id: "rr-ectopic-pregnancy-rhogam-indication",
    scriptId,
    domain,
    topic,
    canonicalProblem,
    variantType: "rhogam_indication",
    difficulty: 2,
    vignette:
      "A 26-year-old Rh-negative, unsensitized patient is diagnosed with ectopic pregnancy after first-trimester bleeding. She is otherwise stable.",
    answerPrompt: "What additional treatment is indicated?",
    acceptedAnswers: ["rh immune globulin", "rho(d) immune globulin", "rhogam", "anti-d immune globulin"],
    pivotClues: ["Rh-negative unsensitized pregnancy bleeding"],
    supportingClues: ["ectopic pregnancy", "first-trimester bleeding"],
    distractorClues: ["stable vital signs"],
    correctReasoning:
      "Rh-negative unsensitized patients with pregnancy bleeding, including ectopic pregnancy, should receive Rh immune globulin.",
    commonWrongReasoning: [
      "Focusing only on ectopic management and missing alloimmunization prevention.",
      "Withholding Rh immune globulin because the pregnancy is ectopic."
    ],
    decisionBoundary: [
      {
        confusedWith: "observation only",
        howToDistinguish:
          "Observation alone is reasonable only when the RhIG indication is absent; Rh-negative unsensitized bleeding creates a prevention decision."
      }
    ],
    teachMeMore:
      "Ectopic pregnancy can also test prevention. Any pregnancy bleeding in an unsensitized Rh-negative patient should trigger Rh immune globulin to reduce alloimmunization risk."
  },
  {
    id: "rr-ectopic-pregnancy-differential-boundary",
    scriptId,
    domain,
    topic,
    canonicalProblem,
    variantType: "differential_boundary",
    difficulty: 3,
    vignette:
      "A 22-year-old at 8 weeks has vaginal spotting and mild cramping. Cervix is closed. Ultrasound shows a viable intrauterine pregnancy. She has no adnexal mass.",
    answerPrompt: "Which diagnosis is supported instead of ectopic pregnancy?",
    acceptedAnswers: ["threatened abortion", "threatened miscarriage"],
    pivotClues: ["Viable intrauterine pregnancy with closed cervix"],
    supportingClues: ["first-trimester bleeding", "mild cramping"],
    distractorClues: ["pelvic discomfort"],
    correctReasoning:
      "A confirmed viable intrauterine pregnancy with a closed cervix supports threatened abortion rather than ectopic pregnancy.",
    commonWrongReasoning: [
      "Overgeneralizing first-trimester bleeding and pain to ectopic pregnancy.",
      "Ignoring the intrauterine pregnancy that resolves the location question."
    ],
    decisionBoundary: [
      {
        confusedWith: "ectopic pregnancy",
        howToDistinguish:
          "Ectopic pregnancy remains likely when pregnancy location is unknown or extrauterine; a viable intrauterine pregnancy with closed cervix points to threatened abortion."
      }
    ],
    teachMeMore:
      "The ectopic boundary closes once a viable intrauterine pregnancy is seen. With bleeding, closed cervix, and fetal cardiac activity, the correct illness script is threatened abortion."
  },
  {
    id: "rr-ectopic-pregnancy-lab-interpretation",
    scriptId,
    domain,
    topic,
    canonicalProblem,
    variantType: "lab_interpretation",
    difficulty: 3,
    vignette:
      "A patient with a positive pregnancy test has pelvic pain and spotting. Beta-hCG is 2600 mIU/mL. Transvaginal ultrasound shows no intrauterine pregnancy.",
    answerPrompt: "How should these results be interpreted?",
    acceptedAnswers: ["pregnancy of unknown location concerning for ectopic pregnancy", "ectopic pregnancy is suspected", "no intrauterine pregnancy above the discriminatory zone"],
    pivotClues: ["No intrauterine pregnancy when beta-hCG is above the discriminatory zone"],
    supportingClues: ["pelvic pain", "spotting", "positive pregnancy test"],
    distractorClues: ["no confirmed adnexal mass"],
    correctReasoning:
      "When beta-hCG is above the discriminatory zone, absence of an intrauterine pregnancy is concerning for ectopic pregnancy.",
    commonWrongReasoning: [
      "Calling the ultrasound nondiagnostic without using the beta-hCG level.",
      "Waiting for an adnexal mass before recognizing risk."
    ],
    decisionBoundary: [
      {
        confusedWith: "early normal intrauterine pregnancy",
        howToDistinguish:
          "A very early normal pregnancy can have no visible sac when beta-hCG is below the discriminatory zone; above it, an empty uterus is concerning."
      }
    ],
    teachMeMore:
      "Lab interpretation in ectopic pregnancy hinges on beta-hCG plus ultrasound. Above the discriminatory zone, a visible intrauterine pregnancy is expected; an empty uterus raises ectopic concern."
  },
  {
    id: "rr-ectopic-pregnancy-imaging-interpretation",
    scriptId,
    domain,
    topic,
    canonicalProblem,
    variantType: "imaging_interpretation",
    difficulty: 3,
    vignette:
      "A 28-year-old with first-trimester bleeding and right pelvic pain has transvaginal ultrasound showing an empty uterus, a complex right adnexal mass, and small free fluid.",
    answerPrompt: "What does the imaging most strongly suggest?",
    acceptedAnswers: ["ectopic pregnancy", "right tubal ectopic pregnancy", "tubal ectopic pregnancy"],
    pivotClues: ["Complex adnexal mass with empty uterus"],
    supportingClues: ["first-trimester bleeding", "right pelvic pain", "small free fluid"],
    distractorClues: ["small free fluid"],
    correctReasoning:
      "A complex adnexal mass with an empty uterus in a pregnant patient strongly suggests tubal ectopic pregnancy.",
    commonWrongReasoning: [
      "Attributing the adnexal mass to an incidental ovarian cyst.",
      "Focusing on free fluid instead of the extrauterine mass."
    ],
    decisionBoundary: [
      {
        confusedWith: "corpus luteum cyst",
        howToDistinguish:
          "A corpus luteum can be incidental, but an empty uterus plus pain, bleeding, and a complex adnexal mass should be treated as ectopic pregnancy."
      }
    ],
    teachMeMore:
      "Imaging variants ask whether the pregnancy is intrauterine or extrauterine. Empty uterus plus adnexal mass is the high-yield ectopic pattern; free fluid adds concern for bleeding or rupture."
  }
];
