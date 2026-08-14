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
 * Helper to delete an image from the storage bucket given its public URL
 */
export async function deleteImageFromStorage(imageUrl: string): Promise<void> {
  try {
    const urlStr = imageUrl;
    const bucketUrlPart = `/object/public/${BUCKET_NAME}/`;
    const bucketIndex = urlStr.indexOf(bucketUrlPart);
    
    if (bucketIndex !== -1) {
      const rawFilePath = urlStr.substring(bucketIndex + bucketUrlPart.length);
      const filePath = decodeURIComponent(rawFilePath);
      
      const { error: storageError } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([filePath]);
        
      if (storageError) {
        console.error('Error deleting image from storage:', storageError);
      }
    }
  } catch (e) {
    console.error('Error parsing image URL for deletion:', e);
  }
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
 * Update an existing book's name and/or cover image.
 * If the cover image is replaced, it deletes the old cover image from storage.
 */
export async function updateBook(
  bookId: string,
  updates: { name?: string; coverImageUrl?: string | null }
): Promise<Book> {
  const updateData: Record<string, any> = {};
  if (updates.name !== undefined) updateData.name = updates.name.trim();
  if (updates.coverImageUrl !== undefined) updateData.cover_image_url = updates.coverImageUrl;

  if (updates.coverImageUrl !== undefined) {
    // Delete the old image from storage if it exists and is different
    const { data: oldBook } = await supabase
      .from('books')
      .select('cover_image_url')
      .eq('id', bookId)
      .single();

    if (oldBook?.cover_image_url && oldBook.cover_image_url !== updates.coverImageUrl) {
      await deleteImageFromStorage(oldBook.cover_image_url);
    }
  }

  if (Object.keys(updateData).length > 0) {
    const { data, error } = await supabase
      .from('books')
      .update(updateData)
      .eq('id', bookId)
      .select()
      .single();
    if (error) throw error;
    return data;
  }
  
  // Return the current book if no updates provided
  const { data, error } = await supabase.from('books').select('*').eq('id', bookId).single();
  if (error) throw error;
  return data;
}

/**
 * Fetch all tags. If onlyWithMedia is true (default), only returns tags attached to at least 1 media item.
 */
export async function fetchAllTags(onlyWithMedia = true): Promise<Tag[]> {
  if (onlyWithMedia) {
    const { data, error } = await supabase
      .from('tags')
      .select('id, name, media_tags!inner(media_id)')
      .order('name');

    if (error) throw error;

    const uniqueTagsMap = new Map<string, Tag>();
    if (data) {
      for (const item of data) {
        if (!uniqueTagsMap.has(item.id)) {
          uniqueTagsMap.set(item.id, { id: item.id, name: item.name });
        }
      }
    }
    return Array.from(uniqueTagsMap.values());
  } else {
    const { data, error } = await supabase
      .from('tags')
      .select('*')
      .order('name');
    if (error) throw error;
    return data || [];
  }
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

/**
 * Fetches all attached tag IDs for a given media ID
 */
export async function fetchTagIdsForMedia(mediaId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('media_tags')
    .select('tag_id')
    .eq('media_id', mediaId);

  if (error) throw error;
  return data ? data.map(row => row.tag_id) : [];
}

/**
 * Updates a media record (image_url, description, book_id) and syncs its attached tags.
 */
export async function updateMediaRecord(
  mediaId: string,
  updates: {
    imageUrl?: string;
    description?: string | null;
    bookId?: string;
    tagIds?: string[];
  }
): Promise<void> {
  const updateData: Record<string, any> = {};
  if (updates.imageUrl !== undefined) updateData.image_url = updates.imageUrl;
  if (updates.description !== undefined) updateData.description = updates.description?.trim() || null;
  if (updates.bookId !== undefined) updateData.book_id = updates.bookId;

  if (Object.keys(updateData).length > 0) {
    const { error: mediaUpdateError } = await supabase
      .from('media')
      .update(updateData)
      .eq('id', mediaId);

    if (mediaUpdateError) throw mediaUpdateError;
  }

  if (updates.tagIds !== undefined) {
    const uniqueTagIds = Array.from(new Set(updates.tagIds));

    // Delete existing tag associations for this media
    const { error: deleteTagsError } = await supabase
      .from('media_tags')
      .delete()
      .eq('media_id', mediaId);

    if (deleteTagsError) throw deleteTagsError;

    // Insert/upsert new tag associations
    if (uniqueTagIds.length > 0) {
      const mediaTagRows = uniqueTagIds.map(tagId => ({
        media_id: mediaId,
        tag_id: tagId,
      }));

      const { error: insertTagsError } = await supabase
        .from('media_tags')
        .upsert(mediaTagRows, { onConflict: 'media_id,tag_id' });

      if (insertTagsError) throw insertTagsError;
    }

    // Clean up any orphan tags that are no longer linked to any media
    await cleanupOrphanTags();
  }
}

/**
 * Deletes any tags from public.tags that have no remaining associations in media_tags
 */
export async function cleanupOrphanTags(): Promise<void> {
  try {
    const { data: allTags, error: selectError } = await supabase
      .from('tags')
      .select('id, media_tags(tag_id)');

    if (selectError || !allTags) return;

    const orphanTagIds = allTags
      .filter((tag: any) => !tag.media_tags || tag.media_tags.length === 0)
      .map((tag: any) => tag.id);

    if (orphanTagIds.length > 0) {
      await supabase
        .from('tags')
        .delete()
        .in('id', orphanTagIds);
    }
  } catch (err) {
    console.error('Error cleaning up orphan tags:', err);
  }
}

/**
 * Deletes a media record entirely and cleans up orphan tags
 */
export async function deleteMediaRecord(mediaId: string): Promise<void> {
  // 1. Fetch the media record to get the image URL
  const { data: mediaRecord, error: fetchError } = await supabase
    .from('media')
    .select('image_url')
    .eq('id', mediaId)
    .single();

  if (fetchError && fetchError.code !== 'PGRST116') {
    throw fetchError;
  }

  // 2. Delete the record from the database
  const { error } = await supabase
    .from('media')
    .delete()
    .eq('id', mediaId);

  if (error) throw error;

  // 3. Delete the image from storage if it belongs to our bucket
  if (mediaRecord?.image_url) {
    await deleteImageFromStorage(mediaRecord.image_url);
  }

  // Clean up any orphan tags left behind
  await cleanupOrphanTags();
}

export interface BookTreeNode extends Book {
  mediaCount?: number;
}

export interface CategoryTreeNode extends BookCategory {
  books: BookTreeNode[];
}

export interface ReligionTreeNode extends Religion {
  categories: CategoryTreeNode[];
}

/**
 * Single optimized batch query fetching all religions, nested categories, and nested books
 */
export async function fetchFolderTree(): Promise<ReligionTreeNode[]> {
  const { data, error } = await supabase
    .from('religions')
    .select(`
      id,
      name,
      categories:book_categories (
        id,
        name,
        religion_id,
        books:books (
          id,
          name,
          category_id,
          cover_image_url
        )
      )
    `)
    .order('name');

  if (error) throw error;
  return (data as unknown as ReligionTreeNode[]) || [];
}

/**
 * Fetches all media records attached to a specific book ID with full joined metadata
 */
export async function fetchMediaByBookId(bookId: string): Promise<MediaItem[]> {
  const { data, error } = await supabase
    .from('media')
    .select(`
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
    `)
    .eq('book_id', bookId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as unknown as MediaItem[]) || [];
}

