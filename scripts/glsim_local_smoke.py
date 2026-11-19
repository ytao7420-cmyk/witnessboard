"""Local GLSim smoke test. Uses an ephemeral key that is never printed or saved.

This talks only to 127.0.0.1. It is not a Studionet or Bradbury transaction.
"""

import json
import os
import sys

from genlayer_py import create_account, create_client
from genlayer_py.chains import localnet
from genlayer_py.types import TransactionStatus

ENDPOINT = os.environ.get("GLSIM_RPC", "http://127.0.0.1:4217/api")
CONTRACT = os.environ.get(
    "CONTRACT_PATH",
    os.path.join(os.path.dirname(__file__), "..", "contracts", "milestone_witness.py"),
)


def main() -> int:
    account = create_account()
    client = create_client(chain=localnet, endpoint=ENDPOINT, account=account)
    report = {
        "kind": "local-glsim",
        "not_a_public_testnet": True,
        "endpoint": ENDPOINT,
        "account": account.address,
        "private_key_saved": False,
    }
    funded = client.provider.make_request("sim_fundAccount", [account.address, 10**18])
    report["fund_result"] = funded.get("result") if isinstance(funded, dict) else str(funded)
    code = open(CONTRACT, "r", encoding="utf-8").read()
    deploy_tx = client.deploy_contract(code=code, account=account, args=[])
    report["deploy_tx"] = deploy_tx.hex() if hasattr(deploy_tx, "hex") else str(deploy_tx)
    receipt = client.wait_for_transaction_receipt(
        deploy_tx,
        status=TransactionStatus.ACCEPTED,
        interval=1,
        retries=40,
    )
    report["deploy_receipt_status"] = str(getattr(receipt, "status_name", None) or receipt.get("status_name") if isinstance(receipt, dict) else getattr(receipt, "status_name", None))
    data = receipt if isinstance(receipt, dict) else receipt.__dict__
    # Keep only non-secret fields that identify the local result.
    if isinstance(receipt, dict):
        report["deploy_execution"] = receipt.get("tx_execution_result_name") or receipt.get("txExecutionResultName")
        report["contract_address"] = (
            (receipt.get("tx_data_decoded") or {}).get("contract_address")
            if isinstance(receipt.get("tx_data_decoded"), dict)
            else receipt.get("contract_address")
        )
        report["receipt_keys"] = sorted(receipt.keys())
    else:
        report["receipt_type"] = type(receipt).__name__
        report["receipt_repr"] = repr(receipt)[:2000]
    print(json.dumps(report, default=str, indent=2))
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(json.dumps({
            "kind": "local-glsim",
            "not_a_public_testnet": True,
            "endpoint": ENDPOINT,
            "error": f"{type(exc).__name__}: {exc}",
        }, indent=2))
        raise
