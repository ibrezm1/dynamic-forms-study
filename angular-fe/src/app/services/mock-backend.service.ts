import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface ValidationResponse {
  success: boolean;
  errors?: { [key: string]: string };
}

@Injectable({
  providedIn: 'root'
})
export class MockBackendService {

  constructor(private http: HttpClient) {}

  validateStep(stepId: string, data: any, url: string = '/api/validate', profileId?: string | null): Observable<ValidationResponse> {
    // Perform a real HTTP POST request to simulate a real-world API gateway validation using the URL from JSON schema
    return this.http.post<ValidationResponse>(url, { stepId, data, profileId });
  }
}
