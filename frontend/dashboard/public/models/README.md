# GlucoTwin anatomy prototype

Self-contained uncompressed glTF 2.0 GLB. Units meters, +Y up, +Z anterior, +X patient-left. Named groups and anchors documented in anatomy_manifest.json. Tissue surfaces use non-emissive PBR materials; runtime controls shell transparency and organ context fading. Pancreas sits posterior to stomach; liver primarily patient-right. Generated anatomy is schematic and needs expert review.

The five organ/tissue groups remain independently controllable. Representative muscle/adipose patches are illustrative subsets. No glucose graphics, UI, lights, cameras or stage are baked into the model.

Statistics:

```json
{
  "triangles": 149972,
  "meshes": 13,
  "materials": 6,
  "textures": 0,
  "bytes": 3567456,
  "sha256": "b1817614bd88e1f050c38cce921ffbf11e96e9b3598cd95d0a572b9de6bab0e4",
  "bounds": [
    [
      -0.38671145660246925,
      0.0,
      -0.12283642224821643
    ],
    [
      0.38481177316207116,
      1.7425726338037937,
      0.1488019637040976
    ]
  ],
  "generationSeconds": 3.11
}
```
