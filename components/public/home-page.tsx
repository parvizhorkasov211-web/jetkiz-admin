import { RedesignedPublicHomePage } from './redesigned-home-page';
import type { Locale } from './content';

export function PublicHomePage({ locale }: { locale: Locale }) {
  return <RedesignedPublicHomePage locale={locale} />;
}
