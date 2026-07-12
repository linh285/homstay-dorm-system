export interface HealthStatus {
  status: 'ok';
}

export class HealthService {
  getStatus(): HealthStatus {
    return { status: 'ok' };
  }
}
