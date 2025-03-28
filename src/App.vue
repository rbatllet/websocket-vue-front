<script setup lang="ts">
import { RouterLink, RouterView } from 'vue-router'

// Configuració des de les variables d'entorn
const APP_NAME = import.meta.env.VITE_APP_NAME || 'WebSocket Vue Demo';
const APP_VERSION = import.meta.env.VITE_APP_VERSION || '1.0.0';
const CURRENT_YEAR = new Date().getFullYear();
</script>

<template>
  <div class="app-container">
    <header>
      <div class="header-content">
        <div class="logo-container">
          <img alt="Vue logo" class="logo" src="@/assets/logo.svg" width="50" height="50" />
          <div class="app-title">
            <h1>{{ APP_NAME }}</h1>
          </div>
        </div>
        <nav>
          <RouterLink to="/">Home</RouterLink>
        </nav>
      </div>
    </header>

    <main>
      <RouterView />
    </main>

    <footer>
      <div class="footer-content">
        <p>© {{ CURRENT_YEAR }} {{ APP_NAME }} v{{ APP_VERSION }}</p>
      </div>
    </footer>
  </div>
</template>

<style>
/* Reset i estils globals */
* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

:root {
  --color-primary: #42b883;
  --color-primary-light: #64d6a2;
  --color-primary-dark: #33a06f;
  --color-secondary: #35495e;
  --color-secondary-light: #516d88;
  --color-secondary-dark: #273747;
  --color-background: #f8f9fa;
  --color-surface: #ffffff;
  --color-text: #2c3e50;
  --color-text-secondary: #6c757d;
  --color-border: #dee2e6;
  --color-success: #5cb85c;
  --color-warning: #f0ad4e;
  --color-error: #d9534f;
  --color-info: #5bc0de;
  --border-radius: 6px;
  --box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  --max-content-width: 1200px;
}

body {
  font-family: 'Inter', 'Helvetica Neue', Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  color: var(--color-text);
  background-color: var(--color-background);
  line-height: 1.6;
  margin: 0;
  padding: 0;
}

/* App container */
.app-container {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  width: 100%;
}

/* Header styles */
header {
  width: 100%;
  background-color: var(--color-surface);
  box-shadow: var(--box-shadow);
  display: flex;
  justify-content: center;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
  max-width: var(--max-content-width);
  padding: 15px 40px;
}

.logo-container {
  display: flex;
  align-items: center;
}

.app-title {
  margin-left: 15px;
}

.app-title h1 {
  font-size: 22px;
  font-weight: 600;
  color: var(--color-primary);
}

nav {
  font-size: 14px;
}

nav a {
  display: inline-block;
  padding: 8px 16px;
  color: var(--color-text);
  text-decoration: none;
  border-radius: var(--border-radius);
  transition: all 0.2s;
}

nav a:hover {
  background-color: var(--color-background);
  color: var(--color-primary);
}

nav a.router-link-active {
  font-weight: 600;
  color: var(--color-primary);
  background-color: rgba(66, 184, 131, 0.1);
}

/* Main content */
main {
  flex: 1;
  width: 100%;
  display: flex;
  justify-content: center;
  padding: 30px;
}

/* Footer styles */
footer {
  width: 100%;
  background-color: var(--color-surface);
  color: var(--color-text-secondary);
  font-size: 14px;
  box-shadow: 0 -2px 8px rgba(0, 0, 0, 0.05);
  display: flex;
  justify-content: center;
}

.footer-content {
  width: 100%;
  max-width: var(--max-content-width);
  text-align: center;
  padding: 15px;
}

/* Button styles */
.btn {
  display: inline-block;
  padding: 8px 16px;
  border-radius: var(--border-radius);
  font-weight: 500;
  font-size: 14px;
  border: none;
  cursor: pointer;
  transition: all 0.2s;
}

.btn-primary {
  background-color: var(--color-primary);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background-color: var(--color-primary-dark);
}

.btn-danger {
  background-color: var(--color-error);
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background-color: #c9302c;
}

.btn:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

/* Responsive styles */
@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    padding: 15px 20px;
  }
  
  .logo-container {
    margin-bottom: 10px;
  }
  
  main {
    padding: 20px;
  }
}
</style>
