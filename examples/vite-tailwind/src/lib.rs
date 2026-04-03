use worker::*;

#[event(fetch)]
async fn fetch(req: Request, env: Env, _ctx: Context) -> Result<Response> {
    let url = req.url()?;
    let assets = env.assets("ASSETS").unwrap();

    match url.path() {
        "/" => {
            let html = r#"<!doctype html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Vite + Tailwind + Rust Worker</title>
  <link rel="stylesheet" href="/style.css">
</head>
<body class="min-h-screen bg-gray-100 flex items-center justify-center">
  <div class="bg-white rounded-xl shadow-lg p-8 max-w-lg w-full text-center">
    <div class="flex justify-center gap-4 mb-4">
      <img src="/rust.svg" alt="Rust" class="w-12 h-12">
      <img src="/cloudflare.svg" alt="Cloudflare" class="w-12 h-12">
      <img src="/tailwind.svg" alt="Tailwind CSS" class="w-12 h-12">
      <img src="/vite.svg" alt="Vite" class="w-12 h-12">
    </div>
    <h1 class="text-2xl font-bold text-gray-900 mb-2">workers-rs + vite + tailwindcss</h1>
    <p class="text-gray-500 text-sm mb-6">
      The Tailwind classes in the response of the button only exist in Rust source code.
    </p>
    <button onclick="fetchGreeting()" class="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors cursor-pointer">
      Fetch from Worker
    </button>
    <div id="result" class="mt-6"></div>
  </div>
  <script>
    async function fetchGreeting() {
      document.getElementById("result").innerHTML = '<p class="text-gray-400">Loading...</p>';
      const res = await fetch("/api/greeting");
      document.getElementById("result").innerHTML = await res.text();
    }
  </script>
</body>
</html>"#;
            let headers = Headers::new();
            headers.set("Content-Type", "text/html")?;
            Ok(Response::ok(html)?.with_headers(headers))
        }
        "/api/greeting" => {
            let html = r#"
                <div class="bg-gradient-to-r from-violet-500 to-fuchsia-500 rounded-xl p-6 text-white shadow-md">
                    <p class="text-lg font-semibold">Hello from Rust!</p>
                </div>
            "#;
            let headers = Headers::new();
            headers.set("Content-Type", "text/html")?;
            Ok(Response::ok(html)?.with_headers(headers))
        }
        _ => {
            let resp = assets.fetch_request(req).await;
            match resp {
                Ok(r) if r.status_code() < 400 => Ok(r),
                _ => {
                  let origin = url.origin().ascii_serialization();
                  Ok(assets.fetch(format!("{origin}/404.html"), None).await?.with_status(404))
                },
            }
        }
    }
}
