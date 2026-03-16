const DEFAULT_DEV_BOOTSTRAP_EMAIL = "dev@studyapp.local";
const DEFAULT_DEV_BOOTSTRAP_PASSWORD = "studyapp-dev-bootstrap";

export function isDevBootstrapEnabled() {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  return (
    process.env.DEV_BOOTSTRAP_ENABLED === "true" ||
    process.env.ENABLE_DEV_BOOTSTRAP === "true"
  );
}

export function getDevBootstrapEmail() {
  return process.env.DEV_BOOTSTRAP_EMAIL ?? DEFAULT_DEV_BOOTSTRAP_EMAIL;
}

export function getDevBootstrapPassword() {
  return process.env.DEV_BOOTSTRAP_PASSWORD ?? DEFAULT_DEV_BOOTSTRAP_PASSWORD;
}
