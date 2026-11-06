# Data licence and attribution

> **GlucoTwin workspace note:** This project copied the synthetic demo fixture and the fitted aggregate model artifact from the HappyHealth bundle. It did not copy the participant-level processed CSV tables. The public demo must use the synthetic fixture. The model is derived from the research dataset described below; preserve this attribution when sharing the model or results.


## Source dataset

The prepared research tables in this package are derived from:

**ShanghaiT1DM and ShanghaiT2DM dataset, version 5**  
Figshare DOI: <https://doi.org/10.6084/m9.figshare.20425518.v5>  
Associated article: <https://www.nature.com/articles/s41597-023-01940-7>  
Source licence: Creative Commons Attribution 4.0 International (CC BY 4.0)  
Licence text: <https://creativecommons.org/licenses/by/4.0/legalcode>

Suggested attribution:

> Contains data derived from the ShanghaiT1DM and ShanghaiT2DM dataset, version 5,
> available from Figshare at DOI 10.6084/m9.figshare.20425518.v5 under CC BY 4.0.

## Changes made in this package

The HappyHealth preparation pipeline:

- standardised column names, identifiers, glucose units, and timestamps;
- separated valid glucose readings from rejected source rows;
- created patient-level training, validation, and test assignments using seed 42;
- identified recorded meals and calculated auditable two-hour outcomes;
- created 43 leakage-controlled numeric model inputs; and
- produced baseline evaluation files and an aggregate Logistic Regression model.

The preparation rules and limitations are documented in
`docs/SHANGHAI_T2DM_PIPELINE.md`, `docs/FEATURE_DICTIONARY.md`, and
`docs/SHANGHAI_BASELINE_MODEL.md`.

## Source integrity record

The original downloaded archive was named
`shanghai_diabetes_dataset_v5.zip`. Its recorded SHA-256 value is:

`d68f9cddcaf917b4adc7d639e1d01c11e4dc6a3dae86370229f6398e7f0aeefc`

The original archive contained 130 readable entries, and its publisher-supplied MD5
was recorded as matching during download verification. The original archive is not
included in this collaborator bundle because the prepared tables are sufficient for
immediate development and the official source remains available at the DOI above.

## Project code

The included preparation scripts are part of the HappyHealth project and use the MIT
License reproduced in `CODE_LICENSE.txt`.

## Research and privacy notice

The source is openly published and de-identified, but the prepared files still
represent participant-level health research data. Do not attempt re-identification.
Follow any institutional ethics, information-security, or research-governance rules
that apply to your team. This package is not a medical device and is not clinically
validated.

