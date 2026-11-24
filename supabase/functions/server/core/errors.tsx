export class HttpError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function badRequest(message: string): HttpError {
  return new HttpError(400, message);
}

export function unauthorized(message = "Silakan masuk terlebih dahulu."): HttpError {
  return new HttpError(401, message);
}

export function forbidden(message = "Anda tidak memiliki izin untuk aksi ini."): HttpError {
  return new HttpError(403, message);
}

export function notFound(message = "Data tidak ditemukan."): HttpError {
  return new HttpError(404, message);
}

export function conflict(message: string): HttpError {
  return new HttpError(409, message);
}
