"""Recover the exact Duck Heist WebP from an accidentally shortened base64 transfer.

Temporary one-time migration: assert against the Git blob hash of the original image
so no other image can silently replace the approved catalog composition.
"""
from base64 import b64encode, b64decode
from hashlib import sha1
from pathlib import Path

target=Path("public/duck-heist-gameplay.webp")
expected="84bfff762420a5a100533eaebd6e9e9f877cb346"
def git_hash(data: bytes) -> str:
    return sha1(b"blob "+str(len(data)).encode()+b"\0"+data).hexdigest()
raw=target.read_bytes()
if git_hash(raw)==expected:
    print("Catalog image already matches approved original")
else:
    raw64=b64encode(raw).decode("ascii")
    if len(raw64)!=8660 or not raw64.endswith("=="):
        raise SystemExit(f"Unexpected artwork payload length {len(raw)}; refusing blind repair")
    truncated=raw64[:-1]
    alphabet="ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
    recovered=None
    for i in range(len(truncated)+1):
        left,right=truncated[:i],truncated[i:]
        for ch in alphabet:
            try:
                candidate=b64decode(left+ch+right,validate=True)
            except (ValueError, __import__("binascii").Error):
                continue
            if git_hash(candidate)==expected:
                recovered=candidate
                print(f"Recovered exact original artwork at position {i}")
                break
        if recovered is not None:
            break
    if recovered is None:
        raise SystemExit("Artwork transfer cannot be matched to original SHA1")
    target.write_bytes(recovered)
    assert git_hash(target.read_bytes())==expected
