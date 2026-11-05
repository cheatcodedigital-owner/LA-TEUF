// Photos « Ambiances & public », optimisées depuis ressources/photos/AMBIANCES & PUBLIC/ (1600 px max).
// Légendes dans messages (Gallery.alt), dans le même ordre.

export type GalleryPhoto = { src: string; width: number; height: number };

const landscape = (n: string): GalleryPhoto => ({ src: `/images/gallery/ambiance-${n}.jpg`, width: 1536, height: 1024 });

export const galleryPhotos: GalleryPhoto[] = [
  landscape("01"),
  landscape("02"),
  landscape("03"),
  landscape("04"),
  landscape("05"),
  landscape("06"),
  landscape("07"),
  landscape("08"),
  landscape("09"),
  { src: "/images/gallery/ambiance-10.jpg", width: 1024, height: 1536 },
  landscape("11"),
  landscape("12"),
  landscape("13"),
  landscape("14"),
];
