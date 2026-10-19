import ContentPage from "@/components/ContentPage";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("en", "privacy");

export default function Page() {
  return <ContentPage locale="en" pageKey="privacy" />;
}
