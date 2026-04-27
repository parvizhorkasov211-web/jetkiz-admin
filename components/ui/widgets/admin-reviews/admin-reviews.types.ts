export type AdminReviewStatusFilter = 'ALL' | 'VISIBLE' | 'HIDDEN';

export type AdminReviewClient = {
  id: string;
  phone: string | null;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  avatarUrl: string | null;
  name: string;
};

export type AdminReviewRestaurant = {
  id: string;
  nameRu: string;
  nameKk: string;
  slug: string;
  coverImageUrl: string | null;
};

export type AdminReviewOrder = {
  id: string;
  number: number;
  status: string;
  total: number;
  createdAt: string;
};

export type AdminReviewMedia = {
  id: string;
  type: string;
  url: string;
  previewUrl: string | null;
};

export type AdminReviewResponse = {
  id: string;
  text: string | null;
  isHidden: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AdminReviewItem = {
  id: string;

  userId: string;
  restaurantId: string;
  orderId: string | null;

  rating: number;
  text: string | null;

  foodRating: number | null;
  deliveryRating: number | null;
  packingRating: number | null;
  valueRating: number | null;
  accuracyRating: number | null;

  pros: string[];
  cons: string[];

  isHidden: boolean;
  createdAt: string;

  client: AdminReviewClient;
  restaurant: AdminReviewRestaurant;
  order: AdminReviewOrder | null;

  media: AdminReviewMedia[];
  mediaCount: number;

  response: AdminReviewResponse | null;
  hasResponse: boolean;
};

export type AdminReviewsSummary = {
  total: number;
  visible: number;
  hidden: number;
  avgRating: number | null;
};

export type AdminReviewsMeta = {
  total: number;
  page: number;
  limit: number;
  pages: number;
};

export type AdminReviewsResponse = {
  items: AdminReviewItem[];
  meta: AdminReviewsMeta;
  summary: AdminReviewsSummary;
};