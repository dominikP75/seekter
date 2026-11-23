# CareerPlug

- **URLs:** `<tenant>-careers.careerplug.com/jobs/<id>`; the Apply section is `/jobs/<id>/apps/new` on the same page. No account needed. An "Apply with Indeed" button sits above the form; ignore it.
- **One page:** first/last name, email, phone, an optional "Text me updates" Yes/No radio, address, city, State select, ZIP, Resume/CV (required) and Cover letter, each a hidden `input[type=file]` with an "Or Type/Paste Text" alternative, Recent Job Title, Recent Employer, optional EEO Gender and Race selects, a referral checkbox. All text fields and selects take `form_input` by ref.
- **The first file input is the resume** (it follows the `Resume/CV *` label); the second is the cover letter.
- **CAPTCHA:** invisible reCAPTCHA bound to the submit button (`grecaptcha-badge`, `g-recaptcha-response` height 0). Fine.
- **Submit** lands on `/jobs/<id>/apps/<n>` reading "Thank You, <first name>! We have received your information for the <role> role". Measured 18 Nov 2026.
