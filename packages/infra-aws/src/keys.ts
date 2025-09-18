export interface Key {
  readonly PK: string;
  readonly SK: string;
}

export interface Gsi1Key {
  readonly GSI1PK: string;
  readonly GSI1SK: string;
}

export interface Gsi2Key {
  readonly GSI2PK: string;
  readonly GSI2SK: string;
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

export function pkUser(userId: string): string {
  return `USER#${userId}`;
}

export function skUserMetadata(userId: string): string {
  return `METADATA#${userId}`;
}

export function skUserLookup(scope: string): string {
  return `LOOKUP#${scope}`;
}

export function userLookupPartition(scope: string, value: string): string {
  return `LOOKUP#USER#${scope}#${value}`;
}

export function userLookupSort(userId: string): string {
  return `USER#${userId}`;
}

export function skSession(sessionId: string): string {
  return `SESSION#${sessionId}`;
}

export function skState(state: string): string {
  return `STATE#${state}`;
}

export function gsi1AlbumChild(parentAlbumId: string, albumId: string): Gsi1Key {
  return { GSI1PK: skAlbum(parentAlbumId), GSI1SK: skAlbum(albumId) };
}

export function gsi1ImageByAlbum(albumId: string, imageId: string): Gsi1Key {
  return { GSI1PK: skAlbum(albumId), GSI1SK: skImage(imageId) };
}

export function gsi2UserByOidcSub(oidcSub: string, userId: string): Gsi2Key {
  return { GSI2PK: userLookupPartition('OIDC_SUB', oidcSub), GSI2SK: userLookupSort(userId) };
}

export function gsi2UserByEmail(email: string, userId: string): Gsi2Key {
  return { GSI2PK: userLookupPartition('EMAIL', email), GSI2SK: userLookupSort(userId) };
}

export const GSI1_NAME = 'GSI1' as const; // Album tree (parent -> child)
export const GSI2_NAME = 'GSI2' as const; // Shared lookup index (users by identity)
