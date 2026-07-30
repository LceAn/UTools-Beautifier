import tempfile
import threading
import time
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

    @mock.patch("app.traffic_response")
    def test_automatic_traffic_response_caches_success(self, traffic_response):
        traffic_response.return_value = {
            "ok": True,
            "source": "中国广电官方接口",
            "total_gb": 10,
            "used_gb": 4,
            "balance_gb": 6,
            "updated_at": "2026-07-30 15:00:00",
            "details": [{"name": "通用流量"}],
        }
        with tempfile.TemporaryDirectory() as directory:
            old_path = app.TRAFFIC_CACHE_FILE
            try:
                app.TRAFFIC_CACHE_FILE = Path(directory) / "traffic_cache.json"
                app.TRAFFIC_CACHE.clear()
                fresh = app.automatic_traffic_response(include_details=True)
                cached = app.automatic_traffic_response(include_details=False)
                self.assertFalse(fresh["cached"])
                self.assertFalse(fresh["stale"])
                self.assertTrue(fresh["automatic"])
                self.assertTrue(cached["cached"])
                self.assertNotIn("details", cached)
                self.assertEqual(traffic_response.call_count, 1)
                self.assertTrue(app.TRAFFIC_CACHE_FILE.exists())
            finally:
                app.TRAFFIC_CACHE_FILE = old_path
                app.TRAFFIC_CACHE.clear()

    @mock.patch("app.traffic_response", side_effect=app.LoginExpiredError("expired"))
    def test_automatic_traffic_response_uses_stale_cache_on_expiry(self, _traffic_response):
        with tempfile.TemporaryDirectory() as directory:
            old_path = app.TRAFFIC_CACHE_FILE
            try:
                app.TRAFFIC_CACHE_FILE = Path(directory) / "traffic_cache.json"
                app.TRAFFIC_CACHE.clear()
                app.TRAFFIC_CACHE.update({
                    "payload": {
                        "ok": True,
                        "source": "中国广电官方接口",
                        "total_gb": 10,
                        "used_gb": 4,
                        "balance_gb": 6,
                        "updated_at": "2026-07-30 15:00:00",
                    },
                    "cached_at": 1,
                    "last_success_at": 1,
                })
                result = app.automatic_traffic_response(force=True)
                self.assertTrue(result["cached"])
                self.assertTrue(result["stale"])
                self.assertEqual(result["automation_error"], "login_expired")
                self.assertTrue(result["authorization_required"])
            finally:
                app.TRAFFIC_CACHE_FILE = old_path
                app.TRAFFIC_CACHE.clear()

    @mock.patch("app.traffic_response")
    def test_health_status_does_not_wait_for_upstream_refresh(self, traffic_response):
        refresh_started = threading.Event()
        allow_refresh = threading.Event()

        def delayed_response(include_details=False):
            refresh_started.set()
            allow_refresh.wait(1)
            return {
                "ok": True,
                "source": "中国广电官方接口",
                "total_gb": 10,
                "used_gb": 4,
                "balance_gb": 6,
                "updated_at": "2026-07-30 15:00:00",
            }

        traffic_response.side_effect = delayed_response
        with tempfile.TemporaryDirectory() as directory:
            old_cache_path = app.TRAFFIC_CACHE_FILE
            old_config_path = app.CONFIG_FILE
            try:
                app.TRAFFIC_CACHE_FILE = Path(directory) / "traffic_cache.json"
                app.CONFIG_FILE = Path(directory) / "config.json"
                app.TRAFFIC_CACHE.clear()
                worker = threading.Thread(target=app.automatic_traffic_response, kwargs={"force": True})
                worker.start()
                self.assertTrue(refresh_started.wait(0.5))

                started_at = time.monotonic()
                status = app.traffic_automation_status()
                elapsed = time.monotonic() - started_at

                self.assertLess(elapsed, 0.2)
                self.assertTrue(status["automatic"])
                allow_refresh.set()
                worker.join(1)
                self.assertFalse(worker.is_alive())
            finally:
                allow_refresh.set()
                app.TRAFFIC_CACHE_FILE = old_cache_path
                app.CONFIG_FILE = old_config_path
                app.TRAFFIC_CACHE.clear()

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
