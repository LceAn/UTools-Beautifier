import tempfile
import unittest
from pathlib import Path
from unittest import mock

import app


class TrackerTests(unittest.TestCase):
    def test_parse_curl(self):
        parsed = app.parse_curl(
            "curl 'https://wx.10099.com.cn/contact-web/api/busi/qryUserRes' "
            "-H 'Session: session-value' -H 'Access: access-value' "
            "-H 'User-Agent: MicroMessenger/1.0' "
            "--data-raw '{\"data\":\"encrypted-value\"}'"
        )
        self.assertEqual(parsed["Session"], "session-value")
        self.assertEqual(parsed["Access"], "access-value")
        self.assertEqual(parsed["User-Agent"], "MicroMessenger/1.0")
        self.assertEqual(parsed["data"], "encrypted-value")

    def test_parse_traffic(self):
        result = app.parse_traffic({
            "status": "000000",
            "data": {"intfResultBean": {"userResList": [{
                "itemName": "测试流量包",
                "highFee": "1048576",
                "balance": "524288",
                "addupValue": "524288",
                "startTime": "2026-07-01",
                "endTime": "2026-07-31",
            }]}}
        })
        self.assertEqual(result["total_gb"], 1)
        self.assertEqual(result["balance_gb"], 0.5)
        self.assertEqual(result["used_gb"], 0.5)
        self.assertEqual(result["details"][0]["name"], "测试流量包")

    def test_config_status_masks_secrets(self):
        with tempfile.TemporaryDirectory() as directory:
            old_path = app.CONFIG_FILE
            try:
                app.CONFIG_FILE = Path(directory) / "config.json"
                app.write_json(app.CONFIG_FILE, {
                    "Session": "session-secret-value",
                    "Access": "access-secret-value",
                    "User-Agent": "MicroMessenger/1.0",
                    "data": "encrypted-secret-value",
                })
                status = app.config_status()
                serialized = str(status)
                self.assertTrue(status["configured"])
                self.assertNotIn("session-secret-value", serialized)
                self.assertNotIn("access-secret-value", serialized)
                self.assertNotIn("encrypted-secret-value", serialized)
            finally:
                app.CONFIG_FILE = old_path

    @mock.patch("app.read_config", return_value={"Session": "s", "Access": "a", "User-Agent": "u", "data": "d"})
    @mock.patch("app.query_upstream")
    def test_traffic_response_matches_plugin_contract(self, query_upstream, _read_config):
        query_upstream.return_value = {
            "status": "000000",
            "data": {"intfResultBean": {"userResList": [{
                "itemName": "月度流量",
                "highFee": "2097152",
                "balance": "1572864",
                "addupValue": "524288",
            }]}}
        }
        result = app.traffic_response(include_details=True)
        self.assertTrue(result["ok"])
        self.assertEqual(result["total_gb"], 2)
        self.assertEqual(result["balance_gb"], 1.5)
        self.assertEqual(result["used_gb"], 0.5)
        self.assertEqual(len(result["details"]), 1)


if __name__ == "__main__":
    unittest.main()
