import { isIP } from "node:net"

const isPrivateIpv4 = (hostname: string) => {
  const parts = hostname.split(".").map(Number)
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part))) {
    return false
  }
  return (
    parts[0] === 10 ||
    parts[0] === 127 ||
    (parts[0] === 169 && parts[1] === 254) ||
    (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
    (parts[0] === 192 && parts[1] === 168) ||
    parts[0] === 0
  )
}

const isLoopbackHost = (hostname: string) =>
  hostname === "localhost" ||
  hostname === "127.0.0.1" ||
  hostname === "::1"

export const isAllowedPublicImageUrl = (value: string) => {
  if (/[\\\u0000-\u001f\u007f]/.test(value)) return false
  if (
    value.startsWith("/static/") ||
    value.startsWith("/assets/") ||
    value.startsWith("/customer-assets/")
  ) {
    return (
      value.length <= 2048 &&
      !value.includes("..") &&
      !/[?#\\\u0000-\u001f]/.test(value)
    )
  }

  let parsed: URL
  try {
    parsed = new URL(value)
  } catch {
    return false
  }
  if (parsed.username || parsed.password || parsed.hash || value.length > 2048) {
    return false
  }
  const rawHostname = parsed.hostname.toLowerCase()
  const hostname =
    rawHostname.startsWith("[") && rawHostname.endsWith("]")
      ? rawHostname.slice(1, -1)
      : rawHostname
  if (
    parsed.protocol === "http:" &&
    process.env.NODE_ENV !== "production" &&
    isLoopbackHost(hostname)
  ) {
    return true
  }
  if (parsed.protocol !== "https:" || isLoopbackHost(hostname)) return false
  const ipVersion = isIP(hostname)
  if (ipVersion === 4 && isPrivateIpv4(hostname)) return false
  if (
    ipVersion === 6 &&
    (hostname === "::" ||
      hostname === "::1" ||
      hostname.startsWith("fc") ||
      hostname.startsWith("fd") ||
      hostname.startsWith("::ffff:") ||
      hostname.startsWith("fe8") ||
      hostname.startsWith("fe9") ||
      hostname.startsWith("fea") ||
      hostname.startsWith("feb"))
  ) {
    return false
  }
  return true
}
