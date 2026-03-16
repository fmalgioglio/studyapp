import LoginPageClient from "@/app/login/login-page-client";
import { isDevBootstrapEnabled } from "@/server/auth/dev-bootstrap";

export default function LoginPage() {
  return <LoginPageClient devBootstrapEnabled={isDevBootstrapEnabled()} />;
}
