import ContentPage from "@/components/ContentPage";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("en", "svgToTsx");

export default function Page() {
  return <ContentPage locale="en" pageKey="svgToTsx" />;
}
