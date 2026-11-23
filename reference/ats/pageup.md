# PageUp

- **URLs:** the employer's careers page (`careers.<co>.edu/jobs/<slug>`) shows a small "Apply Now" box (first name, last name, email). Its Apply button opens `secure.<dcN>.pageuppeople.com/apply/<tenant>/aw/applicationForm/initApplication.asp?lJobID=<id>`. No account or password: an email plus a "you have read our Privacy Statement" box starts the application, and every step saves on Continue.
- **Steps (one tenant, measured 18 Nov 2026):** Personal details, Document Uploads, General Information, Education, Voluntary Self-Identification (text only), Additional Questions (the employer's screeners), Veteran Status, Demographics, Disability Status, Agreement, Submit. The breadcrumb at the top ("Save and jump to") lists them all on the first page, so read it before starting.
- **Dropdowns are typeahead comboboxes (`<id>-edit` text inputs), not `<select>`.** Click the combobox, then click the option by `find` ref. Typing the state name filters the list ("Illinois").
- **Resume upload:** `#file-upload-0` is a hidden file input. Make it visible, give it an `aria-label`, `find` it, `file_upload`. Do not click it afterwards (it is a native picker).
- **Continue is `#saveContinue`.** A JS `.click()` advances the step.
- **The Agreement step is a signed statement, not a truthfulness tick:** it authorizes a background investigation, releases the employer and former employers from liability, and asks for today's date as a signature. That is the candidate's to accept: hand off at that step with everything before it saved.
