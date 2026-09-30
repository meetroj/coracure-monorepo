Coracure Doctor App
Final Developer Change Requirements
Consolidated UI/UX and functional changes for doctor and non-doctor healthcare professionals
Implementation principle
Use one provider app, but show profession-appropriate consultation documentation based on provider type.
Doctor workflow: Clinical Notes & Diagnosis + Prescription.
Non-doctor workflow: Assessment & Care Plan + Care Plan.

1. Provider Registration / Onboarding
The registration flow should remain simple and provider-category aware. Avoid collecting unnecessary qualification details. Fields should be usable for doctors, dentists, veterinary professionals, psychologists, physiotherapists and other approved healthcare professionals.
1.1 Basic Details
Field	Requirement / UI behavior
Profile Photo	Single-image upload only. Show preview with Replace / Remove.
Full Name	Mandatory.
Date of Birth	Mandatory.
Gender	Mandatory.
Mobile Number	Mandatory; OTP verified.
Email Address	Mandatory; verified.
Languages for Consultation	Mandatory; multi-select.

1.2 Proof of Identity
Field	Requirement
Government ID Type	Mandatory.
Government ID Number	Mandatory.
Government ID Document	Mandatory upload.
ABHA ID / ABHA Address	Optional; must not block registration.

1.3 Professional Qualifications
Do not create separate detailed records for each qualification. Keep only four qualification fields. Basic Qualification is mandatory; the remaining fields are optional free-text fields.
Field	Input type	Example / placeholder
Basic Qualification *	Mandatory free-text input	e.g. MBBS / BDS / B.Sc. Veterinary / BPT / M.Phil Clinical Psychology
PG Specialisation	Optional free-text input	e.g. MD Dermatology / MPT Orthopaedics / M.Phil Clinical Psychology
Super Specialisation	Optional free-text input	e.g. DM Endocrinology
Fellowship	Optional free-text input	e.g. Fellowship in Diabetology

Qualification document uploads
Provide only two upload controls for the entire qualification section:
•	Upload Degree Certificate
•	Upload Registration Certificate
Do not add separate certificate uploads under Basic Qualification, PG Specialisation, Super Specialisation or Fellowship. Do not ask for college, university, year of passing or institution details in this section.
Patient-facing qualification display
Show only the entered qualification names, for example: MBBS · MD Dermatology · DM Endocrinology.
Degree and registration certificates must remain private and be used only for verification.

2. Experience Details
Keep experience entry simple. For each experience entry collect only the following:
Field	Requirement
Designation	Mandatory.
Name of Institute	Mandatory.
Years of Experience	Mandatory.
Upload Experience Certificate	Mandatory upload.

Allow “+ Add Another Experience” if multiple experience entries are required.
Patient-facing experience display
Display only total years of experience, for example: 8 Years of Experience.
Do not show institution-wise experience, designation history or experience certificates to patients.

3. Digital Signature
•	Add a dedicated Upload Signature for Prescription option.
•	Accept JPG / PNG; transparent-background PNG preferred where available.
•	Show preview before saving and allow Replace / Remove.
•	Keep signature private and automatically place the approved signature on generated doctor prescriptions.
4. Registration Submission Notification
•	After registration submission, send confirmation to the provider.
•	Notify Coracure admin that a new provider profile is ready for verification.
•	Show registration status: Profile Incomplete → Submitted → Under Review → Approved / Changes Required.
5. Consultation Screen – Common Changes
5.1 No Show – Query for Developer
Do not modify or define the No Show workflow yet. Ask the developer to explain the current functionality:
•	When is No Show triggered?
•	Is it marked manually or automatically?
•	What waiting period or condition is currently used?
•	What happens to appointment status, payment and consultation records after it is marked No Show?
5.2 Replace “Intake Summary”
Replace the label “Intake Summary” with:
Any Previous History
Display relevant previous history already provided by the patient.

5.3 Medication History
Add a separate Medication History section for current or previous medication information provided by the patient.
5.4 Medical Reports
Add a separate Medical Reports section so the consulting professional can view reports already uploaded for the consultation.
5.5 Upload Documents
Add an Upload Documents option with the helper text:
Upload Documents
Upload reports or clinical photos relevant to this consultation.

Supported content can include laboratory reports, imaging, previous prescriptions, discharge summaries, referral documents and clinical photographs.
5.6 Consultation Duration
Display and retain consultation duration once the consultation starts. The timer should stop when the consultation is ended.
6. Doctor Consultation Documentation
For medical doctors, retain a doctor-specific clinical workflow. Avoid duplicate data entry between Clinical Notes & Diagnosis and Prescription.
6.1 Clinical Notes & Diagnosis – Doctors
Field	Purpose
Chief Complaint	Main presenting complaint.
Brief Clinical History	Concise history relevant to the current complaint.
Observations	Doctor’s teleconsultation observations / clinical findings.
Provisional Diagnosis	Working diagnosis entered by the doctor.

6.2 Prescription – Doctors
When the doctor opens Prescription, do not ask them to re-enter Chief Complaint or Provisional Diagnosis. These should be auto-fetched from Clinical Notes & Diagnosis and included in the generated prescription.
The doctor should directly enter only:
1.	Medications
2.	Advice & Instructions
3.	Warning Signs
4.	History of Allergies
Generated prescription should contain
Chief Complaint — auto-fetched
Provisional Diagnosis — auto-fetched
Medications
Advice & Instructions
Warning Signs
History of Allergies
Approved doctor signature

6.3 Case Summary – Doctors
Retain Case Summary as an auto-generated section. The doctor should not need to rewrite the case. Generate it from the consultation data, including chief complaint, relevant history, observations, provisional diagnosis and key treatment/advice.
7. Non-Doctor Consultation Documentation
For psychologists, physiotherapists, dietitians, occupational therapists and other approved non-doctor professionals, replace doctor-centric terminology with a profession-neutral Assessment & Care Plan workflow.
7.1 Assessment & Care Plan – Non-Doctors
Field	Purpose
Presenting Concern	Primary reason for consultation in profession-neutral language.
Relevant History	Relevant background, previous therapy/treatment, functional or lifestyle history as applicable.
Assessment / Observations	Single combined field for professional findings and observations. Do not add a separate Professional Assessment field.

7.2 Care Plan – Non-Doctors
The Care Plan replaces Prescription for non-doctor professionals. Keep it deliberately simple and applicable across professions.
Field	Purpose
Recommendations / Interventions	Profession-specific recommendations or interventions to be shared with the patient.
Precautions & Warning Signs	Important precautions and situations in which the patient should seek further/urgent medical assessment where appropriate.

Do not include separate fields for Recommended Actions, Exercises / Activities, Advice & Instructions, or Relevant Medical Considerations in the common non-doctor Care Plan.
7.3 Case Summary – Non-Doctors
Retain an auto-generated Case Summary for non-doctors as well. Generate it from Presenting Concern, Relevant History, Assessment / Observations and the Care Plan.
8. Final Doctor vs Non-Doctor Structure
Doctors	Non-Doctors
Clinical Notes & Diagnosis	Assessment & Care Plan
Chief Complaint	Presenting Concern
Brief Clinical History	Relevant History
Observations	Assessment / Observations
Provisional Diagnosis	—
Prescription	Care Plan
Medications	Recommendations / Interventions
Advice & Instructions	Precautions & Warning Signs
Warning Signs	—
History of Allergies	—
Case Summary – Auto-generated	Case Summary – Auto-generated

9. Case Detail Screen Changes
•	Use provider-neutral label “Consulting Professional” instead of “Treating Doctor” where the same screen is shared by all provider types.
•	Remove the unnecessary visible “Record” card/field unless required only as an internal backend identifier.
•	Fix persistence/display so saved Clinical Notes & Diagnosis or Assessment & Care Plan information is visible correctly in the case.
•	Retain Case Summary, but make it auto-generated rather than manually entered.
•	Remove standalone Follow-up Plan from Case Details if follow-up is already handled through Coracure’s separate post-consultation follow-up workflow.
•	Keep Clarification Thread if required for expert discussion.
•	Keep Recommended Resources; content can vary according to provider type.
•	Rename Patient Documents to “Patient Reports & Documents” where suitable.
10. Patient-Facing Provider Profile
Display only concise information useful to patients. Do not expose verification or employment documents.
Show to patient	Do not show
Provider name and profile photo	Government ID
Specialty / professional category	Degree / registration certificates
Qualification names	Institution-wise experience details
Total years of experience	Experience certificates
Consultation languages	DOB, mobile number, email
Consultation fee and availability	Internal verification information

11. Consultation Settings
Setting	Requirement
Consultation Fee	Editable fee field according to platform business rules.
Consultation Days	Select available days of the week.
Consultation Timings	Allow one or more time windows for each selected day.

12. Consolidated Developer Action List
•	Make profile photo a single-image upload only.
•	Add Languages for Consultation under Basic Details.
•	Add optional ABHA ID / ABHA Address under Proof of Identity.
•	Make Basic Qualification a mandatory free-text field with example placeholder such as MBBS.
•	Keep PG Specialisation, Super Specialisation and Fellowship as optional free-text fields with examples.
•	Under Qualifications, provide only two uploads: Degree Certificate and Registration Certificate.
•	Do not collect institution, university, year of passing or separate certificate uploads for each qualification.
•	Experience Details: Designation, Name of Institute, Years of Experience, Upload Experience Certificate.
•	Patient-facing experience: show only total years of experience.
•	Add prescription Digital Signature upload for doctors.
•	Send provider confirmation and admin notification after registration submission.
•	Keep No Show as a query for the developer until current logic is explained.
•	Replace Intake Summary with Any Previous History.
•	Add Medication History.
•	Add Medical Reports.
•	Add Upload Documents with helper text: Upload reports or clinical photos relevant to this consultation.
•	Keep consultation duration visible/recorded.
•	For doctors use Clinical Notes & Diagnosis: Chief Complaint, Brief Clinical History, Observations, Provisional Diagnosis.
•	For doctor Prescription, jump directly to Medications, Advice & Instructions, Warning Signs and History of Allergies; auto-fetch Chief Complaint and Provisional Diagnosis.
•	For non-doctors use Assessment & Care Plan: Presenting Concern, Relevant History, Assessment / Observations.
•	For non-doctor Care Plan use only Recommendations / Interventions and Precautions & Warning Signs.
•	Do not create a separate Professional Assessment field for non-doctors.
•	Do not add Recommended Actions, Exercises / Activities, Advice & Instructions or Relevant Medical Considerations to the common non-doctor Care Plan.
•	Retain Case Summary as auto-generated for both doctors and non-doctors.
•	Use Consulting Professional as a shared provider-neutral label where applicable.
•	Remove unnecessary visible Record field/card from Case Details.
•	Fix persistence/display of consultation documentation.
•	Remove standalone Follow-up Plan from Case Details if already handled elsewhere.
•	Rename Patient Documents to Patient Reports & Documents where appropriate.
•	Add Consultation Settings for Fee, Days and Timings.
