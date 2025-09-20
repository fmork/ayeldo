import CloseIcon from '@mui/icons-material/Close';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import type { SxProps, Theme } from '@mui/material/styles';
import { alpha } from '@mui/material/styles';
import Typography from '@mui/material/Typography';
import CheckBoxOutlineBlankIcon from '@mui/icons-material/CheckBoxOutlineBlank';
import type { FC } from 'react';
import { useState } from 'react';

import type { ImageVariantDto, ImageWithCdnDto } from '../../../services/api/backendApi';

export interface AlbumImageCardProps {
  // Prefer passing the full image object so the component can build a responsive srcSet.
  readonly image?: ImageWithCdnDto;
  // For backward compatibility, allow passing a single imageUrl string.
  readonly imageUrl?: string;
  readonly alt?: string;
  readonly sx?: SxProps<Theme>;
}

export function buildSrcSetFromVariants(variants: readonly ImageVariantDto[] | undefined): string | undefined {
  if (!variants || variants.length === 0) return undefined;
  const parts: string[] = [];
  for (const v of variants) {
    if (v && v.cdnUrl && typeof v.width === 'number') {
      parts.push(`${v.cdnUrl} ${v.width}w`);
    }
  }
  return parts.length > 0 ? parts.join(', ') : undefined;
}

function pickBestVariantUrl(variants: readonly ImageVariantDto[] | undefined, targetWidth = 200): string | undefined {
  if (!variants || variants.length === 0) return undefined;
  // Find smallest variant with width >= targetWidth
  const sorted = [...variants].filter(v => v && typeof v.width === 'number' && v.cdnUrl).sort((a, b) => (a.width - b.width));
  for (const v of sorted) {
    if (v.width >= targetWidth && v.cdnUrl) return v.cdnUrl;
  }
  // Fallback to largest available
  const last = sorted[sorted.length - 1];
  return last?.cdnUrl;
}

function pickLargestVariantUrl(variants: readonly ImageVariantDto[] | undefined): string | undefined {
  if (!variants || variants.length === 0) return undefined;
  const sorted = [...variants].filter(v => v && v.cdnUrl).sort((a, b) => b.width - a.width);
  return sorted[0]?.cdnUrl;
}

const AlbumImageCard: FC<AlbumImageCardProps> = ({ image, imageUrl, alt = '', sx }) => {
  const [open, setOpen] = useState(false);
  // If an image object is provided, try to build a responsive srcSet and pick a default src
  // Prefer a variant URL close to the grid cell size; fallback to the largest available variant then imageUrl
  const src = pickBestVariantUrl(image?.variants) ?? pickLargestVariantUrl(image?.variants) ?? imageUrl ?? '';
  const srcSet = buildSrcSetFromVariants(image?.variants);
  // Provide a reasonable sizes hint: card will typically be ~200px in grid lists; allow the browser to pick
  const sizes = '(max-width: 600px) 50vw, 200px';
  // Debug: log variants if present so we can verify what data the component receives.
  // Debug: unconditionally log the full image object so we can inspect what
  // data the component gets (temporary troubleshooting).
  console.info('AlbumImageCard received image:', image || { imageUrl: imageUrl });
  const headerTitle = (image?.imageId ?? alt ?? '').trim();

  // Choose the XL variant for the overlay. Variant label is expected to be 'xl'.
  const xlVariant = image?.variants?.find((v) => v.label === 'xl') ?? undefined;
  const overlaySrc = xlVariant?.cdnUrl ?? pickLargestVariantUrl(image?.variants) ?? imageUrl ?? '';

  return (
    <>
      <Card onClick={() => setOpen(true)} sx={{ cursor: 'pointer', position: 'relative', overflow: 'hidden' }}>
        <Box sx={{ position: 'relative' }}>
          <CardMedia
            component="img"
            image={src}
            srcSet={srcSet}
            sizes={srcSet ? sizes : undefined}
            alt={alt}
            sx={{
              aspectRatio: '1',
              objectFit: 'cover',
              width: '100%',
              height: '100%',
              ...(sx || {}),
            }}
          />
          {headerTitle.length > 0 ? (
            <Box
              sx={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                px: 1.5,
                py: 1,
                backgroundColor: (theme) => alpha(theme.palette.common.black, 0.55),
                color: 'common.white',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <Typography variant="subtitle2" noWrap>
                {headerTitle}
              </Typography>
            </Box>
          ) : null}
          <Box
            sx={{
              position: 'absolute',
              bottom: 0,
              right: 0,
              display: 'flex',
              flexDirection: 'column',
              gap: 0.25,
              backgroundColor: (theme) => alpha(theme.palette.background.paper, 0.65),
              borderTopLeftRadius: 1,
              px: 0.5,
              py: 0.5,
            }}
          >
            <IconButton
              size="small"
              sx={{ p: 0.25 }}
              onClick={(event) => {
                event.stopPropagation();
              }}
            >
              <CheckBoxOutlineBlankIcon fontSize="small" />
            </IconButton>
          </Box>
        </Box>
      </Card>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        maxWidth="xl"
        PaperProps={{ sx: { position: 'relative', bgcolor: 'background.default' } }}
      >
        <IconButton
          onClick={() => setOpen(false)}
          sx={{ position: 'absolute', right: 8, top: 8, zIndex: 20, color: 'common.white' }}
          aria-label="Close"
        >
          <CloseIcon />
        </IconButton>
        <DialogContent sx={{ p: 0 }}>
          <Box
            component="img"
            src={overlaySrc}
            alt={alt}
            sx={{ width: '100%', height: 'auto', display: 'block', maxHeight: '90vh', objectFit: 'contain' }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AlbumImageCard;
