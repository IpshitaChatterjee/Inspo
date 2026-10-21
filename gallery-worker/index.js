// The shared gallery's only moving part. Everything is a static file except
// /api/*, which handles editor mode:
//
//   POST /api/login         password → a signed token (valid 180 days)
//   GET  /api/edits         pending edits, so every visitor sees them right away
//   POST /api/edits         add an edit (needs a token)
//   POST /api/edits/pull    the Mac collects pending edits (needs a token)
//   POST /api/edits/ack     the Mac clears edits it has applied and published
//
// Pending edits live in one KV key until the Mac writes them into the iCloud
// library. The password is never stored: only a salted SHA-256 of it, set as a
// secret by the Mac app (EDIT_PASSWORD_HASH = "salt:hash"), plus SESSION_KEY
// for signing tokens.

const PENDING = "pending"
const TOKEN_DAYS = 180
const MAX_FAILS_PER_HOUR = 10
const OPS = new Set([
  "addTag",
  "removeTag",
  "removeAutoTag",
  "setTitle",
  "delete",
  "setComponentTags",
])

export default {
  async fetch(request, env) {
    const url = new URL(request.url)
    if (!url.pathname.startsWith("/api/")) return env.ASSETS.fetch(request)
    try {
      return await route(request, env, url.pathname)
    } catch (error) {
      return json({ error: error.message ?? "Something went wrong" }, 500)
    }
  },
}

async function route(request, env, path) {
  if (path === "/api/edits" && request.method === "GET") {
    return json({ edits: await pending(env) }, 200, {
      "Cache-Control": "no-store",
    })
  }
  if (request.method !== "POST") return json({ error: "Not found" }, 404)
  const body = await request.json().catch(() => ({}))

  if (path === "/api/login") return login(request, env, body)
  if (
    !(await validToken(
      env,
      request.headers.get("Authorization")?.replace(/^Bearer /, "")
    ))
  ) {
    return json(
      { error: "Editing is locked. Unlock it with your password." },
      401
    )
  }

  if (path === "/api/edits") {
    const { itemId, op, value } = body
    if (typeof itemId !== "string" || !OPS.has(op))
      return json({ error: "That edit doesn't make sense." }, 400)
    const edit = {
      id: crypto.randomUUID(),
      at: new Date().toISOString(),
      itemId,
      op,
      // A component's whole tag list travels in one edit, so allow a bit more.
      value:
        typeof value === "string"
          ? value.slice(0, op === "setComponentTags" ? 1000 : 200)
          : undefined,
    }
    const edits = await pending(env)
    edits.push(edit)
    await env.EDITS.put(PENDING, JSON.stringify(edits))
    return json({ edit })
  }
  if (path === "/api/edits/pull") return json({ edits: await pending(env) })
  if (path === "/api/edits/ack") {
    const done = new Set(Array.isArray(body.ids) ? body.ids : [])
    const remaining = (await pending(env)).filter((edit) => !done.has(edit.id))
    await env.EDITS.put(PENDING, JSON.stringify(remaining))
    return json({ remaining: remaining.length })
  }
  return json({ error: "Not found" }, 404)
}

async function pending(env) {
  return JSON.parse((await env.EDITS.get(PENDING)) ?? "[]")
}

async function login(request, env, body) {
  if (!env.EDIT_PASSWORD_HASH || !env.SESSION_KEY) {
    return json(
      {
        error:
          "Editing hasn't been set up yet. On your Mac, open Inspo and choose Shared gallery → ⋯ → Set gallery password.",
      },
      403
    )
  }
  // Slow down guessing: a handful of wrong tries per hour per address.
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown"
  const failKey = `fail:${ip}`
  const fails = Number((await env.EDITS.get(failKey)) ?? 0)
  if (fails >= MAX_FAILS_PER_HOUR)
    return json({ error: "Too many wrong tries. Try again in an hour." }, 429)

  const [salt, expected] = env.EDIT_PASSWORD_HASH.split(":")
  const actual = await sha256(`${salt}:${String(body.password ?? "")}`)
  if (!equal(actual, expected)) {
    await env.EDITS.put(failKey, String(fails + 1), { expirationTtl: 3600 })
    return json({ error: "That's not the password." }, 401)
  }
  const expires = Date.now() + TOKEN_DAYS * 86_400_000
  return json({
    token: `${expires}.${await sign(env.SESSION_KEY, `edit:${expires}`)}`,
  })
}

async function validToken(env, token) {
  if (!token || !env.SESSION_KEY) return false
  const [expires, signature] = token.split(".")
  if (!(Number(expires) > Date.now())) return false
  return equal(signature ?? "", await sign(env.SESSION_KEY, `edit:${expires}`))
}

async function sha256(text) {
  return hex(
    await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text))
  )
}

async function sign(key, message) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  )
  return hex(
    await crypto.subtle.sign(
      "HMAC",
      cryptoKey,
      new TextEncoder().encode(message)
    )
  )
}

function hex(buffer) {
  return [...new Uint8Array(buffer)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("")
}

// Compares without leaking how much matched through timing.
function equal(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

function json(data, status = 200, headers = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...headers },
  })
}
