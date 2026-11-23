# ADP Workforce Now (recruitment)

- **URLs:** `workforcenow.adp.com/mascsr/default/mdf/recruitment/recruitment.html?cid=<company uuid>` lists "Current Openings"; a posting adds `&jobId=<id>`. The page text is empty until the Angular app renders: take a screenshot or wait before reading.
- **Apply needs a one-time code.** Apply opens "Tell us about yourself" (first name, last name, email, mobile with +1). Continue sends a verification code to the email or phone and creates a candidate profile tied to them. That is the user's step: fill the four fields, leave the tab open, log a hand-off.
- Social sign-in (LinkedIn, Google, Facebook) is offered beside it: never use it.
- **Flow after the code:** Personal Information, Resume, Questions, Voluntary Self-ID, Review, Self-Attest & Submit. Questions are plain textareas (`#question_<n>`, type for real) plus Yes/No radios and searchable dropdowns. The last step is an electronic signature ("Yes, I agree to sign electronically") certifying the answers and authorizing background checks: that tick and Submit are the user's.
- One tenant (ACGME) asks a mandatory "I WILL / will NOT complete my Profile" dropdown about a post-submit candidate profile.
