export async function waitFor<T>(
  read: () => Promise<T> | T,
  predicate: (value: T) => boolean,
  { timeoutMs = 2000, intervalMs = 25 } = {},
): Promise<T> {
  const deadline = Date.now() + timeoutMs
  let last = await read()
  while (!predicate(last)) {
    if (Date.now() > deadline) throw new Error(`waitFor timed out: ${JSON.stringify(last)}`)
    await Bun.sleep(intervalMs)
    last = await read()
  }
  return last
}
