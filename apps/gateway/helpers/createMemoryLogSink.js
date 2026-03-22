import { Writable } from 'node:stream'

export const createMemoryLogSink = () => {
  const records= []

  const stream = new Writable({
    write(chunk, _encoding, callback) {
      const raw = chunk.toString()

      for (const line of raw.split('\n')) {
        const trimmed = line.trim()
        if (!trimmed) continue

        try {
          records.push(JSON.parse(trimmed))
        } catch {
          // nếu có line rác thì bỏ qua
        }
      }

      callback()
    },
  })

  return {
    stream,
    records,
    reset() {
      records.length = 0
    },
  }
}