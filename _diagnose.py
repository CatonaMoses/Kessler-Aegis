"""Diagnose all layers of Kessler Aegis startup."""
import sys, os, traceback

print("=" * 60)
print("KESSLER AEGIS — STARTUP DIAGNOSTICS")
print("=" * 60)

# 1. Python version
print(f"\n[1] Python: {sys.version}")

# 2. Required packages
packages = ["fastapi", "uvicorn", "httpx", "dotenv", "sgp4", "ibm_watsonx_ai"]
print("\n[2] Package imports:")
for pkg in packages:
    try:
        mod = __import__(pkg.replace("-", "_"))
        ver = getattr(mod, "__version__", "ok")
        print(f"    OK  {pkg} ({ver})")
    except ImportError as e:
        print(f"    ERR {pkg}: {e}")

# 3. .env file
print("\n[3] Environment variables (.env):")
from dotenv import load_dotenv
load_dotenv()
required_env = ["WATSONX_APIKEY", "WATSONX_PROJECT_ID", "WATSONX_URL"]
all_env_ok = True
for k in required_env:
    v = os.environ.get(k, "")
    if v:
        print(f"    OK  {k} = {v[:8]}***")
    else:
        print(f"    ERR {k} = MISSING")
        all_env_ok = False

# 4. Celestrak + SGP4
print("\n[4] Celestrak fetch + SGP4 propagation:")
try:
    import httpx, io, math, datetime
    from sgp4 import omm
    from sgp4.api import Satrec, jday

    resp = httpx.get(
        "https://celestrak.org/NORAD/elements/gp.php?GROUP=cosmos-2251-debris&FORMAT=csv",
        timeout=15
    )
    rows = list(omm.parse_csv(io.StringIO(resp.text)))
    print(f"    OK  Fetched {len(rows)} rows from Celestrak")

    now = datetime.datetime.now(datetime.timezone.utc)
    jd, fr = jday(now.year, now.month, now.day, now.hour, now.minute, now.second)
    ok, fail = 0, 0
    for fields in rows:
        sat = Satrec()
        omm.initialize(sat, fields)
        e, r, _ = sat.sgp4(jd, fr)
        if e == 0 and r and not any(math.isnan(c) for c in r):
            ok += 1
        else:
            fail += 1
    print(f"    OK  SGP4 propagated: {ok} success, {fail} fail")
except Exception:
    print(f"    ERR SGP4 pipeline failed:")
    traceback.print_exc()

# 5. Watsonx connectivity (just credentials, no inference)
print("\n[5] IBM Watsonx credentials:")
if all_env_ok:
    try:
        from ibm_watsonx_ai import Credentials, APIClient
        creds = Credentials(
            url=os.environ["WATSONX_URL"],
            api_key=os.environ["WATSONX_APIKEY"]
        )
        client = APIClient(creds)
        client.set.default_project(os.environ["WATSONX_PROJECT_ID"])
        print("    OK  APIClient created and project set")
    except Exception:
        print("    ERR Watsonx init failed:")
        traceback.print_exc()
else:
    print("    SKIPPED (env vars missing)")

# 6. FastAPI app import
print("\n[6] FastAPI app import:")
try:
    import importlib.util, unittest.mock as mock
    # We already have real creds loaded, just import main directly
    import main as app_module
    print(f"    OK  main.py imported, routes: {[r.path for r in app_module.app.routes]}")
except Exception:
    print("    ERR main.py import failed:")
    traceback.print_exc()

print("\n" + "=" * 60)
print("DIAGNOSTICS COMPLETE")
print("=" * 60)
