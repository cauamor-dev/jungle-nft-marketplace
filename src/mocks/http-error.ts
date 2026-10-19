export class MockHttpError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly extra: { fieldErrors?: Record<string, string>; details?: unknown } = {},
  ) {
    super(message)
  }
}
