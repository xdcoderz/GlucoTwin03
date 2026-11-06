# GlucoTwin: technical and design notes

These supporting notes were moved out of the Evidence page to keep model evaluation easy to read.

## Software architecture

Synthetic EHR and HTTP glucose replay enter Spring Boot, which validates and fuses the inputs. Spring calls the FastAPI fitted-model service. H2 retains state and saved scoring attempts; the React dashboard presents the results and review workflow.

The browser talks to Spring. If inference fails, the result is unavailable. Only the meal baseline and preceding history enter the model. Later observations belong to follow-up review.

Repository references: `docs/ARCHITECTURE.md`, `docs/API_CONTRACT.md` and `docs/WORKSPACE_SIMPLIFICATION.md`.

## Meaning of the visual twin

The body and organs are generic educational geometry. Glucose overlays follow display rules. A base arc shows the saved, uncalibrated event score; an optional blue outline marks recorded medication context. These graphics do not measure organ health or simulate treatment effects.

The organ viewers include anatomy references beside the relevant structures. The repository also documents appearance choices in `docs/ANATOMY_APPEARANCE.md`.

## Interface references

These informed presentation and interaction design. They do not validate GlucoTwin's model.

- [Specify: charcoal and violet visual direction](https://specifyapp.com/)
- [Dexcom Clarity: glucose reports](https://provider.dexcom.com/products/dexcom-clarity)
- [Tidepool: patient data views](https://www.tidepool.org/providers/viewing-patient-data)
- [Unlearn: digital twin communication](https://www.unlearn.ai/)
- [Visual-conversational risk explanation research](https://arxiv.org/html/2507.02920v1)
- [Uncertainty dashboard design study](https://dx2905.github.io/FnuGauravWeb/assets/papers/paper-draft.pdf)

## Data and model references

- [ShanghaiT1DM and ShanghaiT2DM dataset, version 5](https://doi.org/10.6084/m9.figshare.20425518.v5)
- The downloadable `MODEL_CARD.md` contains the project model's inputs, patient-level split, metrics and limitations.
- Repository attribution: `docs/DATA_LICENSE_AND_ATTRIBUTION.md`.

## Future validation

The validation roadmap is available as an expandable section in Future lab. Its slide download is retained there. The roadmap describes future work, not completed validation.
