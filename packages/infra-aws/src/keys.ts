export interface Key {
  readonly PK: string;
  readonly SK: string;
}

export interface Gsi1Key {
  readonly GSI1PK: string;
  readonly GSI1SK: string;
}

export function pkTenant(tenantId: string): string {
  return `TENANT#${tenantId}`;
}

export function skAlbum(albumId: string): string {
  return `ALBUM#${albumId}`;
}

export function skImage(imageId: string): string {
  return `IMAGE#${imageId}`;
}

export function skPriceList(priceListId: string): string {
  return `PRICELIST#${priceListId}`;
}

export function skCart(cartId: string): string {
  return `CART#${cartId}`;
}

export function skOrder(orderId: string): string {
  return `ORDER#${orderId}`;
}

export function gsi1AlbumChild(parentAlbumId: string, albumId: string): Gsi1Key {
  return { GSI1PK: skAlbum(parentAlbumId), GSI1SK: skAlbum(albumId) };
}

export function gsi1ImageByAlbum(albumId: string, imageId: string): Gsi1Key {
  return { GSI1PK: skAlbum(albumId), GSI1SK: skImage(imageId) };
}

export const GSI1_NAME = 'GSI1' as const; // Album tree (parent -> child)
