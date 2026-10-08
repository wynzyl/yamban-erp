#!/usr/bin/env python3
"""WCAG 2.x contrast checker.  usage: contrast.py check tokens.json  (exits 1 on any failure)"""
import json, sys
def lum(h):
    h=h.lstrip('#'); r,g,b=[int(h[i:i+2],16)/255 for i in (0,2,4)]
    f=lambda c: c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
    return 0.2126*f(r)+0.7152*f(g)+0.0722*f(b)
def ratio(a,b):
    la,lb=sorted([lum(a),lum(b)],reverse=True); return (la+0.05)/(lb+0.05)
def check(path):
    t=json.load(open(path)); bad=0
    for theme in ('light','dark'):
        c=t[theme]; print(f"\n[{theme}]")
        for fg,bg,need,role in t['pairs']:
            r=ratio(c[fg],c[bg]); ok=r>=need; bad+=not ok
            print(f"  {'PASS' if ok else 'FAIL'}  {r:5.2f}:1  need {need}  {fg:<22} on {bg:<14} {role}")
    print(f"\n{'ALL PASS' if not bad else str(bad)+' FAILURES'}"); return 1 if bad else 0
if __name__=='__main__':
    if sys.argv[1]=='check': sys.exit(check(sys.argv[2]))
    if sys.argv[1]=='pair': print(f"{ratio(sys.argv[2],sys.argv[3]):.2f}:1")
