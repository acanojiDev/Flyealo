import { Component, output, signal } from '@angular/core';
import { FormGroup, FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { PasswordValidators } from '../../../shared/validators/password.validator';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-login-component',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './login-component.html',
  styleUrl: './login-component.scss',
})
export class LoginComponent {
  showPassword = signal(false);
  loginForm: FormGroup;

  loginSubmit = output<{ email: string; password: string }>();
  googleSignIn = output<void>();

  constructor(private fb: FormBuilder) {
    this.loginForm = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required]],
    });
  }

  onSubmit() {
    if (this.loginForm.valid) {
      const { email, password } = this.loginForm.value;
      this.loginSubmit.emit({ email, password });
    }
  }

  togglePasswordVisibility() {
    this.showPassword.update(value => !value);
  }

  onGoogleSignIn() {
    this.googleSignIn.emit();
  }

  // Getters for form controls for easier access in the template
  get email() {
    return this.loginForm.get('email');
  }

  get password() {
    return this.loginForm.get('password');
  }
}
