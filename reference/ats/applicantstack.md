# ApplicantStack

- **URLs:** posting `<co>.applicantstack.com/x/detail/<id>`; form `.../x/apply/<id>` (the "Apply Now" link). One long page, no account, no steps.
- **Fields are plain inputs named `field_<n>` (contact) and `qtn_<form>_<n>` (questions).** The native value setter plus `input`/`change` events sticks; radios take a JS `.click()`. Labels are not tied with `for=`, so read each input's surrounding text, and map the employment-history grid by position (From/To on the left, employer name and address in the middle, phone on the right, job title below).
- **`hpspecialhp_name_1` is a honeypot.** Never fill it.
- **Resume:** `upload1_file` is a real file input; make it visible, `find`, `file_upload`, verify `files[0].name`.
- **The form ends with an "Authorization" block and a required "Signature (type name)" plus Date.** The text releases the employer and former employers from liability, so it is the candidate's signature to give: fill everything else and hand off with the tab open.
