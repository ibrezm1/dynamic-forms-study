import { HttpInterceptorFn, HttpResponse } from '@angular/common/http';
import { delay, of } from 'rxjs';

export const mockBackendInterceptor: HttpInterceptorFn = (req, next) => {
  // Capture the POST requests pointing to our step-specific mock validation endpoints
  if (req.url.includes('/api/validate/step') && req.method === 'POST') {
    const body = req.body as any;
    const data = body?.data || {};
    
    // Determine the step ID from either request body or URL path
    let stepId = body?.stepId;
    if (!stepId) {
      if (req.url.includes('step1-success.json') || req.url.includes('step1-error.json')) stepId = 'step-1';
      else if (req.url.includes('step2-success.json') || req.url.includes('step2-error.json')) stepId = 'step-2';
      else if (req.url.includes('step3-success.json') || req.url.includes('step3-error.json')) stepId = 'step-3';
    }

    const errors: { [key: string]: string } = {};

    if (stepId === 'step-1') {
      const email = (data.email || '').trim().toLowerCase();
      const firstName = (data.firstName || '').trim().toLowerCase();
      const lastName = (data.lastName || '').trim().toLowerCase();

      // If they request the error endpoint directly, force mock errors for testing
      if (req.url.includes('step1-error.json')) {
        errors['email'] = 'This email address is already associated with an active account.';
        errors['lastName'] = 'First name and last name cannot be identical for security purposes.';
      } else {
        if (email === 'taken@domain.com') {
          errors['email'] = 'This email address is already associated with an active account.';
        } else if (email.endsWith('@blocked.com')) {
          errors['email'] = 'Registration using @blocked.com email addresses is restricted.';
        }

        if (firstName && lastName && firstName === lastName) {
          errors['lastName'] = 'First name and last name cannot be identical for security purposes.';
        }
      }
    }

    if (stepId === 'step-2') {
      const username = (data.username || '').trim().toLowerCase();
      const experience = data.experience || '';

      const reservedUsernames = ['admin', 'administrator', 'root', 'moderator', 'system'];
      if (reservedUsernames.includes(username)) {
        errors['username'] = `The username '${data.username}' is a reserved system identifier.`;
      }

      if (username.includes('expert') && experience === 'junior') {
        errors['username'] = "A experience level of 'Junior' is inconsistent with a username containing 'expert'.";
      }
    }

    if (stepId === 'step-3') {
      const terms = !!data.terms;
      if (!terms) {
        errors['terms'] = 'You must explicitly consent to terms and conditions.';
      }
    }

    const hasErrors = Object.keys(errors).length > 0;
    const responseBody = hasErrors 
      ? { success: false, errors } 
      : { success: true };

    // Simulate roundtrip API latency (800ms) and return HTTP 200 with validation body
    return of(new HttpResponse({ status: 200, body: responseBody })).pipe(delay(800));
  }

  // Pass-through any other HTTP request
  return next(req);
};
