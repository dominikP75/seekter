# Paycom

- **URLs:** `paycomonline.net/v4/ats/web.php/jobs?clientkey=<KEY>` redirects to `.../portal/<KEY>/career-page`; a posting is `.../portal/<KEY>/jobs/<id>`. Pages render client-side: wait 3-4 s before reading text.
- **List:** paginated (a "34 Results" header with only a few cards rendered). Use the keyword search box and press Enter instead of reading the first page.
- **No account needed.** Apply opens a "Getting You Started" dialog: legal first/last name, email, confirm email, phone (+1 prefilled, type the 10 local digits), a mandatory SMS-consent Yes/No radio, then "Continue To Application". "Create Account" / "Sign In" are optional.
- **Hidden textboxes** sit inside the dialog with no label: leave them empty (likely honeypots).
- **The SMS-consent radio:** answer it from the profile's SMS consent line. If the session's permission check blocks the click, hand the dialog off with the other fields filled.
- **After the dialog:** "Start Application" offers Autofill with Resume/CV or Apply Manually. Uploading a resume after Apply Manually raises "New Resume/CV Uploaded: use it to fill out the application?", which swallows keystrokes until answered; it filled education and every employment block (days set to 01) from the resume. Job Duties is a rich-text editor the autofill fills.
- Selects are custom comboboxes: set them with `form_input` on the combobox ref. Screening radios: click by `name` plus label text, because their ids regenerate.
- Text inputs take `focus()` plus real typing. Read values back: one city field came out doubled.
- The Authorization section and the screening "Statement of truth" question are a signature: the user's.
- **A tax-credit questionnaire (WOTC) can arrive pre-ticked and block the submit.** It asks for a Social Security number and a date of birth, which are never typed. Measured 18 Nov 2026: Submit failed on it alone. Untick it and confirm the opt-out it offers (opting out does not affect the application). **That resets the acknowledgement checkbox and the typed signature**, so re-tick the box and re-type the signature (Type mode) before submitting again, and read both back.
