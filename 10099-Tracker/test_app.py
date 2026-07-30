import tempfile
import unittest
from pathlib import Path
from unittest import mock

import app


class FakeResponse:
    def __init__(self, json_data=None, text=""):
        self.json_data = json_data
        self.text = text

    def raise_for_status(self):
        return None

    def json(self):
        return self.json_data


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

    @mock.patch("app.requests.get")
    def test_project_version_proxy_discovers_latest_webos(self, requests_get):
        requests_get.side_effect = [
            FakeResponse({"default_branch": "main", "stargazers_count": 24, "pushed_at": "2026-07-30T00:00:00Z"}),
            FakeResponse([
                {"name": "Web重构_v26.14.1.js", "download_url": "https://example/old", "html_url": "https://example/old-page"},
                {"name": "Web重构_v26.14.3.js", "download_url": "https://example/latest", "html_url": "https://example/latest-page"},
            ]),
            FakeResponse(text="var VERSION = '26.14.3-update-proxy-resilience';"),
        ]
        app.PROJECT_VERSION_CACHE.clear()

        result = app.project_version_response()
        self.assertTrue(result["ok"])
        self.assertEqual(result["tag"], "26.14.3-update-proxy-resilience")
        self.assertEqual(result["source_file"], "Web重构_v26.14.3.js")
        self.assertEqual(result["stars"], 24)
        self.assertFalse(result["stale"])
        self.assertEqual(requests_get.call_count, 3)

        cached = app.project_version_response()
        self.assertTrue(cached["cached"])
        self.assertFalse(cached["stale"])
        self.assertEqual(requests_get.call_count, 3)

    @mock.patch("app.fetch_project_version_payload", side_effect=app.requests.ConnectionError("offline"))
    def test_project_version_proxy_uses_stale_cache_on_refresh_failure(self, _fetch):
        app.PROJECT_VERSION_CACHE.clear()
        app.PROJECT_VERSION_CACHE.update({
            "cached_at": 0,
            "payload": {
                "ok": True,
                "tag": "26.14.3-update-proxy-resilience",
                "branch": "main",
                "stars": 24,
                "cached": False,
                "stale": False,
            },
        })

        result = app.project_version_response(force=True)

        self.assertTrue(result["ok"])
        self.assertTrue(result["cached"])
        self.assertTrue(result["stale"])
        self.assertEqual(result["refresh_error"], "ConnectionError")


if __name__ == "__main__":
    unittest.main()
