import type { Metadata } from "next";
import ContentPage from "@/components/ContentPage";
import { asLocale } from "@/lib/i18n/config";
import { pageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ locale: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return pageMetadata(asLocale((await params).locale), "svgCurrentcolor");
}

export default async function Page({ params }: Props) {
  return <ContentPage locale={asLocale((await params).locale)} pageKey="svgCurrentcolor" />;
}
