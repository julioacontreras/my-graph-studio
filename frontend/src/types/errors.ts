export interface ApiErrorBody {
  code: string;
  message: string;
  line?: number;
  column?: number;
  details?: { node_id: number | null; label: string; property: string; rule: string; message: string }[];
}

export class ApiError extends Error {
  readonly code: string;
  readonly status: number;
  readonly line?: number;
  readonly column?: number;
  readonly details?: ApiErrorBody["details"];

  constructor(status: number, body: ApiErrorBody) {
    super(body.message);
    this.status = status;
    this.code = body.code;
    this.line = body.line;
    this.column = body.column;
    this.details = body.details;
  }
}
