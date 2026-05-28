(function () {
  const DEFAULT_HEADERS = {
    Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "User-Agent":
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
  };

  function resolveUrl(base, location) {
    try {
      return new URL(location, base).href;
    } catch {
      return location;
    }
  }

  async function nativeRequest(url, responseType, extraHeaders) {
    const http = window.Capacitor?.Plugins?.CapacitorHttp;
    if (!http?.get) return null;

    const res = await http.get({
      url,
      headers: { ...DEFAULT_HEADERS, ...extraHeaders },
      connectTimeout: 28000,
      readTimeout: 28000,
      responseType,
    });

    const headers = res.headers || {};
    const location = headers.Location || headers.location || null;

    return {
      status: res.status,
      location,
      data: res.data,
    };
  }

  async function webRequest(url, responseType, extraHeaders) {
    const res = await fetch(url, {
      headers: { ...DEFAULT_HEADERS, ...extraHeaders },
      cache: "no-store",
      redirect: "manual",
    });

    const location = res.headers.get("location");
    let data;
    if (responseType === "blob") {
      data = await res.blob();
    } else {
      data = await res.text();
    }

    return { status: res.status, location, data };
  }

  async function requestOnce(url, responseType, extraHeaders) {
    if (window.Capacitor?.isNativePlatform?.()) {
      const native = await nativeRequest(url, responseType, extraHeaders);
      if (native) return native;
    }
    return webRequest(url, responseType, extraHeaders);
  }

  async function follow(url, responseType, extraHeaders, maxRedirects = 6) {
    let current = url;
    let last = null;

    for (let i = 0; i < maxRedirects; i += 1) {
      last = await requestOnce(current, responseType, extraHeaders);
      if (last.status >= 300 && last.status < 400 && last.location) {
        current = resolveUrl(current, last.location);
        continue;
      }
      if (last.status >= 200 && last.status < 300) {
        return { url: current, ...last };
      }
      throw new Error(`HTTP ${last.status}`);
    }
    throw new Error("Too many redirects");
  }

  async function getText(url, extraHeaders) {
    const res = await follow(url, "text", extraHeaders);
    return typeof res.data === "string" ? res.data : String(res.data ?? "");
  }

  function dataToBlob(data) {
    if (data instanceof Blob) return data;
    if (typeof data === "string") {
      const bin = atob(data);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
      return new Blob([bytes]);
    }
    return new Blob([data]);
  }

  async function getBlob(url, extraHeaders) {
    const res = await follow(url, "blob", extraHeaders);
    return dataToBlob(res.data);
  }

  window.TnewsHttp = { getText, getBlob, DEFAULT_HEADERS };
})();
