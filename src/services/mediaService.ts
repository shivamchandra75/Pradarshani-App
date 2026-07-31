import { supabase } from '../supabase';
import type { Religion, BookCategory, Book, Tag, MediaItem } from '../types/database';

const BUCKET_NAME = 'media-uploads';

/**
 * Uploads an image file to Supabase Storage and returns its public URL.
 */
export async function uploadImageFile(file: File, folderPrefix = 'proofs'): Promise<string> {
  const fileExt = file.name.split('.').pop();
  const fileName = `${folderPrefix}/${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(fileName, file, { upsert: true });

  if (uploadError) {
    throw new Error(`Failed to upload file to storage bucket: ${uploadError.message}`);
  }

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(fileName);

  return urlData.publicUrl;
}

/**
 * Fetch all religions
 */
export async function fetchReligions(): Promise<Religion[]> {
  const { data, error } = await supabase
    .from('religions')
    .select('*')
    .order('name');
  if (error) throw error;
  return data || [];
}

/**
 * Add a new religion
 */
export async function addReligion(name: string): Promise<Religion> {
  const { data, error } = await supabase
    .from('religions')
    .insert([{ name: name.trim() }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Fetch book categories for a given religion
 */
export async function fetchCategoriesByReligion(religionId: string): Promise<BookCategory[]> {
  const { data, error } = await supabase
    .from('book_categories')
    .select('*')
    .eq('religion_id', religionId)
    .order('name');
  if (error) throw error;
  return data || [];
}

/**
 * Add a new book category under a religion
 */
export async function addCategory(name: string, religionId: string): Promise<BookCategory> {
  const { data, error } = await supabase
    .from('book_categories')
    .insert([{ name: name.trim(), religion_id: religionId }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Fetch books for a given category
 */
export async function fetchBooksByCategory(categoryId: string): Promise<Book[]> {
  const { data, error } = await supabase
    .from('books')
    .select('*')
    .eq('category_id', categoryId)
    .order('name');
  if (error) throw error;
  return data || [];
}

/**
 * Add a new book under a category with optional cover image URL
 */
export async function addBook(name: string, categoryId: string, coverImageUrl?: string | null): Promise<Book> {
  const { data, error } = await supabase
    .from('books')
    .insert([{ name: name.trim(), category_id: categoryId, cover_image_url: coverImageUrl || null }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Fetch all tags
 */
export async function fetchAllTags(): Promise<Tag[]> {
  const { data, error } = await supabase
    .from('tags')
    .select('*')
    .order('name');
  if (error) throw error;
  return data || [];
}

/**
 * Add a new tag
 */
export async function addTag(name: string): Promise<Tag> {
  const cleanName = name.trim().toLowerCase();
  const { data, error } = await supabase
    .from('tags')
    .insert([{ name: cleanName }])
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Creates a media record and links it with multiple tags in media_tags
 */
export async function createMediaRecord(
  imageUrl: string,
  description: string | null,
  bookId: string,
  tagIds: string[]
): Promise<void> {
  // 1. Insert media record
  const { data: mediaData, error: mediaError } = await supabase
    .from('media')
    .insert([{ image_url: imageUrl, description: description?.trim() || null, book_id: bookId }])
    .select()
    .single();

  if (mediaError) throw mediaError;

  // 2. Insert media-tag links if tags exist
  if (tagIds.length > 0) {
    const mediaTagRows = tagIds.map(tagId => ({
      media_id: mediaData.id,
      tag_id: tagId,
    }));

    const { error: tagLinkError } = await supabase
      .from('media_tags')
      .insert(mediaTagRows);

    if (tagLinkError) throw tagLinkError;
  }
}

/**
 * Fetches media items tagged with a specific tag ID along with joined book, category, and religion data
 */
export async function fetchMediaByTagId(tagId: string): Promise<MediaItem[]> {
  const { data, error } = await supabase
    .from('media_tags')
    .select(`
      media:media_id (
        id,
        image_url,
        description,
        created_at,
        book:book_id (
          id,
          name,
          cover_image_url,
          category:category_id (
            id,
            name,
            religion:religion_id (
              id,
              name
            )
          )
        )
      )
    `)
    .eq('tag_id', tagId);

  if (error) throw error;

  // Extract nested media items
  const mediaList: MediaItem[] = [];
  if (data) {
    for (const item of data) {
      if (item.media) {
        mediaList.push(item.media as unknown as MediaItem);
      }
    }
  }

  return mediaList;
}
