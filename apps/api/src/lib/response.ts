import type { ApiResponse } from '@eduportal/shared';

export function jsonResponse<T>(status: number, body: ApiResponse<T>): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });
}

export function ok<T>(data: T, status = 200): Response {
  return jsonResponse(status, { success: true, data });
}

export function okMessage(message: string, status = 200): Response {
  return jsonResponse(status, { success: true, message });
}

export function created<T>(data: T): Response {
  return jsonResponse(201, { success: true, data });
}

export function badRequest(message: string, errors?: Record<string, string[]>): Response {
  return jsonResponse(400, { success: false, message, errors });
}

export function unauthorized(message: string): Response {
  return jsonResponse(401, { success: false, message });
}

export function forbidden(message: string): Response {
  return jsonResponse(403, { success: false, message });
}

export function notFound(message = 'Resource not found'): Response {
  return jsonResponse(404, { success: false, message });
}

export function conflict(message: string): Response {
  return jsonResponse(409, { success: false, message });
}

export function serverError(message = 'Internal server error'): Response {
  return jsonResponse(500, { success: false, message });
}
