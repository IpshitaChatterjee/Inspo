// Reads an image with macOS's built-in Vision framework (on-device, offline).
// Run with: osascript -l JavaScript vision.js <image path>
// Prints {"labels": [...], "lines": [{ text, x, y, h }]} as JSON, where x/y/h are
// the line's position and height as fractions of the image (y counts from the bottom).
ObjC.import("Foundation")
ObjC.import("Vision")

const MIN_CONFIDENCE = 0.5
const MAX_LABELS = 5

function run(argv) {
  const url = $.NSURL.fileURLWithPath(argv[0])
  const handler = $.VNImageRequestHandler.alloc.initWithURLOptions(url, $({}))
  const classify = $.VNClassifyImageRequest.alloc.init
  const text = $.VNRecognizeTextRequest.alloc.init
  text.usesLanguageCorrection = true

  const error = Ref()
  if (!handler.performRequestsError($([classify, text]), error)) {
    throw new Error("Vision could not read this image")
  }

  const labels = []
  const results = classify.results
  for (let i = 0; i < results.count && labels.length < MAX_LABELS; i++) {
    const result = results.objectAtIndex(i)
    if (result.confidence >= MIN_CONFIDENCE) labels.push(result.identifier.js)
  }

  const lines = []
  const found = text.results
  for (let i = 0; i < found.count; i++) {
    const observation = found.objectAtIndex(i)
    const candidate = observation.topCandidates(1)
    if (!candidate.count) continue
    const box = observation.boundingBox
    lines.push({
      text: candidate.objectAtIndex(0).string.js,
      x: box.origin.x,
      y: box.origin.y,
      h: box.size.height,
    })
  }

  return JSON.stringify({ labels, lines })
}
