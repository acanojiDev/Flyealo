// shared/validators/password.validators.ts
import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export class PasswordValidators {
  
  // Password match validator
  static passwordMatch(passwordField: string, confirmPasswordField: string): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const password = control.get(passwordField);
      const confirmPassword = control.get(confirmPasswordField);

      if (!password || !confirmPassword) {
        return null;
      }

      return password.value === confirmPassword.value 
        ? null 
        : { passwordMismatch: true };
    };
  }

  // At least 1 uppercase letter
  static hasUpperCase(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) {
        return null;
      }
      
      const hasUpperCase = /[A-Z]/.test(value);
      return hasUpperCase ? null : { noUpperCase: true };
    };
  }

  // At least 1 number
  static hasNumber(): ValidatorFn {
    return (control: AbstractControl): ValidationErrors | null => {
      const value = control.value;
      if (!value) {
        return null;
      }
      
      const hasNumber = /[0-9]/.test(value);
      return hasNumber ? null : { noNumber: true };
    };
  }
}