export const lensImageStyle = {
  objectPosition: "center",
} as const;

export const getLensImageUrl = (id: string) => `/lenses/${id}.webp`;
