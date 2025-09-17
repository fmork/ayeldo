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

export interface Gsi3Key {
  readonly GSI3PK: string;
  readonly GSI3SK: string;
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

export function skUser(userId: string): string {
  return `USER#${userId}`;
}

export function gsi1AlbumChild(parentAlbumId: string, albumId: string): Gsi1Key {
  return { GSI1PK: skAlbum(parentAlbumId), GSI1SK: skAlbum(albumId) };
}

export function gsi1ImageByAlbum(albumId: string, imageId: string): Gsi1Key {
  return { GSI1PK: skAlbum(albumId), GSI1SK: skImage(imageId) };
}

export function gsi2UserByOidcSub(oidcSub: string, userId: string): Gsi2Key {
  return { GSI2PK: `OIDC_SUB#${oidcSub}`, GSI2SK: skUser(userId) };
}

export function gsi3UserByEmail(email: string, userId: string): Gsi3Key {
  return { GSI3PK: `EMAIL#${email}`, GSI3SK: skUser(userId) };
}

export const GSI1_NAME = 'GSI1' as const; // Album tree (parent -> child)
export const GSI2_NAME = 'GSI2' as const; // User lookup by OIDC sub
export const GSI3_NAME = 'GSI3' as const; // User lookup by email
