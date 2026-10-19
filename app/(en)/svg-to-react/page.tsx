import ContentPage from "@/components/ContentPage";
import { pageMetadata } from "@/lib/seo";

export const metadata = pageMetadata("en", "svgToReact");

export default function Page() {
  return <ContentPage locale="en" pageKey="svgToReact" />;
}
