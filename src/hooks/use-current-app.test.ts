import { expect, test } from "vitest"

import { readSavedApp } from "./use-current-app"

test("defaults to inspo with no storage", () =>
  expect(readSavedApp(null)).toBe("inspo"))

test("reads a saved choice", () =>
  expect(readSavedApp({ getItem: () => "components" })).toBe("components"))

test("ignores junk", () =>
  expect(readSavedApp({ getItem: () => "nope" })).toBe("inspo"))

test("survives storage that throws", () =>
  expect(
    readSavedApp({
      getItem: () => {
        throw new Error("blocked")
      },
    })
  ).toBe("inspo"))
