import { afterEach, describe, expect, test, vi } from "vitest"
import { copyText } from "./copy-text"

// Tests run without a browser, so the clipboard and the page are stand-ins.
function stubBrowser({
  writeText,
  execCommand,
}: {
  writeText?: (text: string) => Promise<void>
  execCommand: () => boolean
}) {
  const textarea = {
    value: "",
    style: {} as Record<string, string>,
    setAttribute: vi.fn(),
    select: vi.fn(),
    remove: vi.fn(),
  }
  const document = {
    createElement: vi.fn(() => textarea),
    body: { appendChild: vi.fn() },
    execCommand: vi.fn(execCommand),
  }
  vi.stubGlobal("navigator", writeText ? { clipboard: { writeText } } : {})
  vi.stubGlobal("document", document)
  return { document, textarea }
}

afterEach(() => vi.unstubAllGlobals())

describe("copyText", () => {
  test("uses the clipboard when it can", async () => {
    const writeText = vi.fn(() => Promise.resolve())
    const { document } = stubBrowser({ writeText, execCommand: () => false })
    expect(await copyText("x")).toBe(true)
    expect(writeText).toHaveBeenCalledWith("x")
    expect(document.execCommand).not.toHaveBeenCalled()
  })

  test("falls back to execCommand when the clipboard refuses", async () => {
    const { document, textarea } = stubBrowser({
      writeText: () => Promise.reject(new Error("denied")),
      execCommand: () => true,
    })
    expect(await copyText("x")).toBe(true)
    expect(document.execCommand).toHaveBeenCalledWith("copy")
    expect(textarea.value).toBe("x")
    expect(textarea.remove).toHaveBeenCalled()
  })

  test("falls back to execCommand when there's no clipboard", async () => {
    stubBrowser({ execCommand: () => true })
    expect(await copyText("x")).toBe(true)
  })

  test("reports failure when both fail", async () => {
    const { textarea } = stubBrowser({
      writeText: () => Promise.reject(new Error("denied")),
      execCommand: () => false,
    })
    expect(await copyText("x")).toBe(false)
    expect(textarea.remove).toHaveBeenCalled()
  })

  test("reports failure when execCommand throws", async () => {
    stubBrowser({
      writeText: () => Promise.reject(new Error("denied")),
      execCommand: () => {
        throw new Error("unsupported")
      },
    })
    expect(await copyText("x")).toBe(false)
  })
})
