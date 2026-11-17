"""Reproduce a saved forecast, or evaluate a complete TwinRequest JSON locally.

Run with the project virtual environment. Output is descriptive research evidence,
never a validation claim. Only observations through origin are accepted.
"""
import argparse
import json
import sys
from pathlib import Path

sys.path.insert(0,str(Path(__file__).resolve().parents[1]/"ml-service"))
from app.twin_engine import TwinRequest,calculate

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument("input",type=Path,help="TwinRequest or saved forecast JSON")
    parser.add_argument("--output",type=Path,required=True)
    args=parser.parse_args()
    source=json.loads(args.input.read_text(encoding="utf-8-sig"))
    req=TwinRequest.model_validate(source.get("input",source))
    result=calculate(req)
    args.output.parent.mkdir(parents=True,exist_ok=True)
    args.output.write_text(json.dumps(result,indent=2,allow_nan=False),encoding="utf-8")
    print(json.dumps({k:result.get(k) for k in ("status","calibration","residualStatus","evaluation")},indent=2))
if __name__=="__main__":main()
