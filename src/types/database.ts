export interface Religion {
  id: string;
  name: string;
}

export interface BookCategory {
  id: string;
  name: string;
  religion_id: string;
}

export interface Book {
  id: string;
  name: string;
  category_id: string;
  cover_image_url: string | null;
}

export interface Tag {
  id: string;
  name: string;
}

export interface MediaItem {
  id: string;
  image_url: string;
  description: string | null;
  book_id: string | null;
  created_at: string;
  // Joined relation fields for UI rendering
  book?: {
    id: string;
    name: string;
    cover_image_url: string | null;
    category?: {
      id: string;
      name: string;
      religion?: {
        id: string;
        name: string;
      };
    };
  };
  tags?: Tag[];
}
