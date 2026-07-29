"""Small self-hosted China Broadcast traffic proxy.

The upstream 10099-Tracker flow is intentionally kept server-side: a captured
mini-program request contains short-lived credentials and an encrypted payload.
The browser plugin only calls the public /traffic endpoint.
"""

import argparse
import hmac
import json
import os
import secrets
import shlex
import re
from datetime import datetime
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

import requests


UPSTREAM_URL = "https://wx.10099.com.cn/contact-web/api/busi/qryUserRes"
CONFIG_FILE = Path(os.environ.get("TRAFFIC_CONFIG_FILE", "data/config.json")).expanduser()
TOKEN_FILE = Path(os.environ.get("TRAFFIC_TOKEN_FILE", "data/admin_token")).expanduser()
CONFIG_KEYS = ("Session", "Access", "User-Agent", "data")
WEB_DIR = Path(__file__).with_name("web")
INDEX_FILE = WEB_DIR / "index.html"
ICON_FILE = WEB_DIR / "icon.svg"

BASE_HEADERS = {
    "Host": "wx.10099.com.cn",
    "content-type": "application/json",
    "Accept-Encoding": "gzip,compress,br,deflate",
    "Referer": "https://servicewechat.com/wxfa72ff5488bbd1d9/125/page-frame.html",
}

LOGIN_EXPIRED_KEYWORDS = (
    "登录", "过期", "失效", "重新", "未授权", "认证", "无效", "session", "access", "token"
)


class LoginExpiredError(RuntimeError):
    pass


def ensure_parent(path):
    path.parent.mkdir(parents=True, exist_ok=True)


def read_json(path):
    with path.open("r", encoding="utf-8") as file:
        return json.load(file)


def write_json(path, value):
    ensure_parent(path)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    try:
        path.chmod(0o600)
    except OSError:
        pass


def admin_token():
    configured = os.environ.get("ADMIN_TOKEN", "").strip()
    if configured:
        return configured
    if TOKEN_FILE.exists():
        token = TOKEN_FILE.read_text(encoding="utf-8").strip()
        if token:
            return token
    token = secrets.token_urlsafe(24)
    ensure_parent(TOKEN_FILE)
    TOKEN_FILE.write_text(token + "\n", encoding="utf-8")
    try:
        TOKEN_FILE.chmod(0o600)
    except OSError:
        pass
    print(f"管理令牌已生成并保存到：{TOKEN_FILE}", flush=True)
    return token


def clean_number(value):
    if value is None or value == "":
        return 0
    text = str(value).replace(",", "").strip()
    try:
        return int(float(text))
    except (TypeError, ValueError):
        raise ValueError(f"官方接口返回了无法识别的流量数值：{value}")


def kb_to_gb(value):
    return int(value) / 1024 / 1024


def read_config():
    if not CONFIG_FILE.exists():
        raise FileNotFoundError(f"未找到 {CONFIG_FILE}，请在配置页粘贴新的 curl。")
    config = read_json(CONFIG_FILE)
    missing = [key for key in CONFIG_KEYS if not str(config.get(key, "")).strip()]
    if missing:
        raise ValueError(f"配置缺少必要字段：{', '.join(missing)}")
    return {key: str(config[key]).strip() for key in CONFIG_KEYS}


def mask(value):
    value = str(value or "")
    if not value:
        return ""
    if len(value) <= 8:
        return "••••"
    return value[:4] + "••••" + value[-4:]


def config_status():
    try:
        raw = read_json(CONFIG_FILE) if CONFIG_FILE.exists() else {}
    except (OSError, ValueError, json.JSONDecodeError):
        raw = {}
    return {
        "configured": all(str(raw.get(key, "")).strip() for key in CONFIG_KEYS),
        "session": mask(raw.get("Session")),
        "access": mask(raw.get("Access")),
        "user_agent": bool(str(raw.get("User-Agent", "")).strip()),
        "payload": bool(str(raw.get("data", "")).strip()),
        "updated_at": datetime.fromtimestamp(CONFIG_FILE.stat().st_mtime).strftime("%Y-%m-%d %H:%M:%S")
        if CONFIG_FILE.exists() else "",
    }


def parse_curl(curl_text):
    normalized = re.sub(r"\\\s*(?:\r?\n|\\n)\s*", " ", curl_text)
    args = shlex.split(normalized)
    headers = {}
    values = {}
    index = 0
    while index < len(args):
        arg = args[index]
        if arg in ("-H", "--header", "--data", "--data-raw", "--data-binary", "--data-ascii", "-d", "-A", "--user-agent") and index + 1 < len(args):
            values.setdefault(arg, []).append(args[index + 1])
            index += 2
            continue
        for option in ("--header", "--data", "--data-raw", "--data-binary", "--data-ascii", "--user-agent"):
            if arg.startswith(option + "="):
                values.setdefault(option, []).append(arg[len(option) + 1:])
                break
        if arg.startswith("-A") and len(arg) > 2:
            values.setdefault("-A", []).append(arg[2:])
        index += 1

    for header in values.get("-H", []) + values.get("--header", []):
        if ":" in header:
            name, value = header.split(":", 1)
            headers[name.strip().lower()] = value.strip()

    payload = ""
    for raw in values.get("--data", []) + values.get("--data-raw", []) + values.get("--data-binary", []) + values.get("--data-ascii", []) + values.get("-d", []):
        try:
            parsed = json.loads(raw)
        except json.JSONDecodeError:
            continue
        if parsed.get("data"):
            payload = str(parsed["data"]).strip()
            break

    result = {
        "Session": headers.get("session", ""),
        "Access": headers.get("access", ""),
        "User-Agent": headers.get("user-agent", "") or next(iter(values.get("-A", []) + values.get("--user-agent", [])), ""),
        "data": payload,
    }
    missing = [key for key in CONFIG_KEYS if not result[key].strip()]
    if missing:
        raise ValueError(f"curl 中缺少必要字段：{', '.join(missing)}")
    return result


def save_curl(curl_text):
    config = read_json(CONFIG_FILE) if CONFIG_FILE.exists() else {}
    config.update(parse_curl(curl_text))
    write_json(CONFIG_FILE, config)
    return config_status()


def query_upstream(config):
    headers = dict(BASE_HEADERS)
    headers.update({"Session": config["Session"], "Access": config["Access"], "User-Agent": config["User-Agent"]})
    response = requests.post(UPSTREAM_URL, headers=headers, json={"data": config["data"]}, timeout=15)
    if response.status_code in (401, 403):
        raise LoginExpiredError(f"HTTP {response.status_code}")
    response.raise_for_status()
    try:
        return response.json()
    except ValueError as error:
        raise RuntimeError("官方接口返回的不是有效 JSON") from error


def is_login_expired(data):
    status = str(data.get("status", ""))
    message = str(data.get("message") or data.get("msg") or "")
    text = f"{status} {message}".lower()
    return any(keyword in text for keyword in LOGIN_EXPIRED_KEYWORDS)


def parse_traffic(data):
    if data.get("status") != "000000":
        if is_login_expired(data):
            raise LoginExpiredError(str(data.get("message") or data.get("msg") or data.get("status")))
        raise RuntimeError(f"接口返回异常：{data.get('message') or data.get('msg') or data.get('status')}")

    resources = data.get("data", {}).get("intfResultBean", {}).get("userResList", [])
    total = balance = used = 0
    details = []
    for item in resources:
        item_total = clean_number(item.get("highFee"))
        item_balance = clean_number(item.get("balance"))
        item_used = clean_number(item.get("addupValue"))
        total += item_total
        balance += item_balance
        used += item_used
        details.append({
            "name": item.get("itemName", ""),
            "total_gb": kb_to_gb(item_total),
            "balance_gb": kb_to_gb(item_balance),
            "used_gb": kb_to_gb(item_used),
            "start": item.get("startTime"),
            "end": item.get("endTime"),
        })
    return {"total_gb": kb_to_gb(total), "balance_gb": kb_to_gb(balance), "used_gb": kb_to_gb(used), "details": details}


def traffic_response(include_details=False):
    result = parse_traffic(query_upstream(read_config()))
    response = {
        "ok": True,
        "source": "中国广电官方接口",
        "unit": "GB",
        "total_gb": round(result["total_gb"], 2),
        "used_gb": round(result["used_gb"], 2),
        "balance_gb": round(result["balance_gb"], 2),
        "updated_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
    }
    if include_details:
        response["details"] = result["details"]
    return response


class Handler(BaseHTTPRequestHandler):
    server_version = "10099-Tracker/1.1"

    def authorized(self):
        supplied = self.headers.get("X-Admin-Token", "")
        return bool(supplied) and hmac.compare_digest(supplied, admin_token())

    def json_body(self):
        length = int(self.headers.get("Content-Length", "0") or 0)
        return json.loads(self.rfile.read(length).decode("utf-8")) if length else {}

    def json_response(self, status, payload, admin=False):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Admin-Token")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Admin-Token")
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        if parsed.path in ("/", "/index.html"):
            self.file_response(INDEX_FILE, "text/html; charset=utf-8")
            return
        if parsed.path in ("/icon.svg", "/favicon.svg"):
            self.file_response(ICON_FILE, "image/svg+xml; charset=utf-8")
            return
        if parsed.path == "/health":
            self.json_response(200, {"ok": True, "configured": config_status()["configured"]})
            return
        if parsed.path == "/api/config":
            if not self.authorized():
                self.json_response(401, {"ok": False, "error": "admin_required", "message": "需要管理令牌"})
                return
            self.json_response(200, {"ok": True, "config": config_status()})
            return
        if parsed.path != "/traffic":
            self.json_response(404, {"ok": False, "error": "not_found"})
            return
        include_details = parse_qs(parsed.query).get("details", ["0"])[0].lower() in ("1", "true", "yes")
        try:
            self.json_response(200, traffic_response(include_details))
        except LoginExpiredError as error:
            self.json_response(401, {"ok": False, "error": "login_expired", "message": "登录态已过期，请在代理配置页粘贴新的 curl。"})
            print(f"登录态已过期：{error}", flush=True)
        except FileNotFoundError as error:
            self.json_response(500, {"ok": False, "error": "config_error", "message": str(error)})
        except (ValueError, json.JSONDecodeError) as error:
            self.json_response(500, {"ok": False, "error": "config_error", "message": str(error)})
        except requests.RequestException as error:
            self.json_response(502, {"ok": False, "error": "upstream_error", "message": str(error)})
        except Exception as error:
            self.json_response(500, {"ok": False, "error": "server_error", "message": str(error)})

    def do_POST(self):
        parsed = urlparse(self.path)
        if parsed.path not in ("/api/extract-curl", "/api/config"):
            self.json_response(404, {"ok": False, "error": "not_found"})
            return
        if not self.authorized():
            self.json_response(401, {"ok": False, "error": "admin_required", "message": "需要管理令牌"})
            return
        try:
            payload = self.json_body()
            if parsed.path == "/api/extract-curl":
                result = save_curl(str(payload.get("curl", "")).strip())
            else:
                config = read_json(CONFIG_FILE) if CONFIG_FILE.exists() else {}
                if "bark_enabled" in payload:
                    config["bark_enabled"] = bool(payload["bark_enabled"])
                write_json(CONFIG_FILE, config)
                result = config_status()
            self.json_response(200, {"ok": True, "config": result})
        except (ValueError, json.JSONDecodeError) as error:
            self.json_response(400, {"ok": False, "error": "bad_request", "message": str(error)})
        except Exception as error:
            self.json_response(500, {"ok": False, "error": "server_error", "message": str(error)})

    def file_response(self, path, content_type):
        if not path.exists():
            self.json_response(500, {"ok": False, "error": "missing_file"})
            return
        body = path.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, fmt, *args):
        print(f"[{datetime.now().strftime('%Y-%m-%d %H:%M:%S')}] {self.address_string()} {fmt % args}", flush=True)


def run(host, port):
    token = admin_token()
    server = ThreadingHTTPServer((host, port), Handler)
    print(f"配置页面：http://{host}:{port}/", flush=True)
    print(f"插件 API：http://{host}:{port}/traffic?details=1", flush=True)
    print(f"管理令牌：{token}", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n正在停止服务...", flush=True)
    finally:
        server.server_close()


def main():
    parser = argparse.ArgumentParser(description="中国广电流量查询本地代理")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", default=8000, type=int)
    args = parser.parse_args()
    run(args.host, args.port)


if __name__ == "__main__":
    main()
