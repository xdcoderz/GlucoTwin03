# Digital twin references

- [Tanmay Narnaware, glucose-digital-twin](https://github.com/tanmay7264/glucose-digital-twin/blob/ec68f9a/twin/model.py), commit `ec68f9a`: the MIT six-state physiology model, UKF, prior, rollout and ridge helpers are vendored unchanged in `ml-service/app/upstream/model.py`. Our `twin_engine.py` adapts fitting to sparse causal observations and adds bounded request validation, chronological evaluation, drift refitting, deterministic simulation bands and meal/walk comparisons. The former fixed-gain browser model has been removed. No external dataset, pretrained residual artifact or pickle was copied.
- [Team AlgoAura](https://github.com/Nishu15205/AlgoAura_MERI-College-of-Engineering-and-Technology/tree/a0ee0c9), commit `a0ee0c9`: `PatientListView.tsx` informed the searchable worklist. `src/lib/ml/cgm-metrics.ts` informed the range/CV/GMI metrics, implemented here with elapsed-time weighting, gap exclusion and minimum-duration gating. Wearable context is recorded separately; missing values are never fabricated. Both MIT notices are retained below / alongside the vendored source.

See [implementation, APIs, limitations and verification](TWIN_INTEGRATION.md). Existing classifier metrics are not evidence for the new physiological forecasts. Upstream boosted models, synthetic population metrics, alert-accuracy claims, FHIR/hardware integration and medication what-if heuristics are not imported.

## License for adapted equations

MIT License

Copyright (c) 2026 Tanmay Narnaware

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

## AlgoAura license

MIT License

Copyright (c) 2026 GlucoTwin Team

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
