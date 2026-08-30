# Raksha TPA — Requirements

**Website**: https://rakshatpa.com
**Helpline**: 1800 3000 1055
**Pre-auth portal**: https://portal.rakshatpa.com
**Email**: preauth@rakshatpa.com

## Planned admission
Submit pre-auth **72 hours before** the planned admission date.

## Emergency admission
Submit pre-auth **within 12 hours** of admission. Emergency cases are prioritised but still require all mandatory fields.

## Required fields (Raksha TPA specific)
- Patient full name (must match CKYC records exactly)
- Patient date of birth
- Patient gender
- Policy number
- Insurer name
- Hospital name, city, PIN code
- Hospital ROHINI ID (mandatory — unique hospital identifier in India's insurance registry)
- Treating doctor full name
- Doctor qualification (MBBS + PG degree)
- Doctor state medical council registration number
- Primary diagnosis in plain language
- Primary ICD-10 diagnosis code
- Proposed procedure in plain language
- ICD-10 PCS procedure code
- Expected stay in days
- Estimated total cost (INR)
- Room type requested (General / Semi-Private / Private)
- Pre-existing disease declaration (yes/no; if yes, list conditions)
- Alcohol/drug/substance related (yes/no)
- Maternity related (yes/no)
- Road traffic accident (yes/no; if yes, police FIR number mandatory)

## Cost breakdown required by line item
Raksha TPA requires a granular breakdown — missing line items are the most common rejection reason:

| Line item | Mandatory |
|-----------|-----------|
| Room charges (per day × days) | Yes |
| Surgeon fee | Yes |
| Anesthesia fee | Yes |
| Operation theatre charges | Yes |
| ICU charges (if applicable) | Conditional |
| Investigations (lab, imaging) | Yes |
| Pharmacy and consumables | Yes |
| Implants (name, make, cost) | If applicable |
| Post-op physiotherapy | If applicable |

## ROHINI ID — how to find it
The ROHINI (Registry of Hospitals in Network of Insurance) ID is a 6–8 digit alphanumeric code assigned to every empanelled hospital. Ask the hospital admin desk. It is also visible on the hospital's network certificate from the insurer.

If the ROHINI ID is unknown, the Raksha portal will reject the submission with error `HOSP_NOT_FOUND`.

## Specific notes
- Raksha TPA **does not** accept pre-auth submissions by email for planned admissions; only the portal is accepted
- Emergency email submissions must still be followed up with a portal entry within 24 hours
- CKYC ID is required if the sum insured exceeds ₹10 lakh
- Implant approvals are a separate sub-process — if the procedure involves an implant, submit the implant approval form simultaneously

## Common Raksha TPA rejection reasons
1. ROHINI ID missing or wrong
2. Cost breakdown missing ICU or implant line items
3. Doctor's registration number from wrong state (e.g., patient moved states)
4. Road traffic accident without FIR number
5. Procedure code not matching diagnosis code
6. Maternity field unanswered (even for non-maternity cases — it must be "No")
