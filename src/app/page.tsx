import HomePageClient from "@/app/home-page-client";
import { isDevBootstrapEnabled } from "@/server/auth/dev-bootstrap";

export default function HomePage() {
  return <HomePageClient devBootstrapEnabled={isDevBootstrapEnabled()} />;
}
